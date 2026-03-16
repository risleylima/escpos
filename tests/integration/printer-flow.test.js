'use strict';

const { Printer, createProfileRegistry } = require('../../dist');

describe('Printer Integration', () => {
  let printer;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      write: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(Buffer.from([0x14])), // Ready status
      close: jest.fn().mockResolvedValue(true)
    };
    printer = new Printer(mockAdapter);
  });

  describe('Industrial Print Flow', () => {
    it('should perform a full industrial flow (Status -> Print -> QR -> Cut)', async () => {
      // 1. Check status first (Industrial standard)
      const status = await printer.getStatus('PRINTER');
      expect(status[0]).toBe(0x14);

      // 2. Build receipt
      printer
        .hardware('init')
        .align('ct')
        .size(2, 2)
        .textln('CUPOM FISCAL')
        .size(1, 1)
        .qrcode('https://risley.dev/receipt/123', { size: 5, level: 'M' })
        .newLine()
        .align('lt')
        .textln('ITEM 001   R$ 10,00')
        .textln('ITEM 002   R$ 20,00')
        .drawLine('-')
        .style('B')
        .row([
          { text: 'TOTAL', width: 20 },
          { text: 'R$ 30,00', width: 12, align: 'right' }
        ])
        .style('NORMAL')
        .cut(true);

      await printer.flush();

      expect(mockAdapter.write).toHaveBeenCalled();
      const lastWrite = mockAdapter.write.mock.calls[mockAdapter.write.mock.calls.length - 1][0];
      const hex = lastWrite.toString('hex').toLowerCase();
      
      // Verify QR Code Presence (GS ( k)
      expect(hex).toContain('1d286b');
      // Verify Cut Presence (GS V)
      expect(hex).toContain('1d5601');
    });

    it('should handle automatic codepage for Portuguese accents', async () => {
      const profile = {
        id: 'pt-br-printer',
        codepages: { 'cp860': 3 } // Portuguese codepage
      };
      const ptPrinter = new Printer(mockAdapter, { profile, encoding: 'cp860' });
      
      ptPrinter.text('Atenção');
      await ptPrinter.flush();

      const hex = mockAdapter.write.mock.calls[0][0].toString('hex').toLowerCase();
      // Should have sent ESC t 3 (1b7403) before the text
      expect(hex).toContain('1b7403');
    });
  });

  describe('Error Handling and Resiliênce', () => {
    it('should handle adapter timeout during status check', async () => {
      mockAdapter.read.mockRejectedValueOnce(new Error('Timeout'));
      await expect(printer.getStatus()).rejects.toThrow('Timeout');
    });

    it('should not break if flush is called on empty buffer', async () => {
      await printer.flush();
      expect(mockAdapter.write).not.toHaveBeenCalled();
    });

    it('should preserve buffer on flush failure then succeed after recover and retry', async () => {
      mockAdapter.recover = jest.fn().mockResolvedValue(true);
      mockAdapter.write
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      const p = new Printer(mockAdapter, { profile: 'default' });
      p.text('retry-me');
      await expect(p.flush()).rejects.toThrow('offline');
      expect(p.buffer.flush().toString('ascii')).toBe('retry-me');
      await p.recover({ settleMs: 0 });
      p.text('retry-me');
      await p.flush();
      expect(mockAdapter.recover).toHaveBeenCalled();
      expect(mockAdapter.write.mock.calls.length).toBeGreaterThanOrEqual(2);
      const lastCallIndex = mockAdapter.write.mock.calls.length - 1;
      const lastPayload = mockAdapter.write.mock.calls[lastCallIndex][0].toString('ascii');
      expect(lastPayload).toContain('retry-me');
    });
  });

  describe('Close with pending buffer', () => {
    it('should flush pending buffer then call adapter.close', async () => {
      printer.text('pending-close').newLine();
      await printer.close();
      expect(mockAdapter.write).toHaveBeenCalledWith(expect.any(Buffer));
      const payload = mockAdapter.write.mock.calls[0][0].toString('ascii');
      expect(payload).toContain('pending-close');
      expect(mockAdapter.close).toHaveBeenCalled();
    });
  });

  describe('Isolated profileRegistry flow', () => {
    it('should complete full flow using Printer with profileRegistry', async () => {
      const registry = createProfileRegistry([
        { id: 'int-profile', name: 'Integration Profile', defaultPaperWidth: 48 },
      ]);
      const p = new Printer(mockAdapter, {
        profile: 'int-profile',
        profileRegistry: registry,
        width: 48,
      });
      p.hardware('init').align('ct').textln('ISOLATED FLOW').align('lt').cut(true);
      await p.flush();
      expect(mockAdapter.write).toHaveBeenCalled();
      const hex = mockAdapter.write.mock.calls[0][0].toString('hex').toLowerCase();
      expect(hex).toContain('1b40');
      expect(hex).toContain('1d5601');
    });
  });
});

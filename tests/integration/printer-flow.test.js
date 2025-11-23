'use strict';

const Printer = require('../../src/printer');

describe('Printer Integration', () => {
  let printer;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      write: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true)
    };
    printer = new Printer(mockAdapter);
  });

  describe('Complete Print Flow', () => {
    it('should print a complete receipt', async () => {
      printer
        .hardware('init')
        .beep(1, 1)
        .encode(860)
        .size(2, 2)
        .align('ct')
        .textln('TEST RECEIPT')
        .size(1, 1)
        .align('lt')
        .textln('Item 1: R$ 10,00')
        .textln('Item 2: R$ 20,00')
        .align('rt')
        .textln('Total: R$ 30,00')
        .align('lt')
        .drawLine()
        .cut(true);

      await printer.flush();

      expect(mockAdapter.write).toHaveBeenCalled();
      const writtenBuffer = mockAdapter.write.mock.calls[0][0];
      expect(writtenBuffer.length).toBeGreaterThan(0);
    });

    it('should print receipt with barcode', async () => {
      printer
        .hardware('init')
        .align('ct')
        .textln('PRODUCT')
        .barcode('123456789012', 'EAN13', {
          width: 2,
          height: 50,
          position: 'BLW'
        })
        .cut(true);

      await printer.flush();

      expect(mockAdapter.write).toHaveBeenCalled();
    });

    it('should handle multiple prints in sequence', async () => {
      // First print
      printer
        .hardware('init')
        .textln('Print 1')
        .cut(true);
      await printer.flush();

      // Second print
      printer
        .hardware('init')
        .textln('Print 2')
        .cut(true);
      await printer.flush();

      expect(mockAdapter.write).toHaveBeenCalledTimes(2);
    });
  });

  describe('Complex Formatting', () => {
    it('should handle mixed formatting', async () => {
      printer
        .align('ct')
        .size(2, 2)
        .style('B')
        .textln('BOLD TITLE')
        .style('NORMAL')
        .size(1, 1)
        .align('lt')
        .textln('Normal text')
        .style('U')
        .textln('Underlined text')
        .style('NORMAL')
        .cut(true);

      await printer.flush();
      expect(mockAdapter.write).toHaveBeenCalled();
    });

    it('should handle encoding changes', async () => {
      printer
        .encode('UTF-8')
        .textln('UTF-8 Text')
        .encode('GB18030')
        .textln('GB18030 Text')
        .cut(true);

      await printer.flush();
      expect(mockAdapter.write).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle adapter write errors', async () => {
      mockAdapter.write.mockRejectedValueOnce(new Error('Write failed'));

      printer.text('Test');
      await expect(printer.flush()).rejects.toThrow('Write failed');
    });

    it('should handle adapter close errors gracefully', async () => {
      mockAdapter.close.mockRejectedValueOnce(new Error('Close failed'));

      printer.text('Test');
      await expect(printer.close()).rejects.toThrow('Close failed');
    });
  });
});


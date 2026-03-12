'use strict';

const { Printer } = require('../../../dist');

describe('Printer', () => {
  let printer;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      write: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(Buffer.from([0x14])), // Mock status response
      close: jest.fn().mockResolvedValue(true)
    };
    printer = new Printer(mockAdapter);
  });

  describe('Constructor', () => {
    it('should initialize with adapter', () => {
      expect(printer.adapter).toBeDefined();
      expect(printer.buffer).toBeDefined();
    });

    it('should set default encoding', () => {
      expect(printer.encoding).toBe('utf8');
    });

    it('should set default width', () => {
      expect(printer.width).toBe(80);
    });

    it('should throw for unknown profile id', () => {
      expect(() => new Printer(mockAdapter, { profile: 'does-not-exist' })).toThrow('Unknown profile');
    });
  });

  describe('QR Code', () => {
    it('should generate modern QR code commands (GS ( k)', () => {
      printer.qrcode('https://google.com');
      const buffer = printer.buffer.flush();
      const hex = buffer.toString('hex').toLowerCase();
      
      // Should contain GS ( k header: 1d286b
      expect(hex).toContain('1d286b');
      // Should contain select model function: 3141
      expect(hex).toContain('3141');
      // Should contain module size function: 3143
      expect(hex).toContain('3143');
      // Should contain error correction function: 3145
      expect(hex).toContain('3145');
      // Should contain store data function: 3150
      expect(hex).toContain('3150');
      // Should contain print function: 3151
      expect(hex).toContain('3151');
    });

    it('should support custom size and level', () => {
      printer.qrcode('test', { size: 8, level: 'H' });
      const buffer = printer.buffer.flush();
      const hex = buffer.toString('hex').toLowerCase();
      expect(hex).toContain('1d286b');
    });
  });

  describe('Status Monitoring', () => {
    it('should request printer status and return buffer', async () => {
      const status = await printer.getStatus('PRINTER');
      expect(mockAdapter.write).toHaveBeenCalledWith(Buffer.from([0x10, 0x04, 0x01]));
      expect(mockAdapter.read).toHaveBeenCalled();
      expect(status[0]).toBe(0x14);
    });

    it('should request paper status', async () => {
      await printer.getStatus('PAPER');
      expect(mockAdapter.write).toHaveBeenCalledWith(Buffer.from([0x10, 0x04, 0x04]));
    });
  });

  describe('Flush Reliability', () => {
    it('should preserve buffer when adapter write fails', async () => {
      const failingAdapter = {
        write: jest.fn().mockRejectedValue(new Error('offline')),
        read: jest.fn().mockResolvedValue(Buffer.from([0x14])),
        close: jest.fn().mockResolvedValue(true)
      };
      const p = new Printer(failingAdapter);
      p.text('ABC');
      await expect(p.flush()).rejects.toThrow('offline');
      expect(p.buffer.flush().toString('ascii')).toBe('ABC');
    });
  });

  describe('Codepage Automation', () => {
    it('should send ESC t n command when profile has codepage mapping', () => {
      const profile = {
        id: 'test',
        codepages: { 'latin1': 3 }
      };
      const customPrinter = new Printer(mockAdapter, { profile, encoding: 'latin1' });
      customPrinter.text('Olá');
      const buffer = customPrinter.buffer.flush();
      const hex = buffer.toString('hex').toLowerCase();
      // ESC t 3 -> 1b7403
      expect(hex).toContain('1b7403');
    });

    it('should NOT send ESC t n again if codepage has not changed', () => {
      const profile = {
        id: 'test',
        codepages: { 'latin1': 3 }
      };
      const customPrinter = new Printer(mockAdapter, { profile, encoding: 'latin1' });
      customPrinter.text('A');
      customPrinter.buffer.flush(); // clear
      customPrinter.text('B');
      const buffer = customPrinter.buffer.flush();
      const hex = buffer.toString('hex').toLowerCase();
      expect(hex).not.toContain('1b7403');
    });
  });

  describe('Barcode', () => {
    it('should use utils.codeLength for CODE128 (Buffer returning length)', () => {
      printer.barcode('123456', 'CODE128');
      const buffer = printer.buffer.flush();
      // For length 6, buffer should contain byte 0x06 (not string '6')
      // GS k 73 6 ...
      expect(buffer).toContain(0x06);
    });

    it('should accept EAN13 with 13 digits without appending parity', () => {
      const code13 = '1234567890128';
      expect(() => printer.barcode(code13, 'EAN13')).not.toThrow();
      const hex = printer.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain(Buffer.from(code13, 'ascii').toString('hex'));
    });

    it('should use profile barcode builder when provided', () => {
      const profile = {
        id: 'barcode-hook',
        buildBarcode: jest.fn().mockReturnValue(Buffer.from('1b401234', 'hex')),
      };
      const p = new Printer(mockAdapter, { profile });
      p.barcode('1234567890128', 'EAN13');
      const hex = p.buffer.flush().toString('hex').toLowerCase();
      expect(profile.buildBarcode).toHaveBeenCalled();
      expect(hex).toBe('1b401234');
    });

    it('should allow empty buffer from profile barcode builder', () => {
      const profile = {
        id: 'barcode-hook-empty',
        buildBarcode: jest.fn().mockReturnValue(Buffer.alloc(0)),
      };
      const p = new Printer(mockAdapter, { profile });
      p.barcode('1234567890128', 'EAN13');
      const hex = p.buffer.flush().toString('hex').toLowerCase();
      expect(profile.buildBarcode).toHaveBeenCalled();
      expect(hex).toBe('');
    });
  });

  describe('Raw', () => {
    it('should throw on invalid hex string', () => {
      expect(() => printer.raw('zz')).toThrow('raw(data): hex string must have even length and contain only [0-9a-f]');
      expect(() => printer.raw('abc')).toThrow('raw(data): hex string must have even length and contain only [0-9a-f]');
      expect(() => printer.raw('')).toThrow('raw(data): hex string must have even length and contain only [0-9a-f]');
    });
  });

  describe('Additional command parity', () => {
    it('should cancel bottom margin', () => {
      printer.marginBottomCancel();
      const hex = printer.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1b4f');
    });

    it('should set reverse colors using alt command set', () => {
      printer.setReverseColorsAlt(true);
      let hex = printer.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1db1');

      printer.setReverseColorsAlt(false);
      hex = printer.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1db0');
    });

    it('should emit legacy code2d command sequence', () => {
      printer.code2d('ABC123', 'QR', 'M');
      const hex = printer.buffer.flush().toString('hex').toLowerCase();
      // TYPE_QR (1d5a03) + CODE2D (1b5a) + level M (4d) + payload
      expect(hex).toContain('1d5a03');
      expect(hex).toContain('1b5a');
      expect(hex).toContain('4d');
      expect(hex).toContain(Buffer.from('ABC123', 'ascii').toString('hex').toLowerCase());
    });
  });
  
  describe('Legacy Printer Tests (Partial)', () => {
    it('should set center alignment', () => {
      printer.align('ct');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B6101');
    });

    it('should cut paper partially', () => {
      printer.cut(true);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1D5601');
    });

    it('should feed then send FS P for custom-vkp80iii profile cut', () => {
      const customPrinter = new Printer(mockAdapter, { profile: 'custom-vkp80iii' });
      customPrinter.cut(true, 4);
      const hex = customPrinter.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1b6404'); // ESC d 4
      expect(hex).toContain('1c501401450a'); // FS P
      expect(hex).not.toContain('1d5601'); // no GS V, since FS P already cuts
    });

    it('should present ticket with custom FS P params from PrinterOptions', () => {
      const customPrinter = new Printer(mockAdapter, {
        profile: 'custom-vkp80iii',
        ticketPresentation: {
          paramA: 0x10,
          paramB: 0x00,
          paramC: 0x45,
          paramD: 0x05,
        },
      });
      customPrinter.presentTicket({ feed: 2 });
      const hex = customPrinter.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1b6402');
      expect(hex).toContain('1c5010004505');
      expect(hex).not.toContain('1d5601');
    });

    it('should throw when profile ticket presentation validator rejects options', () => {
      const profile = {
        id: 'validator-hook',
        validateTicketPresentationOptions: () => {
          throw new Error('invalid presentation');
        },
        getTicketPresentationCommand: () => Buffer.from('1c5000000000', 'hex'),
      };
      const p = new Printer(mockAdapter, { profile });
      expect(() => p.presentTicket()).toThrow('invalid presentation');
    });
  });
});

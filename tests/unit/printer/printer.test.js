'use strict';

const { Printer } = require('../../../dist');

describe('Printer', () => {
  let printer;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      write: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(Buffer.from([0x14])), // Mock status response
      close: jest.fn().mockResolvedValue(true),
      recover: jest.fn().mockResolvedValue(true),
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

    it('should emit raster QR when strategy is raster', () => {
      printer.qrcode('test-raster', { strategy: 'raster', size: 4, level: 'M' });
      const buffer = printer.buffer.flush();
      const hex = buffer.toString('hex').toLowerCase();
      // GS v 0 m header
      expect(hex).toContain('1d763000');
      // Should not include native GS ( k flow
      expect(hex).not.toContain('1d286b');
    });

    it('should default to raster QR in bematech-mp4200th auto strategy', () => {
      const bematechPrinter = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
      bematechPrinter.qrcode('test-bematech-auto');
      const hex = bematechPrinter.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1d763000');
      expect(hex).not.toContain('1d286b');
    });

    it('should allow forcing native QR in bematech-mp4200th profile', () => {
      const bematechPrinter = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
      bematechPrinter.qrcode('test-bematech-native', { strategy: 'native' });
      const hex = bematechPrinter.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1d286b');
    });

    it('should fallback to raster in auto strategy when profile native QR builder throws', () => {
      const profile = {
        id: 'auto-fallback',
        qrCodeStrategy: 'auto',
        supportsNativeQrCode: true,
        buildQrCode: () => {
          throw new Error('native unsupported');
        },
      };
      const p = new Printer(mockAdapter, { profile });
      p.qrcode('fallback-check');
      const hex = p.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1d763000');
      expect(hex).not.toContain('1d286b');
    });

    it('should use native QR in auto strategy when profile supports native', () => {
      const p = new Printer(mockAdapter, {
        profile: {
          id: 'auto-native',
          qrCodeStrategy: 'auto',
          supportsNativeQrCode: true,
        },
      });
      p.qrcode('auto-native-ok');
      const hex = p.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1d286b');
      expect(hex).not.toContain('1d763000');
    });

    it('should clamp raster QR size lower bound', () => {
      printer.qrcode('qr-min-size', { strategy: 'raster', size: 0, level: 'M' });
      const buffer = printer.buffer.flush();
      // Header (4) + width (2) + height (2) + raster payload
      expect(buffer.slice(0, 4).toString('hex').toLowerCase()).toBe('1d763000');
      const widthBytes = buffer.readUInt16LE(4);
      const height = buffer.readUInt16LE(6);
      expect(widthBytes).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(buffer.length).toBe(8 + widthBytes * height);
    });

    it('should clamp raster QR size upper bound', () => {
      printer.qrcode('qr-max-size', { strategy: 'raster', size: 99, level: 'M' });
      const buffer = printer.buffer.flush();
      expect(buffer.slice(0, 4).toString('hex').toLowerCase()).toBe('1d763000');
      const widthBytes = buffer.readUInt16LE(4);
      const height = buffer.readUInt16LE(6);
      expect(widthBytes).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(buffer.length).toBe(8 + widthBytes * height);
    });

    it('should support centered raster QR placement', () => {
      printer.qrcode('qr-center', { strategy: 'raster', size: 4, level: 'M', position: 'center' });
      const buffer = printer.buffer.flush();
      const hex = buffer.toString('hex').toLowerCase();
      // ESC a 1 (center) should be emitted before GS v 0
      expect(hex).toContain('1b6101');
      expect(hex).toContain('1d763000');
    });

    it('should support right raster QR placement', () => {
      const pRight = new Printer(mockAdapter);
      pRight.qrcode('qr-align', { strategy: 'raster', size: 4, level: 'M', position: 'right' });
      const hex = pRight.buffer.flush().toString('hex').toLowerCase();
      // ESC a 2 (right)
      expect(hex).toContain('1b6102');
      expect(hex).toContain('1d763000');
    });

    it('should apply raster QR offsetCols for calibration', () => {
      const pBase = new Printer(mockAdapter);
      pBase.qrcode('qr-offset', { strategy: 'raster', size: 4, level: 'M', position: 'right' });
      const base = pBase.buffer.flush();

      const pOffset = new Printer(mockAdapter);
      pOffset.qrcode('qr-offset', {
        strategy: 'raster',
        size: 4,
        level: 'M',
        position: 'right',
        offsetCols: 6,
      });
      const shifted = pOffset.buffer.flush();

      const getRasterWidth = (buf) => {
        const sig = Buffer.from('1d763000', 'hex');
        const idx = buf.indexOf(sig);
        if (idx < 0) return 0;
        return buf.readUInt16LE(idx + 4);
      };
      const baseWidth = getRasterWidth(base);
      const shiftedWidth = getRasterWidth(shifted);
      // offsetCols expands raster canvas by additional left padding
      expect(shiftedWidth).toBeGreaterThan(baseWidth);
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

  describe('Recover', () => {
    it('should run transport recover and send generic recover command', async () => {
      const p = new Printer(mockAdapter, { profile: 'default' });
      await p.recover();

      expect(mockAdapter.recover).toHaveBeenCalled();
      const firstWrite = mockAdapter.write.mock.calls[0][0];
      const hex = firstWrite.toString('hex').toLowerCase();
      expect(hex).toContain('1b40'); // ESC @
      expect(hex).toContain('1b6100'); // align left
      expect(hex).toContain('1b32'); // default line spacing
    });

    it('should collect DLE EOT statuses when checkStatus is enabled', async () => {
      mockAdapter.read
        .mockResolvedValueOnce(Buffer.from([0x12])) // printer
        .mockResolvedValueOnce(Buffer.from([0x22])) // offline
        .mockResolvedValueOnce(Buffer.from([0x32])) // error
        .mockResolvedValueOnce(Buffer.from([0x42])); // paper

      const result = await printer.recover({ checkStatus: true, settleMs: 0 });
      expect(result.printer?.[0]).toBe(0x12);
      expect(result.offline?.[0]).toBe(0x22);
      expect(result.error?.[0]).toBe(0x32);
      expect(result.paper?.[0]).toBe(0x42);

      expect(mockAdapter.write).toHaveBeenCalledWith(Buffer.from([0x10, 0x04, 0x01]));
      expect(mockAdapter.write).toHaveBeenCalledWith(Buffer.from([0x10, 0x04, 0x02]));
      expect(mockAdapter.write).toHaveBeenCalledWith(Buffer.from([0x10, 0x04, 0x03]));
      expect(mockAdapter.write).toHaveBeenCalledWith(Buffer.from([0x10, 0x04, 0x04]));
    });

    it('should use bematech profile-specific recover command', async () => {
      const p = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
      await p.recover({ settleMs: 0 });
      const firstWrite = mockAdapter.write.mock.calls[0][0];
      const hex = firstWrite.toString('hex').toLowerCase();
      expect(hex).toContain('1b40'); // ESC @
      expect(hex).toContain('1b4d00'); // font A baseline for MP-4200 TH
    });

    it('should use custom-vkp80iii profile-specific recover command without FS P', async () => {
      const p = new Printer(mockAdapter, { profile: 'custom-vkp80iii' });
      await p.recover({ settleMs: 0 });
      const firstWrite = mockAdapter.write.mock.calls[0][0];
      const hex = firstWrite.toString('hex').toLowerCase();
      expect(hex).toContain('1b40'); // ESC @
      expect(hex).toContain('1b6100'); // align left
      expect(hex).toContain('1b32'); // line spacing default
      expect(hex).toContain('1b4d00'); // font A
      expect(hex).not.toContain('1c50'); // FS P is not part of recover
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

    it('should use profile-specific PDF417 builder for bematech code2d', () => {
      const bematechPrinter = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
      bematechPrinter.code2d('ABC123', 'PDF417');
      const hex = bematechPrinter.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1d286b0300304100'); // fn=65 (columns auto)
      expect(hex).toContain('1d286b0300304200'); // fn=66 (rows auto)
      expect(hex).toContain('1d286b0300304303'); // fn=67 (module width)
      expect(hex).toContain('1d286b0300304403'); // fn=68 (row height)
      expect(hex).toContain('1d286b040030453101'); // fn=69 (EC default)
      expect(hex).toContain('1d286b0300304600'); // fn=70 (options)
      expect(hex).toContain('1d286b0300305130'); // fn=81 (print)
      expect(hex).toContain(Buffer.from('ABC123', 'utf8').toString('hex'));
    });

    it('should throw for bematech code2d QR to prevent unsupported legacy path', () => {
      const bematechPrinter = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
      expect(() => bematechPrinter.code2d('ABC123', 'QR')).toThrow(/use qrcode/i);
    });

    it('should keep legacy DATAMATRIX flow for bematech when no profile override is provided', () => {
      const bematechPrinter = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
      bematechPrinter.code2d('DM123', 'DATAMATRIX');
      const hex = bematechPrinter.buffer.flush().toString('hex').toLowerCase();
      expect(hex).toContain('1d5a01'); // TYPE_DATAMATRIX
      expect(hex).toContain('1b5a'); // CODE2D
      expect(hex).toContain(Buffer.from('DM123', 'ascii').toString('hex').toLowerCase());
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

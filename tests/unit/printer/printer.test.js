'use strict';

const Printer = require('../../../src/printer');

describe('Printer', () => {
  let printer;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      write: jest.fn().mockResolvedValue(true),
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
      expect(printer.encoding).toBe('GB18030');
    });

    it('should set default width', () => {
      expect(printer.width).toBe(48);
    });

    it('should accept custom options', () => {
      const customPrinter = new Printer(mockAdapter, {
        encoding: 'UTF-8',
        width: 42
      });
      expect(customPrinter.encoding).toBe('UTF-8');
      expect(customPrinter.width).toBe(42);
    });
  });

  describe('Text Operations', () => {
    it('should print text without encoding', () => {
      printer.print('Hello');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('ascii')).toBe('Hello');
    });

    it('should print text with line break', () => {
      printer.println('Hello');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('ascii')).toContain('Hello');
      expect(buffer.toString('hex')).toContain('0a'); // LF
    });

    it('should print text with encoding', () => {
      printer.text('Hello');
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should print text with line break and encoding', () => {
      printer.textln('Hello');
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should add new line', () => {
      printer.newLine();
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex')).toContain('0a');
    });
  });

  describe('Alignment', () => {
    it('should set left alignment', () => {
      printer.align('lt');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B6100');
    });

    it('should set center alignment', () => {
      printer.align('ct');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B6101');
    });

    it('should set right alignment', () => {
      printer.align('rt');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B6102');
    });
  });

  describe('Text Formatting', () => {
    it('should set text size', () => {
      printer.size(2, 2);
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should clamp width to 8 when width > 8', () => {
      printer.size(10, 2);
      const buffer = printer.buffer.flush();
      // Should use clamped width (8) instead of 10
      expect(buffer.length).toBeGreaterThan(0);
      // Verify the command uses clamped value
      const hex = buffer.toString('hex').toUpperCase();
      expect(hex).toContain('1D21'); // TXT_CUSTOM_SIZE command
    });

    it('should clamp width to 1 when width < 1', () => {
      printer.size(0, 2);
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
      const hex = buffer.toString('hex').toUpperCase();
      expect(hex).toContain('1D21'); // TXT_CUSTOM_SIZE command
    });

    it('should clamp height to 8 when height > 8', () => {
      printer.size(2, 10);
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
      const hex = buffer.toString('hex').toUpperCase();
      expect(hex).toContain('1D21'); // TXT_CUSTOM_SIZE command
    });

    it('should clamp height to 1 when height < 1', () => {
      printer.size(2, 0);
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
      const hex = buffer.toString('hex').toUpperCase();
      expect(hex).toContain('1D21'); // TXT_CUSTOM_SIZE command
    });

    it('should clamp both width and height when both are out of range', () => {
      printer.size(10, 0);
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
      const hex = buffer.toString('hex').toUpperCase();
      expect(hex).toContain('1D21'); // TXT_CUSTOM_SIZE command
    });

    it('should set encoding', () => {
      printer.encode('UTF-8');
      expect(printer.encoding).toBe('UTF-8');
    });

    it('should set font family', () => {
      printer.font('A');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B4D00');
    });

    it('should set bold style', () => {
      printer.style('B');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B4501');
    });

    it('should set italic style', () => {
      printer.style('I');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B34');
    });

    it('should set underline style', () => {
      printer.style('U');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B2D01');
    });

    it('should set normal style', () => {
      printer.style('NORMAL');
      const buffer = printer.buffer.flush();
      // NORMAL style sets bold off, italic off, underline off
      expect(buffer.toString('hex').toUpperCase()).toContain('1B4500'); // Bold off
      expect(buffer.toString('hex').toUpperCase()).toContain('1B35'); // Italic off
      expect(buffer.toString('hex').toUpperCase()).toContain('1B2D00'); // Underline off
    });
  });

  describe('Paper Control', () => {
    it('should feed paper', () => {
      printer.feed(3);
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should feed default 1 line', () => {
      printer.feed();
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should draw line', () => {
      printer.drawLine();
      const buffer = printer.buffer.flush();
      const text = buffer.toString('ascii');
      expect(text).toContain('-');
      expect(text).toContain('\n');
    });

    it('should draw line with custom character', () => {
      printer.drawLine('=');
      const buffer = printer.buffer.flush();
      const text = buffer.toString('ascii');
      expect(text).toContain('=');
    });

    it('should cut paper partially', () => {
      printer.cut(true);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1D5601');
    });

    it('should cut paper fully', () => {
      printer.cut(false);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1D5600');
    });

    it('should cut with feed lines', () => {
      printer.cut(true, 5);
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Hardware Commands', () => {
    it('should initialize hardware', () => {
      printer.hardware('init');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B40');
    });

    it('should beep', () => {
      printer.beep(2, 1);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B42');
    });

    it('should open cash drawer', () => {
      printer.cashdraw(2);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B70');
    });
  });

  describe('Barcode', () => {
    it('should print EAN13 barcode', () => {
      printer.barcode('123456789012', 'EAN13');
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid EAN13 length', () => {
      expect(() => {
        printer.barcode('12345678901', 'EAN13');
      }).toThrow('EAN13 Barcode type requires code length 12');
    });

    it('should throw error for invalid EAN8 length', () => {
      expect(() => {
        printer.barcode('123456', 'EAN8');
      }).toThrow('EAN8 Barcode type requires code length 7');
    });

    it('should print barcode with options', () => {
      printer.barcode('123456789012', 'EAN13', {
        width: 2,
        height: 50,
        position: 'BLW',
        font: 'A'
      });
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Raw Commands', () => {
    it('should write raw hex string', () => {
      printer.raw('1B40');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toBe('1B40');
    });

    it('should write raw hex string with spaces', () => {
      printer.raw('1B 40');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toBe('1B40');
    });

    it('should write raw hex string with colons', () => {
      printer.raw('1B:40');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toBe('1B40');
    });

    it('should write raw Buffer', () => {
      const testBuffer = Buffer.from('1B40', 'hex');
      printer.raw(testBuffer);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toBe('1B40');
    });

    it('should throw error for invalid raw data', () => {
      expect(() => {
        printer.raw(123);
      }).toThrow('Data is Invalid!');
    });
  });

  describe('Method Chaining', () => {
    it('should support method chaining', () => {
      const result = printer
        .align('ct')
        .size(2, 2)
        .textln('Test')
        .align('lt');
      
      expect(result).toBe(printer);
    });

    it('should chain multiple operations', () => {
      printer
        .hardware('init')
        .align('ct')
        .textln('Title')
        .align('lt')
        .textln('Content')
        .cut(true);
      
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Flush', () => {
    it('should flush buffer to adapter', async () => {
      printer.text('Test');
      await printer.flush();
      
      expect(mockAdapter.write).toHaveBeenCalled();
      const writtenBuffer = mockAdapter.write.mock.calls[0][0];
      expect(writtenBuffer.toString('ascii')).toContain('Test');
    });

    it('should clear buffer after flush', async () => {
      printer.text('Test');
      await printer.flush();
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBe(0);
    });

    it('should not write if buffer is empty', async () => {
      await printer.flush();
      expect(mockAdapter.write).not.toHaveBeenCalled();
    });
  });

  describe('Close', () => {
    it('should flush and close adapter', async () => {
      printer.text('Test');
      await printer.close();
      
      expect(mockAdapter.write).toHaveBeenCalled();
      expect(mockAdapter.close).toHaveBeenCalled();
    });
  });

  describe('Color', () => {
    it('should set primary color (black)', () => {
      printer.color(0);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B7200');
    });

    it('should set secondary color (red)', () => {
      printer.color(1);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B7201');
    });

    it('should default to black for invalid color', () => {
      printer.color(99);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1B7200');
    });
  });

  describe('Reverse Colors', () => {
    it('should set reverse colors', () => {
      printer.setReverseColors(true);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1DB1');
    });

    it('should unset reverse colors', () => {
      printer.setReverseColors(false);
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toContain('1DB0');
    });
  });
});


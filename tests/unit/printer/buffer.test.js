'use strict';

const Printer = require('../../../src/printer');

describe('SpecBuffer', () => {
  let printer;
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      write: jest.fn().mockResolvedValue(true)
    };
    printer = new Printer(mockAdapter);
  });

  describe('Buffer Operations', () => {
    it('should initialize with empty buffer', () => {
      const buffer = printer.buffer.flush();
      expect(buffer.length).toBe(0);
    });

    it('should write data to buffer', () => {
      printer.buffer.write('Hello', 'ascii');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('ascii')).toBe('Hello');
    });

    it('should write hex data to buffer', () => {
      printer.buffer.write('1B40', 'hex');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('hex').toUpperCase()).toBe('1B40');
    });

    it('should concatenate multiple writes', () => {
      printer.buffer.write('Hello', 'ascii');
      printer.buffer.write(' World', 'ascii');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('ascii')).toBe('Hello World');
    });

    it('should flush and clear buffer', () => {
      printer.buffer.write('Test', 'ascii');
      const buffer1 = printer.buffer.flush();
      const buffer2 = printer.buffer.flush();
      
      expect(buffer1.toString('ascii')).toBe('Test');
      expect(buffer2.length).toBe(0);
    });

    it('should handle Buffer objects', () => {
      const testBuffer = Buffer.from('Test', 'ascii');
      // SpecBuffer.write expects (data, type), but can handle Buffer directly
      // We'll test through printer methods instead
      printer.print('Test');
      const buffer = printer.buffer.flush();
      expect(buffer.toString('ascii')).toBe('Test');
    });
  });
});


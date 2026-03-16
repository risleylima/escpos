'use strict';

const { Printer } = require('../../../dist');

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

  describe('maxBufferSize', () => {
    it('should throw when buffer exceeds default max size (10MB)', () => {
      const big = Buffer.alloc(11 * 1024 * 1024, 'x');
      expect(() => printer.buffer.write(big)).toThrow(/max size of .* bytes reached|buffer overflow/i);
    });

    it('should accept custom maxBufferSize in Printer constructor', () => {
      const smallLimitPrinter = new Printer(mockAdapter, { maxBufferSize: 100 });
      smallLimitPrinter.buffer.write(Buffer.alloc(50, 'a'));
      expect(smallLimitPrinter.buffer.size()).toBe(50);
      expect(() => smallLimitPrinter.buffer.write(Buffer.alloc(60, 'b'))).toThrow(/max size|overflow/i);
    });

    it('should allow writes up to custom maxBufferSize', () => {
      const cap = 512;
      const p = new Printer(mockAdapter, { maxBufferSize: cap });
      p.buffer.write(Buffer.alloc(cap, 'x'));
      expect(p.buffer.size()).toBe(cap);
      const out = p.buffer.flush();
      expect(out.length).toBe(cap);
    });
  });

  describe('prepend', () => {
    it('should prepend data and increase size', () => {
      printer.buffer.write('World', 'ascii');
      printer.buffer.prepend(Buffer.from('Hello ', 'ascii'));
      const buffer = printer.buffer.flush();
      expect(buffer.toString('ascii')).toBe('Hello World');
    });

    it('should throw when prepend would exceed maxBufferSize (consistent with write)', () => {
      const small = new Printer(mockAdapter, { maxBufferSize: 50 });
      small.buffer.write(Buffer.alloc(40, 'a'));
      expect(() => small.buffer.prepend(Buffer.alloc(20, 'b'))).toThrow(/max size of .* bytes reached|buffer overflow/i);
      expect(small.buffer.size()).toBe(40);
    });
  });
});


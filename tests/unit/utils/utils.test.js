'use strict';

const utils = require('../../../dist/printer/utils');

describe('Utils', () => {
  describe('getParityBit', () => {
    it('should calculate parity bit for EAN13', () => {
      const code = '123456789012';
      const parity = utils.getParityBit(code);
      expect(parity).toMatch(/^\d$/);
      expect(parseInt(parity)).toBeGreaterThanOrEqual(0);
      expect(parseInt(parity)).toBeLessThanOrEqual(9);
    });

    it('should calculate parity bit for EAN8', () => {
      const code = '1234567';
      const parity = utils.getParityBit(code);
      expect(parity).toMatch(/^\d$/);
    });
  });

  describe('codeLength', () => {
    it('should return length as Buffer (1 byte)', () => {
      const result = utils.codeLength('12345');
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(5);
    });

    it('should handle empty string', () => {
      const result = utils.codeLength('');
      expect(result[0]).toBe(0);
    });

    it('should handle different string lengths', () => {
      expect(utils.codeLength('A')[0]).toBe(1);
      expect(utils.codeLength('ABC')[0]).toBe(3);
    });

    it('should throw when string length > 255', () => {
      const longStr = 'x'.repeat(256);
      expect(() => utils.codeLength(longStr)).toThrow('codeLength: string length must be <= 255');
    });
  });

  describe('textLength', () => {
    it('should count ASCII characters as 1', () => {
      expect(utils.textLength('Hello')).toBe(5);
    });

    it('should count multi-byte characters as 2', () => {
      const chinese = '你好';
      expect(utils.textLength(chinese)).toBe(4); // 2 chars * 2
    });
  });

  describe('textSubstring', () => {
    it('should return substring by column range (ASCII)', () => {
      expect(utils.textSubstring('Hello', 0, 3)).toBe('Hel');
      expect(utils.textSubstring('Hello', 1, 4)).toBe('ell');
      expect(utils.textSubstring('Hello', 0, 5)).toBe('Hello');
    });

    it('should handle multi-byte characters as 2 columns', () => {
      const s = 'A你B';
      expect(utils.textSubstring(s, 0, 2)).toBe('A');
      // Columns 2-4: 你 (cols 1-2) + B (col 3)
      expect(utils.textSubstring(s, 2, 4)).toBe('你B');
      // Column 3 only: B (implementation uses accLen+len > start, so (3,4) yields B)
      expect(utils.textSubstring(s, 3, 4)).toBe('B');
      expect(utils.textSubstring(s, 0, 5)).toBe('A你B');
    });

    it('should support end omitted (to end of string)', () => {
      expect(utils.textSubstring('Hello', 2)).toBe('llo');
      expect(utils.textSubstring('Hi', 0)).toBe('Hi');
    });

    it('should return empty when start >= length', () => {
      expect(utils.textSubstring('Hi', 5)).toBe('');
      expect(utils.textSubstring('你', 2)).toBe('');
    });
  });
});

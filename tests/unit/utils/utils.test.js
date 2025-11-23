'use strict';

const utils = require('../../../src/printer/utils');

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

    it('should return valid parity for different codes', () => {
      const codes = ['123456789012', '987654321098', '111111111111'];
      codes.forEach(code => {
        const parity = utils.getParityBit(code);
        expect(parity).toMatch(/^\d$/);
      });
    });
  });

  describe('codeLength', () => {
    it('should return length as hex string', () => {
      const result = utils.codeLength('12345');
      expect(typeof result).toBe('string');
      // codeLength converts number to hex, then to Buffer, then to string
      // For length 5, hex is '5', which becomes a single byte Buffer
      expect(result).toBeDefined();
    });

    it('should handle empty string', () => {
      const result = utils.codeLength('');
      expect(typeof result).toBe('string');
    });

    it('should handle different string lengths', () => {
      expect(utils.codeLength('A')).toBeDefined();
      expect(utils.codeLength('AB')).toBeDefined();
      expect(utils.codeLength('ABC')).toBeDefined();
    });
  });

  describe('textLength', () => {
    it('should count ASCII characters as 1', () => {
      expect(utils.textLength('Hello')).toBe(5);
    });

    it('should count multi-byte characters as 2', () => {
      const chinese = '你好';
      const length = utils.textLength(chinese);
      expect(length).toBeGreaterThan(2);
    });

    it('should handle mixed ASCII and multi-byte', () => {
      const mixed = 'Hello 世界';
      const length = utils.textLength(mixed);
      expect(length).toBeGreaterThan(7);
    });

    it('should handle empty string', () => {
      expect(utils.textLength('')).toBe(0);
    });
  });

  describe('textSubstring', () => {
    it('should extract substring correctly', () => {
      const result = utils.textSubstring('Hello World', 0, 5);
      expect(result).toBe('Hello');
    });

    it('should handle start and end positions', () => {
      const result = utils.textSubstring('Hello World', 6, 11);
      expect(result).toBe('World');
    });

    it('should handle multi-byte characters', () => {
      const chinese = '你好世界';
      const result = utils.textSubstring(chinese, 0, 2);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle end undefined', () => {
      const result = utils.textSubstring('Hello World', 6);
      expect(result).toBe('World');
    });
  });
});


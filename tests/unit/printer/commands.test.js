'use strict';

const { commands } = require('../../../dist/printer/commands');

describe('Commands', () => {
  describe('numToHexString', () => {
    it('should convert number to hex string', () => {
      const result = commands.numToHexString(255);
      expect(result).toBe('ff');
    });

    it('should pad odd-length hex strings with leading zero', () => {
      const result = commands.numToHexString(15);
      expect(result).toBe('0f');
    });

    it('should handle zero', () => {
      const result = commands.numToHexString(0);
      expect(result).toBe('00');
    });

    it('should handle large numbers', () => {
      const result = commands.numToHexString(256);
      expect(result).toBe('0100');
    });

    it('should return empty string for NaN input', () => {
      const result = commands.numToHexString('invalid');
      expect(result).toBe('');
    });

    it('should return empty string for NaN value', () => {
      const result = commands.numToHexString(NaN);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = commands.numToHexString(undefined);
      expect(result).toBe('');
    });
  });

  describe('TXT_CUSTOM_SIZE', () => {
    it('should clamp width to 8 when width > 8', () => {
      const result = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(10, 2);
      // When width is clamped to 8, the calculation is:
      // widthDec = (8 - 1) * 16 = 112 (0x70)
      // heightDec = (2 - 1) = 1 (0x01)
      // sizeDec = 112 + 1 = 113 (0x71)
      expect(result.toString('hex').toUpperCase()).toContain('1D2171');
    });

    it('should clamp width to 1 when width < 1', () => {
      const result = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(0, 2);
      // When width is clamped to 1, the calculation is:
      // widthDec = (1 - 1) * 16 = 0 (0x00)
      // heightDec = (2 - 1) = 1 (0x01)
      // sizeDec = 0 + 1 = 1 (0x01)
      expect(result.toString('hex').toUpperCase()).toContain('1D2101');
    });

    it('should clamp height to 8 when height > 8', () => {
      const result = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(2, 10);
      // When height is clamped to 8, the calculation is:
      // widthDec = (2 - 1) * 16 = 16 (0x10)
      // heightDec = (8 - 1) = 7 (0x07)
      // sizeDec = 16 + 7 = 23 (0x17)
      expect(result.toString('hex').toUpperCase()).toContain('1D2117');
    });

    it('should clamp height to 1 when height < 1', () => {
      const result = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(2, 0);
      // When height is clamped to 1, the calculation is:
      // widthDec = (2 - 1) * 16 = 16 (0x10)
      // heightDec = (1 - 1) = 0 (0x00)
      // sizeDec = 16 + 0 = 16 (0x10)
      expect(result.toString('hex').toUpperCase()).toContain('1D2110');
    });

    it('should clamp both width and height when both are out of range', () => {
      const result = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(10, 0);
      // When both are clamped: width=8, height=1
      // widthDec = (8 - 1) * 16 = 112 (0x70)
      // heightDec = (1 - 1) = 0 (0x00)
      // sizeDec = 112 + 0 = 112 (0x70)
      expect(result.toString('hex').toUpperCase()).toContain('1D2170');
    });

    it('should handle valid range values correctly', () => {
      const result = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(4, 3);
      // widthDec = (4 - 1) * 16 = 48 (0x30)
      // heightDec = (3 - 1) = 2 (0x02)
      // sizeDec = 48 + 2 = 50 (0x32)
      expect(result.toString('hex').toUpperCase()).toContain('1D2132');
    });

    it('should handle boundary values (1 and 8)', () => {
      const result1 = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(1, 1);
      expect(result1.toString('hex').toUpperCase()).toContain('1D2100');

      const result2 = commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(8, 8);
      // widthDec = (8 - 1) * 16 = 112 (0x70)
      // heightDec = (8 - 1) = 7 (0x07)
      // sizeDec = 112 + 7 = 119 (0x77)
      expect(result2.toString('hex').toUpperCase()).toContain('1D2177');
    });
  });
});


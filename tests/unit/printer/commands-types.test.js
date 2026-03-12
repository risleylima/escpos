'use strict';

const {
  getFeedControlKey,
  getAlignKey,
  getFontKey,
  getHardwareKey,
  getBitmapDensityKey,
  getGsv0ModeKey,
  getCashDrawerKey,
  FEED_CONTROL_KEYS,
  ALIGN_KEYS,
  FONT_KEYS,
  HARDWARE_KEYS,
  BITMAP_DENSITY_KEYS,
  GSV0_MODE_KEYS,
  CASH_DRAWER_KEYS,
} = require('../../../dist/printer/commands-types');

describe('commands-types (strong typing getters)', () => {
  describe('getFeedControlKey', () => {
    it('should return valid key for LF, GLF, FF, CR, HT, VT', () => {
      expect(getFeedControlKey('lf')).toBe('CTL_LF');
      expect(getFeedControlKey('LF')).toBe('CTL_LF');
      expect(getFeedControlKey('glf')).toBe('CTL_GLF');
      expect(getFeedControlKey('ff')).toBe('CTL_FF');
      expect(getFeedControlKey('cr')).toBe('CTL_CR');
      expect(getFeedControlKey('ht')).toBe('CTL_HT');
      expect(getFeedControlKey('vt')).toBe('CTL_VT');
    });
    it('should return undefined for invalid control', () => {
      expect(getFeedControlKey('invalid')).toBeUndefined();
      expect(getFeedControlKey('LF2')).toBeUndefined();
    });
  });

  describe('getAlignKey', () => {
    it('should return valid key for lt, ct, rt', () => {
      expect(getAlignKey('lt')).toBe('TXT_ALIGN_LT');
      expect(getAlignKey('ct')).toBe('TXT_ALIGN_CT');
      expect(getAlignKey('rt')).toBe('TXT_ALIGN_RT');
    });
    it('should return undefined for invalid align', () => {
      expect(getAlignKey('center')).toBeUndefined();
      expect(getAlignKey('xx')).toBeUndefined();
    });
  });

  describe('getFontKey', () => {
    it('should return valid key for A, B, C', () => {
      expect(getFontKey('a')).toBe('TXT_FONT_A');
      expect(getFontKey('B')).toBe('TXT_FONT_B');
      expect(getFontKey('c')).toBe('TXT_FONT_C');
    });
    it('should return undefined for invalid font', () => {
      expect(getFontKey('D')).toBeUndefined();
      expect(getFontKey('font')).toBeUndefined();
    });
  });

  describe('getHardwareKey', () => {
    it('should return valid key for init, select, reset', () => {
      expect(getHardwareKey('init')).toBe('HW_INIT');
      expect(getHardwareKey('SELECT')).toBe('HW_SELECT');
      expect(getHardwareKey('reset')).toBe('HW_RESET');
    });
    it('should return undefined for invalid hardware', () => {
      expect(getHardwareKey('open')).toBeUndefined();
    });
  });

  describe('getBitmapDensityKey', () => {
    it('should return valid key for s8, d8, s24, d24', () => {
      expect(getBitmapDensityKey('s8')).toBe('BITMAP_S8');
      expect(getBitmapDensityKey('D8')).toBe('BITMAP_D8');
      expect(getBitmapDensityKey('s24')).toBe('BITMAP_S24');
      expect(getBitmapDensityKey('d24')).toBe('BITMAP_D24');
    });
    it('should return undefined for invalid density', () => {
      expect(getBitmapDensityKey('s16')).toBeUndefined();
    });
  });

  describe('getGsv0ModeKey', () => {
    it('should return valid key for normal, dw, dh, dwdh', () => {
      expect(getGsv0ModeKey('normal')).toBe('GSV0_NORMAL');
      expect(getGsv0ModeKey('DW')).toBe('GSV0_DW');
      expect(getGsv0ModeKey('dh')).toBe('GSV0_DH');
      expect(getGsv0ModeKey('dwdh')).toBe('GSV0_DWDH');
    });
    it('should return undefined for invalid mode', () => {
      expect(getGsv0ModeKey('full')).toBeUndefined();
    });
  });

  describe('getCashDrawerKey', () => {
    it('should return CD_KICK_2 for pin 2', () => {
      expect(getCashDrawerKey(2)).toBe('CD_KICK_2');
    });
    it('should return CD_KICK_5 for pin 5', () => {
      expect(getCashDrawerKey(5)).toBe('CD_KICK_5');
    });
  });

  describe('key arrays', () => {
    it('should export const key arrays', () => {
      expect(FEED_CONTROL_KEYS).toContain('CTL_LF');
      expect(ALIGN_KEYS).toContain('TXT_ALIGN_CT');
      expect(FONT_KEYS).toContain('TXT_FONT_A');
      expect(HARDWARE_KEYS).toContain('HW_INIT');
      expect(BITMAP_DENSITY_KEYS).toContain('BITMAP_D24');
      expect(GSV0_MODE_KEYS).toContain('GSV0_NORMAL');
      expect(CASH_DRAWER_KEYS).toContain('CD_KICK_2');
    });
  });
});

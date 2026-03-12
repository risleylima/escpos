/**
 * Converts a number to a zero-padded hex string (even length).
 */
export function numToHexString(value: number | string): string {
  const num = Number(value);
  let retorno = '';
  if (!Number.isNaN(num)) {
    retorno = num.toString(16);
    while (retorno.length % 2 !== 0) {
      retorno = '0' + retorno;
    }
  }
  return retorno;
}

export const commands = {
  LF: Buffer.from('0A', 'hex'),
  FS: Buffer.from('1C', 'hex'),
  FF: Buffer.from('0C', 'hex'),
  GS: Buffer.from('1D', 'hex'),
  DLE: Buffer.from('10', 'hex'),
  EOT: Buffer.from('04', 'hex'),
  NUL: Buffer.from('00', 'hex'),
  ESC: Buffer.from('1B', 'hex'),
  TAB: Buffer.from('74', 'hex'),
  EOL: Buffer.from('\n', 'ascii'),

  FEED_CONTROL_SEQUENCES: {
    CTL_LF: Buffer.from('0A', 'hex'),
    CTL_GLF: Buffer.from('4A00', 'hex'),
    CTL_FF: Buffer.from('0C', 'hex'),
    CTL_CR: Buffer.from('0D', 'hex'),
    CTL_HT: Buffer.from('09', 'hex'),
    CTL_VT: Buffer.from('0B', 'hex'),
  },
  CHARACTER_SPACING: {
    CS_DEFAULT: Buffer.from('1B2000', 'hex'),
    CS_SET: Buffer.from('1B20', 'hex'),
  },
  LINE_SPACING: {
    LS_DEFAULT: Buffer.from('1B32', 'hex'),
    LS_SET: Buffer.from('1B33', 'hex'),
  },
  FEED_LINES: Buffer.from('1B64', 'hex'),
  HARDWARE: {
    HW_INIT: Buffer.from('1B40', 'hex'),
    HW_SELECT: Buffer.from('1B3D01', 'hex'),
    HW_RESET: Buffer.from('1B3F0A00', 'hex'),
  },
  CASH_DRAWER: {
    CD_KICK_2: Buffer.from('1B700019FA', 'hex'),
    CD_KICK_5: Buffer.from('1B700119FA', 'hex'),
  },
  MARGINS: {
    BOTTOM: Buffer.from('1B4E', 'hex'),
    LEFT: Buffer.from('1B6C', 'hex'),
    RIGHT: Buffer.from('1B51', 'hex'),
  },
  MARGIN_BOTTOM_CANCEL: Buffer.from('1B4F', 'hex'),
  PAPER: {
    PAPER_FULL_CUT: Buffer.from('1D5600', 'hex'),
    PAPER_PART_CUT: Buffer.from('1D5601', 'hex'),
    PAPER_CUT_A: Buffer.from('1D5641', 'hex'),
    PAPER_CUT_B: Buffer.from('1D5642', 'hex'),
  },
  TEXT_FORMAT: {
    TXT_NORMAL: Buffer.from('1B2100', 'hex'),
    TXT_2HEIGHT: Buffer.from('1B2110', 'hex'),
    TXT_2WIDTH: Buffer.from('1B2120', 'hex'),
    TXT_4SQUARE: Buffer.from('1B2130', 'hex'),
    TXT_BOLDER: Buffer.from('1B2108', 'hex'),
    TXT_CUSTOM_SIZE(width: number, height: number): Buffer {
      const w = Math.min(8, Math.max(1, width));
      const h = Math.min(8, Math.max(1, height));
      const sizeDec = (w - 1) * 16 + (h - 1);
      return Buffer.from('1D21' + numToHexString(sizeDec), 'hex');
    },
    TXT_HEIGHT: {
      1: Buffer.from('00', 'hex'),
      2: Buffer.from('01', 'hex'),
      3: Buffer.from('02', 'hex'),
      4: Buffer.from('03', 'hex'),
      5: Buffer.from('04', 'hex'),
      6: Buffer.from('05', 'hex'),
      7: Buffer.from('06', 'hex'),
      8: Buffer.from('07', 'hex'),
    },
    TXT_WIDTH: {
      1: Buffer.from('00', 'hex'),
      2: Buffer.from('10', 'hex'),
      3: Buffer.from('20', 'hex'),
      4: Buffer.from('30', 'hex'),
      5: Buffer.from('40', 'hex'),
      6: Buffer.from('50', 'hex'),
      7: Buffer.from('60', 'hex'),
      8: Buffer.from('70', 'hex'),
    },
    TXT_UNDERL_OFF: Buffer.from('1B2D00', 'hex'),
    TXT_UNDERL_ON: Buffer.from('1B2D01', 'hex'),
    TXT_UNDERL2_ON: Buffer.from('1B2D02', 'hex'),
    TXT_BOLD_OFF: Buffer.from('1B4500', 'hex'),
    TXT_BOLD_ON: Buffer.from('1B4501', 'hex'),
    TXT_ITALIC_OFF: Buffer.from('1B35', 'hex'),
    TXT_ITALIC_ON: Buffer.from('1B34', 'hex'),
    TXT_FONT_A: Buffer.from('1B4D00', 'hex'),
    TXT_FONT_B: Buffer.from('1B4D01', 'hex'),
    TXT_FONT_C: Buffer.from('1B4D02', 'hex'),
    TXT_ALIGN_LT: Buffer.from('1B6100', 'hex'),
    TXT_ALIGN_CT: Buffer.from('1B6101', 'hex'),
    TXT_ALIGN_RT: Buffer.from('1B6102', 'hex'),
  },
  BARCODE_FORMAT: {
    BARCODE_TXT_OFF: Buffer.from('1D4800', 'hex'),
    BARCODE_TXT_ABV: Buffer.from('1D4801', 'hex'),
    BARCODE_TXT_BLW: Buffer.from('1D4802', 'hex'),
    BARCODE_TXT_BTH: Buffer.from('1D4803', 'hex'),
    BARCODE_FONT_A: Buffer.from('1D6600', 'hex'),
    BARCODE_FONT_B: Buffer.from('1D6601', 'hex'),
    BARCODE_HEIGHT(height: number): Buffer {
      return Buffer.from('1D68' + numToHexString(height), 'hex');
    },
    BARCODE_WIDTH: {
      1: Buffer.from('1D7702', 'hex'),
      2: Buffer.from('1D7703', 'hex'),
      3: Buffer.from('1D7704', 'hex'),
      4: Buffer.from('1D7705', 'hex'),
      5: Buffer.from('1D7706', 'hex'),
    },
    BARCODE_HEIGHT_DEFAULT: Buffer.from('1D6864', 'hex'),
    BARCODE_WIDTH_DEFAULT: Buffer.from('1D7701', 'hex'),
    BARCODE_UPC_A: Buffer.from('1D6B00', 'hex'),
    BARCODE_UPC_E: Buffer.from('1D6B01', 'hex'),
    BARCODE_EAN13: Buffer.from('1D6B02', 'hex'),
    BARCODE_EAN8: Buffer.from('1D6B03', 'hex'),
    BARCODE_CODE39: Buffer.from('1D6B04', 'hex'),
    BARCODE_ITF: Buffer.from('1D6B05', 'hex'),
    BARCODE_NW7: Buffer.from('1D6B06', 'hex'),
    BARCODE_CODE93: Buffer.from('1D6B48', 'hex'),
    BARCODE_CODE128: Buffer.from('1D6B49', 'hex'),
  },
  CODE2D_FORMAT: {
    TYPE_PDF417: Buffer.concat([Buffer.from('1D', 'hex'), Buffer.from('Z', 'ascii'), Buffer.from('00', 'hex')]),
    TYPE_DATAMATRIX: Buffer.concat([Buffer.from('1D', 'hex'), Buffer.from('Z', 'ascii'), Buffer.from('01', 'hex')]),
    TYPE_QR: Buffer.concat([Buffer.from('1D', 'hex'), Buffer.from('Z', 'ascii'), Buffer.from('03', 'hex')]),
    CODE2D: Buffer.concat([Buffer.from('1B', 'hex'), Buffer.from('Z', 'ascii')]),
    QR_LEVEL_L: Buffer.from('L', 'ascii'),
    QR_LEVEL_M: Buffer.from('M', 'ascii'),
    QR_LEVEL_Q: Buffer.from('Q', 'ascii'),
    QR_LEVEL_H: Buffer.from('H', 'ascii'),
    /** Standard GS ( k pattern for QR Code */
    GS_H: Buffer.from('1D286B', 'hex'),
  },
  STATUS: {
    /** Real-time status transmission (DLE EOT n) */
    DLE_EOT: (n: number): Buffer => Buffer.from([0x10, 0x04, n]),
    PRINTER: 1,
    OFFLINE: 2,
    ERROR: 3,
    PAPER: 4,
  },
  IMAGE_FORMAT: {
    S_RASTER_N: Buffer.from('1D763000', 'hex'),
    S_RASTER_2W: Buffer.from('1D763001', 'hex'),
    S_RASTER_2H: Buffer.from('1D763002', 'hex'),
    S_RASTER_Q: Buffer.from('1D763003', 'hex'),
  },
  BITMAP_FORMAT: {
    BITMAP_S8: Buffer.from('1B2A00', 'hex'),
    BITMAP_D8: Buffer.from('1B2A01', 'hex'),
    BITMAP_S24: Buffer.from('1B2A20', 'hex'),
    BITMAP_D24: Buffer.from('1B2A21', 'hex'),
  },
  GSV0_FORMAT: {
    GSV0_NORMAL: Buffer.from('1D763000', 'hex'),
    GSV0_DW: Buffer.from('1D763001', 'hex'),
    GSV0_DH: Buffer.from('1D763002', 'hex'),
    GSV0_DWDH: Buffer.from('1D763003', 'hex'),
  },
  BEEP: Buffer.from('1B42', 'hex'),
  COLOR: {
    0: Buffer.from('1B7200', 'hex'),
    1: Buffer.from('1B7201', 'hex'),
    REVERSE: Buffer.from('1D4201', 'hex'),
    UNREVERSE: Buffer.from('1D4200', 'hex'),
    REVERSE_ALT: Buffer.from('1DB1', 'hex'),
    UNREVERSE_ALT: Buffer.from('1DB0', 'hex'),
  } as Record<number, Buffer> & { REVERSE: Buffer; UNREVERSE: Buffer; REVERSE_ALT: Buffer; UNREVERSE_ALT: Buffer },
  numToHexString,
};

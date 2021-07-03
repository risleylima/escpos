'use strict';
/**
 * Utility function that converts numbers into hex values
 *
 * @usage:
 *   numToHex(256) => '0100'
 *   numToHex(0) => '00'
 */
const numToHexString = (value) => {
  let num = Number(value);
  let retorno = ''
  if (!isNaN(num)) {
    retorno = num.toString(16);
    while (retorno.length % 2 !== 0) {
      retorno = '0' + retorno;
    }
  }
  return retorno;
};

const commands = {
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
    CTL_LF: Buffer.from('0A', 'hex'),     // Print and line feed
    CTL_GLF: Buffer.from('4A00', 'hex'),  // Print and grafical line feed (without spaces between lines)
    CTL_FF: Buffer.from('0C', 'hex'),     // Form feed
    CTL_CR: Buffer.from('0D', 'hex'),     // Carriage return
    CTL_HT: Buffer.from('09', 'hex'),     // Horizontal tab
    CTL_VT: Buffer.from('0B', 'hex'),     // Vertical tab
  },
  CHARACTER_SPACING: {
    CS_DEFAULT: Buffer.from('1B2000', 'hex'),
    CS_SET: Buffer.from('1B20', 'hex')
  },
  LINE_SPACING: {
    LS_DEFAULT: Buffer.from('1B32', 'hex'),
    LS_SET: Buffer.from('1B33', 'hex')
  },
  HARDWARE: {
    HW_INIT: Buffer.from('1B40', 'hex'), // Clear data in buffer and reset modes
    HW_SELECT: Buffer.from('1B3D01', 'hex'), // Printer select
    HW_RESET: Buffer.from('1B3F0A00', 'hex'), // Reset printer hardware
  },
  CASH_DRAWER: {
    CD_KICK_2: Buffer.from('1B700019FA', 'hex'), // Sends a pulse to pin 2 []
    CD_KICK_5: Buffer.from('1B700119FA', 'hex'), // Sends a pulse to pin 5 []
  },
  MARGINS: {
    BOTTOM: Buffer.from('1B4F', 'hex'), // Fix bottom size
    LEFT: Buffer.from('1B6C', 'hex'), // Fix left size
    RIGHT: Buffer.from('1B51', 'hex'), // Fix right size
  },
  PAPER: {
    PAPER_FULL_CUT: Buffer.from('1D5600', 'hex'), // Full cut paper
    PAPER_PART_CUT: Buffer.from('1D5601', 'hex'), // Partial cut paper
    PAPER_CUT_A: Buffer.from('1D5641', 'hex'), // Partial cut paper
    PAPER_CUT_B: Buffer.from('1D5642', 'hex'), // Partial cut paper
  },
  TEXT_FORMAT: {
    TXT_NORMAL: Buffer.from('1B2100', 'hex'), // Normal text
    TXT_2HEIGHT: Buffer.from('1B2110', 'hex'), // Double height text
    TXT_2WIDTH: Buffer.from('1B2120', 'hex'), // Double width text
    TXT_4SQUARE: Buffer.from('1B2130', 'hex'), // Double width & height text
    TXT_BOLDER: Buffer.from('1B2108', 'hex'),

    TXT_CUSTOM_SIZE: function (width, height) { // other sizes
      width = width > 8 ? 8 : width;
      width = width < 1 ? 1 : width;
      height = height > 8 ? 8 : height;
      height = height < 1 ? 1 : height;

      var widthDec = (width - 1) * 16; // Values between 1-8
      var heightDec = height - 1; // Values between 1-8
      var sizeDec = widthDec + heightDec;

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
      8: Buffer.from('07', 'hex')
    },
    TXT_WIDTH: {
      1: Buffer.from('00', 'hex'),
      2: Buffer.from('10', 'hex'),
      3: Buffer.from('20', 'hex'),
      4: Buffer.from('30', 'hex'),
      5: Buffer.from('40', 'hex'),
      6: Buffer.from('50', 'hex'),
      7: Buffer.from('60', 'hex'),
      8: Buffer.from('70', 'hex')
    },

    TXT_UNDERL_OFF: Buffer.from('1B2D00', 'hex'), // Underline font OFF
    TXT_UNDERL_ON: Buffer.from('1B2D01', 'hex'), // Underline font 1-dot ON
    TXT_UNDERL2_ON: Buffer.from('1B2D02', 'hex'), // Underline font 2-dot ON
    TXT_BOLD_OFF: Buffer.from('1B4500', 'hex'), // Bold font OFF
    TXT_BOLD_ON: Buffer.from('1B4501', 'hex'), // Bold font ON
    TXT_ITALIC_OFF: Buffer.from('1B35', 'hex'), // Italic font ON
    TXT_ITALIC_ON: Buffer.from('1B34', 'hex'), // Italic font ON

    TXT_FONT_A: Buffer.from('1B4D00', 'hex'), // Font type A
    TXT_FONT_B: Buffer.from('1B4D01', 'hex'), // Font type B
    TXT_FONT_C: Buffer.from('1B4D02', 'hex'), // Font type C

    TXT_ALIGN_LT: Buffer.from('1B6100', 'hex'), // Left justification
    TXT_ALIGN_CT: Buffer.from('1B6101', 'hex'), // Centering
    TXT_ALIGN_RT: Buffer.from('1B6102', 'hex'), // Right justification
  },
  BARCODE_FORMAT: {
    BARCODE_TXT_OFF: Buffer.from('1D4800', 'hex'), // HRI barcode chars OFF
    BARCODE_TXT_ABV: Buffer.from('1D4801', 'hex'), // HRI barcode chars above
    BARCODE_TXT_BLW: Buffer.from('1D4802', 'hex'), // HRI barcode chars below
    BARCODE_TXT_BTH: Buffer.from('1D4803', 'hex'), // HRI barcode chars both above and below

    BARCODE_FONT_A: Buffer.from('1D6600', 'hex'), // Font type A for HRI barcode chars
    BARCODE_FONT_B: Buffer.from('1D6601', 'hex'), // Font type B for HRI barcode chars

    BARCODE_HEIGHT: function (height) { // Barcode Height [1-255]
      return Buffer.from('1D68' + numToHexString(height), 'hex');
    },
    BARCODE_WIDTH: {
      1: Buffer.from('1D7702', 'hex'),
      2: Buffer.from('1D7703', 'hex'),
      3: Buffer.from('1D7704', 'hex'),
      4: Buffer.from('1D7705', 'hex'),
      5: Buffer.from('1D7706', 'hex'),
    },
    BARCODE_HEIGHT_DEFAULT: Buffer.from('1D6864', 'hex'), // Barcode height default:100
    BARCODE_WIDTH_DEFAULT: Buffer.from('1D7701', 'hex'), // Barcode width default:1

    BARCODE_UPC_A: Buffer.from('1D6B00', 'hex'), // Barcode type UPC-A
    BARCODE_UPC_E: Buffer.from('1D6B01', 'hex'), // Barcode type UPC-E
    BARCODE_EAN13: Buffer.from('1D6B02', 'hex'), // Barcode type EAN13
    BARCODE_EAN8: Buffer.from('1D6B03', 'hex'), // Barcode type EAN8
    BARCODE_CODE39: Buffer.from('1D6B04', 'hex'), // Barcode type CODE39
    BARCODE_ITF: Buffer.from('1D6B05', 'hex'), // Barcode type ITF
    BARCODE_NW7: Buffer.from('1D6B06', 'hex'), // Barcode type NW7
    BARCODE_CODE93: Buffer.from('1D6B48', 'hex'), // Barcode type CODE93
    BARCODE_CODE128: Buffer.from('1D6B49', 'hex'), // Barcode type CODE128
  },
  CODE2D_FORMAT: {
    TYPE_PDF417: Buffer.concat([Buffer.from('1D', 'hex'), Buffer.from('Z', 'ascii'), Buffer.from('00', 'hex')]),
    TYPE_DATAMATRIX: Buffer.concat([Buffer.from('1D', 'hex'), Buffer.from('Z', 'ascii'), Buffer.from('01', 'hex')]),
    TYPE_QR: Buffer.concat([Buffer.from('1D', 'hex'), Buffer.from('Z', 'ascii'), Buffer.from('03', 'hex')]),
    CODE2D: Buffer.concat([Buffer.from('1B', 'hex'), Buffer.from('Z', 'ascii')]),
    QR_LEVEL_L: Buffer.from('L', 'ascii'), // correct level 7%
    QR_LEVEL_M: Buffer.from('M', 'ascii'), // correct level 15%
    QR_LEVEL_Q: Buffer.from('Q', 'ascii'), // correct level 25%
    QR_LEVEL_H: Buffer.from('H', 'ascii')  // correct level 30%
  },
  IMAGE_FORMAT: {
    S_RASTER_N: Buffer.from('1D763000', 'hex'), // Set raster image normal size
    S_RASTER_2W: Buffer.from('1D763001', 'hex'), // Set raster image double width
    S_RASTER_2H: Buffer.from('1D763002', 'hex'), // Set raster image double height
    S_RASTER_Q: Buffer.from('1D763003', 'hex'), // Set raster image quadruple
  },
  BITMAP_FORMAT: {
    BITMAP_S8: Buffer.from('1B2A00', 'hex'),
    BITMAP_D8: Buffer.from('1B2A01', 'hex'),
    BITMAP_S24: Buffer.from('1B2A20', 'hex'),
    BITMAP_D24: Buffer.from('1B2A21', 'hex')
  },
  GSV0_FORMAT: {
    GSV0_NORMAL: Buffer.from('1D763000', 'hex'),
    GSV0_DW: Buffer.from('1D763001', 'hex'),
    GSV0_DH: Buffer.from('1D763002', 'hex'),
    GSV0_DWDH: Buffer.from('1D763003', 'hex')
  },
  BEEP: Buffer.from('1B42', 'hex'), // Printer Buzzer pre hex
  COLOR: {
    0: Buffer.from('1B7200', 'hex'), // black
    1: Buffer.from('1B7201', 'hex'), // red
    REVERSE: Buffer.from('1DB1', 'hex'), // Reverses the colors - white text on black background
    UNREVERSE: Buffer.from('1DB0', 'hex') // Default: undo the reverse - black text on white background
  }
}

commands.numToHexString = numToHexString;

module.exports = commands;
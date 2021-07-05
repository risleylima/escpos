'use strict';

const commands = require('./commands');
const iconv = require('iconv-lite');
const utils = require('./utils');

const Image = require('./image');
const Adapter = require('../adapter');

/**
 * This is the Special Buffer, a "Dinamyc" Buffer that will control the data that will be sent to the printer
 * @class
 * @classdesc This Class will manage a Buffer that can store the data while we send the commands
 */
class SpecBuffer {
  constructor() {
    this.buffer = Buffer.from('', 'hex');
  }

  /**
   * Write Data on Buffer
   * @param {String} data Refers to the Data that will be written on the Buffer
   * @param {String} type Refers to the Type of data ('hex','ascii','etc.')
   */
  write(data, type) {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(data, type)]);
  }

  /**
   * This Command Clean the Special Buffer, and returns the data contained inside the Special Buffer
   * @returns {Buffer} The resulting Buffer.
   */
  flush() {
    let data = Buffer.from(this.buffer);
    this.buffer = Buffer.from('');
    return data;
  }
}

/**
 * This is de EscPos Printer Class
 * @class
 * @classdesc This Class will get the Adapter, manage the buffer, and send the data through the adapter
 */
class Printer {
  /**
   * 
   * @param {Adapter} adapter Refers to the adapter that will be used by the class 
   * @param {{encoding:string,width:string}} options Refers to the options that can be used to instantiate the class (Encoding, Size of Columns)
   */
  constructor(adapter, options) {
    this.adapter = new Adapter(adapter);
    this.options = options;
    this.buffer = new SpecBuffer();
    this.Image = Image;
    this.commands = commands;

    this.encoding = options && options.encoding || 'GB18030';
    this.width = options && options.width || 48;
  }

  /**
   * Set the Character Code Table (See the Printer manual for the table)
   * @param  {Number} codeTable Refers to the codeTable that will be used
   * @return {Printer} The escpos printer instance 
   */
  setCharacterCodeTable(codeTable) {
    this.buffer.write(Buffer.concat([
      commands.ESC,
      commands.TAB,
      Buffer.from(commands.numToHexString(codeTable), 'hex')
    ]));
    return this;
  }

  /**
   * Set the Margin of the Text
   * @param  {'LEFT'|'RIGHT'|'BOTTOM'} type Refers to the type of the margin
   * @param  {Number} size Refers to the size of margin that will be set
   * @return {Printer} The escpos printer instance 
   */
  margin(type, size) {
    let margin = commands.MARGINS.LEFT;

    switch (type.toUpperCase()) {
      case 'RIGHT':
        margin = commands.MARGINS.RIGHT;
        break;
      case 'BOTTOM':
        margin = commands.MARGINS.BOTTOM;
        break;
    }
    this.buffer.write(
      Buffer.concat([
        margin,
        Buffer.from(commands.numToHexString(size), 'hex')
      ])
    );
    return this;
  }

  /**
   * Print the text without set the encoding
   * @param  {String} content Refers to the text that will be printed
   * @return {Printer} The escpos printer instance 
   */
  print(content) {
    this.buffer.write(content, 'ascii');
    return this;
  }

  /**
   * Print the text without set the encoding with End Of Line
   * @param  {String} content Refers to the text that will be printed
   * @return {Printer} The escpos printer instance 
   */
  println(content) {
    this.buffer.write(Buffer.concat([
      Buffer.from(content, 'ascii'),
      commands.EOL
    ]));
    return this;
  }

  /**
   * Send End Of Line command
   * @return {Printer} The escpos printer instance 
   */
  newLine() {
    this.buffer.write(commands.EOL);
    return this;
  }

  /**
   * Print the text with the defined encoding [optional]
   * @param  {String} content Refers to the text that will be printed
   * @param  {String} encoding Refers to the encoding that will be used
   * @return {Printer} The escpos printer instance 
   */
  text(content, encoding) {
    return this.print(iconv.encode(content, encoding || this.encoding));
  }

  /**
   * Print the text with the defined encoding [optional] with End Of Line
   * @param  {String} content Refers to the text that will be printed
   * @param  {String} encoding Refers to the encoding that will be used
   * @return {Printer} The escpos printer instance 
   */
  textln(content, encoding = undefined) {
    return this.println(iconv.encode(content, encoding || this.encoding));
  }

  /**
   * Draw a Line with the desired character
   * @param  {String} character Refers to the character that will be used
   * @return {Printer} The escpos printer instance 
   */
  drawLine(character) {
    if (!character)
      character = '-';

    for (let i = 0; i < this.width; i++) {
      this.buffer.write(Buffer.from(character, 'ascii'));
    }

    return this.newLine();
  }

  /**
   * Set the Encode of the Text (See iconv NPM Library)
   * @param  {String} encoding Refers to the type of encoding that will be used
   * @return {Printer} The escpos printer instance 
   */
  encode(encoding) {
    this.encoding = encoding;
    return this;
  }

  /**
   * Feed the Paper for n times
   * @param  {Number} n Refers to the number of lines that will be feed
   * @return {Printer} The escpos printer instance 
   */
  feed(n) {
    this.buffer.write(Buffer.concat(new Array(n || 1).fill(commands.EOL)));
    return this;
  }

  /**
   * Send a Sequence of pre defined feed sequences (See commands under FEED_CONTROL_SEQUENCES)
   * @param  {String} ctrl Refers to the type of the Alignment
   * @return {Printer} The escpos printer instance 
   */
  control(ctrl) {
    this.buffer.write(commands.FEED_CONTROL_SEQUENCES['CTL_' + ctrl.toUpperCase()]);
    return this;
  }

  /**
   * Set the Text Alignment 
   * @param  {String} align Refers to the type of the Alignment
   * @return {Printer} The escpos printer instance 
   */
  align(align) {
    this.buffer.write(commands.TEXT_FORMAT['TXT_ALIGN_' + align.toUpperCase()]);
    return this;
  }
  /**
   * Set the Font Family of the Printer
   * @param  {String} family Refers to the family of the font
   * @return {Printer} The escpos printer instance 
   */
  font(family) {
    this.buffer.write(commands.TEXT_FORMAT['TXT_FONT_' + family.toUpperCase()]);
    if (family.toUpperCase() === 'A')
      this.width = this.options && this.options.width || 42;
    else
      this.width = this.options && this.options.width || 56;
    return this;
  }

  /**
   * Set the Style of the font
   * @param  {String} type Refers to the type of the font style
   * @return {Printer} The escpos printer instance 
   */
  style(type) {
    let styled;
    switch (type.toUpperCase()) {
      case 'B':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_ON,
          commands.TEXT_FORMAT.TXT_ITALIC_OFF,
          commands.TEXT_FORMAT.TXT_UNDERL_OFF
        ]);
        break;
      case 'I':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_OFF,
          commands.TEXT_FORMAT.TXT_ITALIC_ON,
          commands.TEXT_FORMAT.TXT_UNDERL_OFF
        ]);
        break;
      case 'U':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_OFF,
          commands.TEXT_FORMAT.TXT_ITALIC_OFF,
          commands.TEXT_FORMAT.TXT_UNDERL_ON
        ]);
        break;
      case 'U2':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_OFF,
          commands.TEXT_FORMAT.TXT_ITALIC_OFF,
          commands.TEXT_FORMAT.TXT_UNDERL2_ON
        ]);
        break;

      case 'BI':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_ON,
          commands.TEXT_FORMAT.TXT_ITALIC_ON,
          commands.TEXT_FORMAT.TXT_UNDERL_OFF
        ]);
        break;
      case 'BIU':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_ON,
          commands.TEXT_FORMAT.TXT_ITALIC_ON,
          commands.TEXT_FORMAT.TXT_UNDERL_ON
        ]);
        break;
      case 'BIU2':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_ON,
          commands.TEXT_FORMAT.TXT_ITALIC_ON,
          commands.TEXT_FORMAT.TXT_UNDERL2_ON
        ]);
        break;
      case 'BU':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_ON,
          commands.TEXT_FORMAT.TXT_ITALIC_OFF,
          commands.TEXT_FORMAT.TXT_UNDERL_ON
        ]);
        break;
      case 'BU2':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_ON,
          commands.TEXT_FORMAT.TXT_ITALIC_OFF,
          commands.TEXT_FORMAT.TXT_UNDERL2_ON
        ]);
        break;
      case 'IU':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_OFF,
          commands.TEXT_FORMAT.TXT_ITALIC_ON,
          commands.TEXT_FORMAT.TXT_UNDERL_ON
        ]);
        break;
      case 'IU2':
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_OFF,
          commands.TEXT_FORMAT.TXT_ITALIC_ON,
          commands.TEXT_FORMAT.TXT_UNDERL2_ON
        ]);
        break;

      case 'NORMAL':
      default:
        styled = Buffer.concat([
          commands.TEXT_FORMAT.TXT_BOLD_OFF,
          commands.TEXT_FORMAT.TXT_ITALIC_OFF,
          commands.TEXT_FORMAT.TXT_UNDERL_OFF,
        ]);
        break;
    }

    this.buffer.write(styled);
    return this;
  }

  /**
   * Set the Size of the Characters
   * @param  {Number} width Refers to the width of the character 
   * @param  {Number} height Refers to the height of the character
   * @return {Printer} The escpos printer instance 
   */
  size(width, height) {
    this.buffer.write(commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(width, height));
    return this;
  }

  /**
   * Set the Character Spacing between them
   * @param  {Number} n Refers to the space desired between the characters
   * @return {Printer} The escpos printer instance 
   */
  spacing(n) {
    if (n === undefined || n === null) {
      this.buffer.write(commands.CHARACTER_SPACING.CS_DEFAULT);
    } else {
      this.buffer.write(
        Buffer.concat([
          commands.CHARACTER_SPACING.CS_SET,
          Buffer.from(commands.numToHexString(n), 'hex')
        ])
      );
    }
    return this;
  }

  /**
   * Set the Line Spacing between lines
   * @param  {Number} n Refers to the space desired between lines
   * @return {Printer} The escpos printer instance 
   */
  lineSpace(n) {
    if (n === undefined || n === null) {
      this.buffer.write(commands.LINE_SPACING.LS_DEFAULT);
    } else {
      this.buffer.write(
        Buffer.concat([
          commands.LINE_SPACING.LS_SET,
          Buffer.from(commands.numToHexString(n), 'hex')
        ])
      );
    }
    return this;
  }

  /**
   * Send Hardware Commands to the Printer
   * @param  {String} hw Refers to the type of command that will be sent to printer (See commands under HW section)
   * @return {Printer} The escpos printer instance 
   */
  hardware(hw) {
    this.buffer.write(commands.HARDWARE['HW_' + hw.toUpperCase()]);
    return this;
  }

  /**
   * Print barcode
   * @param  {String} code Refers to the code that will be converted to barcode
   * @param  {String} type Refers to the type of the barcode
   * @param  {{width:String,height:String,position:String,font:String,includeParity:Boolean}} options Refers to the options for generating the barcode
   * @return {Printer} The escpos printer instance 
   */
  barcode(code, type, options) {
    options = options || {};
    let width = options.width;
    let height = options.height;
    let position = options.position;
    let font = options.font;
    let includeParity = options.includeParity !== false; // true by default

    type = type || 'EAN13'; // default type is EAN13, may a good choice ?
    let convertCode = String(code);
    let parityBit = '';
    let codeLength = '';

    if (type === 'EAN13' && convertCode.length !== 12) {
      throw new Error('EAN13 Barcode type requires code length 12');
    } else if (type === 'EAN8' && convertCode.length !== 7) {
      throw new Error('EAN8 Barcode type requires code length 7');
    }

    if (width >= 1 && width <= 5) {
      this.buffer.write(commands.BARCODE_FORMAT.BARCODE_WIDTH[width]);
    } else {
      this.buffer.write(commands.BARCODE_FORMAT.BARCODE_WIDTH_DEFAULT);
    }

    if (height >= 1 && height <= 255) {
      this.buffer.write(commands.BARCODE_FORMAT.BARCODE_HEIGHT(height));
    } else {
      this.buffer.write(commands.BARCODE_FORMAT.BARCODE_HEIGHT_DEFAULT);
    }

    this.buffer.write(commands.BARCODE_FORMAT['BARCODE_FONT_' + (font || 'A').toUpperCase()]);

    this.buffer.write(commands.BARCODE_FORMAT['BARCODE_TXT_' + (position || 'BLW').toUpperCase()]);

    this.buffer.write(commands.BARCODE_FORMAT['BARCODE_' + ((type || 'EAN13').replace('-', '_').toUpperCase())]);

    if (includeParity) {
      if (type === 'EAN13' || type === 'EAN8') {
        parityBit = utils.getParityBit(code);
      }
    }
    if (type == 'CODE128' || type == 'CODE93') {
      codeLength = utils.codeLength(code);
    }
    this.buffer.write(Buffer.concat([
      Buffer.from(codeLength + code + (includeParity ? parityBit : ''), 'ascii'),
      Buffer.from('00', 'hex')
    ]));

    return this;
  }

  /**
   * Prepare the Image to be printed by bitmap mode
   * @param  {Image} image Refers to the Image object to be printed
   * @param  {String} density Refers to the density of the image to be printed
   * @return {Printer} The escpos printer instance 
   */
  image(image, density) {
    if (!(image instanceof Image))
      throw new TypeError('Only Image object supported');
    density = density || 'd24';
    let n = !!~['d8', 's8'].indexOf(density) ? 1 : 3;
    let header = commands.BITMAP_FORMAT['BITMAP_' + density.toUpperCase()];
    let bitmap = image.toBitmap(n * 8);

    bitmap.data.forEach((line) => {
      let lineLength = Buffer.allocUnsafe(2);
      lineLength.writeUInt16LE(line.length / n, 0);

      this.buffer.write(Buffer.concat([
        header,
        lineLength,
        Buffer.from(line),
        commands.ESC,
        commands.FEED_CONTROL_SEQUENCES.CTL_GLF
      ]));
    });

    return this;
  };

  /**
   * Prepare the Image to be printed by raster mode
   * @param  {Image} image Refers to the Image object to be printed
   * @param  {String} mode Refers to the type of mode will be sent to raster format
   * @return {Printer} The escpos printer instance 
   */
  raster(image, mode) {
    if (!(image instanceof Image))
      throw new TypeError('Only Image object supported');

    mode = mode || 'normal';
    if (mode === 'dhdw' || mode === 'dwh' || mode === 'dhw')
      mode = 'dwdh';


    let raster = image.toRaster();
    let header = commands.GSV0_FORMAT['GSV0_' + mode.toUpperCase()];

    let width = Buffer.allocUnsafe(2);
    width.writeUInt16LE(raster.width);
    let height = Buffer.allocUnsafe(2);
    height.writeUInt16LE(raster.height);

    this.buffer.write(Buffer.concat([
      header,
      width,
      height,
      Buffer.from(raster.data)
    ]));

    return this;
  }
  /**
   * Send pulse to open de cash drawer
   * @param  {Number} pin Refers to pin where the pulse will be sent
   * @return {Printer} The escpos printer instance 
   */
  cashdraw(pin) {
    this.buffer.write(commands.CASH_DRAWER['CD_KICK_' + (pin || 2)]);
    return this;
  }

  /**
   * Printer Buzzer (Beep sound)
   * @param  {Number} n Refers to the number of buzzer times
   * @param  {Number} t Refers to the buzzer sound length in (t * 100) milliseconds.
   * @return {Printer} The escpos printer instance 
   */
  beep(n, t) {
    let nB = Buffer.allocUnsafe(1);
    let tB = Buffer.allocUnsafe(1);

    nB.writeUInt8(n, 0);
    tB.writeUInt8(t, 0);

    this.buffer.write(Buffer.concat([
      commands.BEEP,
      nB,
      tB
    ]));

    return this;
  }

  /**
   * Cut the Paper
   * @param  {Boolean} part Refers to the type of the cut (partial or full)
   * @param  {Number} t Refers to the number of lines to be added before the cut
   * @return {Printer} The escpos printer instance 
   */
  cut(part, feed) {
    this.feed(feed || 3);
    this.buffer.write(commands.PAPER[part ? 'PAPER_PART_CUT' : 'PAPER_FULL_CUT']);
    return this;
  };

  /**
   * Send data to hardware using the adapter and flush buffer
   * @return {Promise<Printer>} Promise containing the escpos printer instance
   */
  async flush() {
    var buf = this.buffer.flush();
    if (buf.length > 0) {
      await this.adapter.write(buf);
    }
    return this;
  }

  /**
   * Close the connection to the printer using the adapter
   * @return {Promise<Printer>} Promise containing the escpos printer instance
   */
  async close(options) {
    await this.flush();
    await this.adapter.close(options);
    return this;
  };

  /**
   * color select between two print color modes, if your printer supports it
   * @param  {Number} color - 0 for primary color (black) 1 for secondary color (red)
   * @return {Printer} The escpos printer instance 
   */
  color(color) {
    this.buffer.write(commands.COLOR[color === 0 || color === 1 ? color : 0]);
    return this;
  };

  /**
   * reverse colors, if your printer supports it
   * @param {Boolean} bool - True for reverse, false otherwise
   * @return {Printer} The escpos printer instance 
   */
  setReverseColors(bool) {
    this.buffer.write(bool ? commands.COLOR.REVERSE : commands.COLOR.UNREVERSE);
    return this;
  };


  /**
   * writes a low level command to the printer buffer
   *
   * @usage
   * 1) raw('1d:77:06:1d:6b:02:32:32:30:30:30:30:32:30:30:30:35:30:35:00:0a')
   * 2) raw('1d 77 06 1d 6b 02 32 32 30 30 30 30 32 30 30 30 35 30 35 00 0a')
   * 3) raw(Buffer.from('1d77061d6b0232323030303032303030353035000a','hex'))
   *
   * @param {Buffer|string} data Refers to the RAW data or Buffer that will be sent to the printer
   * @return {Printer} The escpos printer instance 
   */
  raw(data) {
    if (Buffer.isBuffer(data)) {
      this.buffer.write(data);
    } else if (typeof data === 'string') {
      data = data.toLowerCase();
      this.buffer.write(Buffer.from(data.replace(/(\s|:)/g, ''), 'hex'));
    }else {
      throw new Error('Data is Invalid!')
    }
    return this;
  }
}

module.exports = Printer;
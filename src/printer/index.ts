import { commands } from './commands';
import type { CommandSet } from './commands-types';
import {
  getFeedControlKey,
  getAlignKey,
  getFontKey,
  getHardwareKey,
  getBitmapDensityKey,
  getGsv0ModeKey,
  getCashDrawerKey,
} from './commands-types';
import type { BarcodeWidthIndex } from './commands-types';
import { getProfile, getCommandsForProfile } from './profiles';
import type {
  PrinterProfile,
  ProfileRegistry,
  TicketPresentationOptions,
  BarcodeOptions,
  QrCodeOptions,
} from './profiles';
import * as utils from './utils';
import { Image } from './image';
import type { AdapterLike } from '../adapter';
import qrcodeGenerator = require('qrcode-generator');
import * as iconv from 'iconv-lite';

export interface PrinterOptions {
  encoding?: string;
  width?: number;
  /** Profile id (e.g. 'default', 'custom-vkp80iii') or profile object. */
  profile?: string | PrinterProfile;
  /**
   * Default presentation options used by profile ticket presentation builder
   * (when available), e.g. CUSTOM VKP80III FS P params.
   */
  ticketPresentation?: TicketPresentationOptions;
  /** Optional isolated profile registry for multi-tenant environments. */
  profileRegistry?: ProfileRegistry;
  /** Max bytes to buffer before throwing an error (prevents OOM). Default: 10MB. */
  maxBufferSize?: number;
}

export interface RowColumn {
  text: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export interface LineItemOptions {
  descWidth?: number;
  priceWidth?: number;
  qtyWidth?: number;
}

export interface TotalOptions {
  bold?: boolean;
}

export interface PresentTicketOptions extends TicketPresentationOptions {
  /** Feed lines before presentation/cut sequence. */
  feed?: number;
  /** When true and model requires explicit cut, send partial cut. Default: true. */
  part?: boolean;
}

export interface RecoverOptions {
  /** Run adapter-level recovery hook before printer recovery command. Default: true */
  transport?: boolean;
  /** Request DLE EOT status bytes after recovery. Default: false */
  checkStatus?: boolean;
  /** Optional wait between init and status read. Default: 120ms */
  settleMs?: number;
  /** If true, the current buffer content is NOT cleared during recovery. Default: false */
  keepBuffer?: boolean;
}

export interface RecoverResult {
  printer?: Buffer;
  offline?: Buffer;
  error?: Buffer;
  paper?: Buffer;
  /** The content of the buffer that was flushed during recovery (if keepBuffer was false). */
  discardedBuffer?: Buffer;
}

class SpecBuffer {
  private chunks: Buffer[];
  private currentSize: number = 0;
  private maxSize: number;

  constructor(maxSize: number = 10 * 1024 * 1024) {
    this.chunks = [];
    this.maxSize = maxSize;
  }

  private assertWithinLimit(additionalBytes: number): void {
    if (this.currentSize + additionalBytes > this.maxSize) {
      throw new Error(`Printer buffer overflow: max size of ${this.maxSize} bytes reached.`);
    }
  }

  write(data: Buffer | string, type: BufferEncoding | string = 'ascii'): void {
    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data, type as BufferEncoding);
    this.assertWithinLimit(chunk.length);
    this.chunks.push(chunk);
    this.currentSize += chunk.length;
  }

  prepend(data: Buffer): void {
    if (data.length === 0) return;
    this.assertWithinLimit(data.length);
    this.chunks.unshift(data);
    this.currentSize += data.length;
  }

  flush(): Buffer {
    if (this.chunks.length === 0) return Buffer.alloc(0);
    const data = Buffer.concat(this.chunks);
    this.chunks = [];
    this.currentSize = 0;
    return data;
  }

  size(): number {
    return this.currentSize;
  }
}

/** Convert string or Buffer to Buffer (DRY for print, println). */
function toBuffer(content: string | Buffer, encoding: BufferEncoding | string = 'ascii'): Buffer {
  return Buffer.isBuffer(content) ? content : Buffer.from(content, encoding as BufferEncoding);
}

/** Normalize "options or encoding as 3rd/4th param" pattern (DRY for lineItem, total, etc.). */
function normalizeOptionsEncoding<T>(
  optionsOrEncoding?: T | string,
  encoding?: string
): { options?: T; encoding?: string } {
  if (typeof optionsOrEncoding === 'string') {
    return { encoding: optionsOrEncoding };
  }
  return { options: optionsOrEncoding, encoding };
}

function buildStyleMap(cmd: CommandSet): Record<string, Buffer[]> {
  const T = cmd.TEXT_FORMAT;
  return {
    B: [T.TXT_BOLD_ON, T.TXT_ITALIC_OFF, T.TXT_UNDERL_OFF],
    I: [T.TXT_BOLD_OFF, T.TXT_ITALIC_ON, T.TXT_UNDERL_OFF],
    U: [T.TXT_BOLD_OFF, T.TXT_ITALIC_OFF, T.TXT_UNDERL_ON],
    U2: [T.TXT_BOLD_OFF, T.TXT_ITALIC_OFF, T.TXT_UNDERL2_ON],
    BI: [T.TXT_BOLD_ON, T.TXT_ITALIC_ON, T.TXT_UNDERL_OFF],
    BIU: [T.TXT_BOLD_ON, T.TXT_ITALIC_ON, T.TXT_UNDERL_ON],
    BIU2: [T.TXT_BOLD_ON, T.TXT_ITALIC_ON, T.TXT_UNDERL2_ON],
    BU: [T.TXT_BOLD_ON, T.TXT_ITALIC_OFF, T.TXT_UNDERL_OFF],
    BU2: [T.TXT_BOLD_ON, T.TXT_ITALIC_OFF, T.TXT_UNDERL2_ON],
    IU: [T.TXT_BOLD_OFF, T.TXT_ITALIC_ON, T.TXT_UNDERL_ON],
    IU2: [T.TXT_BOLD_OFF, T.TXT_ITALIC_ON, T.TXT_UNDERL2_ON],
    NORMAL: [T.TXT_BOLD_OFF, T.TXT_ITALIC_OFF, T.TXT_UNDERL_OFF],
  };
}

export class Printer {
  adapter: AdapterLike;
  buffer: SpecBuffer;
  encoding: string;
  width: number;
  options?: PrinterOptions;
  /** Resolved profile, if any (used for paper width command and validation). */
  profile?: PrinterProfile;
  Image: typeof Image;
  commands: CommandSet;
  private styleMap: Record<string, Buffer[]>;
  private currentCodepage?: number;

  private resolveTicketPresentationCommand(options?: TicketPresentationOptions): Buffer | undefined {
    if (!this.profile) return undefined;
    const merged = { ...(this.options?.ticketPresentation ?? {}), ...(options ?? {}) };
    this.profile.validateTicketPresentationOptions?.(merged);
    return this.profile.getTicketPresentationCommand?.(merged) ?? this.profile.paperEjectAfterCut;
  }

  private ioChain: Promise<void> = Promise.resolve();

  constructor(adapter: AdapterLike, options?: PrinterOptions) {
    this.adapter = adapter;
    this.options = options;
    this.buffer = new SpecBuffer(options?.maxBufferSize);
    this.Image = Image;
    const profileResolver = options?.profileRegistry?.getProfile ?? getProfile;
    const commandsResolver = options?.profileRegistry?.getCommandsForProfile ?? getCommandsForProfile;
    const profile =
      options?.profile === undefined
        ? undefined
        : typeof options.profile === 'string'
          ? profileResolver(options.profile)
          : options.profile;
    if (typeof options?.profile === 'string' && !profile) {
      throw new Error(`Unknown profile "${options.profile}". Register it first or pass a valid profile object.`);
    }
    this.commands = profile ? commandsResolver(profile) : (commands as CommandSet);
    this.profile = profile;
    this.styleMap = buildStyleMap(this.commands);
    this.encoding = options?.encoding ?? 'utf8';
    this.width = options?.width ?? profile?.defaultPaperWidth ?? 80;
  }

  private enqueueIo<T>(task: () => Promise<T>): Promise<T> {
    const run = this.ioChain.then(task, task);
    this.ioChain = run.then(() => undefined, () => undefined);
    return run;
  }

  /**
   * Set paper width (characters per line). If the profile defines a hardware command
   * (e.g. GS W), it is sent to the printer; otherwise only the internal width is updated.
   */
  paperWidth(width: number): this {
    const w = Math.max(1, Math.floor(Number(width) || 80));
    if (this.profile?.paperWidths && !this.profile.paperWidths.includes(w)) {
      console.warn(`[escpos] Paper width ${w} may not be supported by profile "${this.profile.id}".`);
    }
    this.width = w;
    const cmd = this.profile?.getPaperWidthCommand?.(w);
    if (cmd) this.buffer.write(cmd);
    return this;
  }

  setCharacterCodeTable(codeTable: number): this {
    this.currentCodepage = codeTable;
    this.buffer.write(
      Buffer.concat([
        this.commands.ESC,
        Buffer.from([0x74]), // 't'
        Buffer.from([codeTable]),
      ])
    );
    return this;
  }

  margin(type: string, size: number): this {
    if (typeof type !== 'string' || !type) {
      throw new TypeError('margin(type, size): type must be a non-empty string (LEFT, RIGHT, BOTTOM)');
    }
    const key = type.toUpperCase() as 'LEFT' | 'RIGHT' | 'BOTTOM';
    const margin = this.commands.MARGINS[key];
    if (!margin) {
      throw new TypeError(`margin(type, size): invalid type "${type}". Use LEFT, RIGHT, or BOTTOM.`);
    }
    this.buffer.write(Buffer.concat([margin, Buffer.from(this.commands.numToHexString(size), 'hex')]));
    return this;
  }

  marginBottomCancel(): this {
    this.buffer.write(this.commands.MARGIN_BOTTOM_CANCEL);
    return this;
  }

  print(content: string | Buffer): this {
    this.buffer.write(toBuffer(content));
    return this;
  }

  println(content: string | Buffer): this {
    this.buffer.write(Buffer.concat([toBuffer(content), this.commands.EOL]));
    return this;
  }

  newLine(): this {
    this.buffer.write(this.commands.EOL);
    return this;
  }

  /**
   * Internal helper to set codepage based on encoding if profile supports it.
   */
  private autoSetCodepage(encoding: string): void {
    if (!this.profile?.codepages) return;
    const cp = this.profile.codepages[encoding];
    if (cp !== undefined && cp !== this.currentCodepage) {
      this.setCharacterCodeTable(cp);
    }
  }

  /**
   * Encode string to buffer using Node Buffer when supported, else iconv-lite (e.g. cp850, cp860).
   */
  private encodeText(content: string, encoding: string): Buffer {
    if (Buffer.isEncoding(encoding)) {
      return Buffer.from(content, encoding as BufferEncoding);
    }
    if (iconv.encodingExists(encoding)) {
      return iconv.encode(content, encoding);
    }
    return Buffer.from(content, 'utf8');
  }

  /**
   * Print text with encoding. If the profile has a mapping for the encoding,
   * it automatically sends the codepage command (ESC t n).
   * Uses iconv-lite for encodings not natively supported by Node (e.g. cp850, cp860).
   */
  text(content: string, encoding?: string): this {
    const enc = encoding ?? this.encoding;
    this.autoSetCodepage(enc);
    return this.print(this.encodeText(content, enc));
  }

  textln(content: string, encoding?: string): this {
    const enc = encoding ?? this.encoding;
    this.autoSetCodepage(enc);
    return this.println(this.encodeText(content, enc));
  }

  drawLine(character: string = '-'): this {
    for (let i = 0; i < this.width; i++) {
      this.buffer.write(Buffer.from(character, 'ascii'));
    }
    return this.newLine();
  }

  section(title: string, encoding?: string): this {
    this.drawLine('-');
    this.centerln(title, encoding);
    this.drawLine('-');
    return this;
  }

  center(content: string, encoding?: string): this {
    this.align('ct');
    this.text(content, encoding);
    this.align('lt');
    return this;
  }

  centerln(content: string, encoding?: string): this {
    this.align('ct');
    this.textln(content, encoding);
    this.align('lt');
    return this;
  }

  right(content: string, encoding?: string): this {
    this.align('rt');
    this.text(content, encoding);
    this.align('lt');
    return this;
  }

  rightln(content: string, encoding?: string): this {
    this.align('rt');
    this.textln(content, encoding);
    this.align('lt');
    return this;
  }

  row(columns: RowColumn[], encoding?: string): this {
    if (!Array.isArray(columns) || columns.length === 0) return this;
    let line = '';
    for (const col of columns) {
      const w = Math.max(0, Number(col.width) || 0);
      const align = (col.align ?? 'left').toLowerCase() as 'left' | 'right' | 'center';
      let s = String(col.text ?? '');
      if (utils.textLength(s) > w) s = utils.textSubstring(s, 0, w);
      const len = utils.textLength(s);
      const pad = w - len;
      if (align === 'right') line += ' '.repeat(pad) + s;
      else if (align === 'center')
        line += ' '.repeat(Math.floor(pad / 2)) + s + ' '.repeat(pad - Math.floor(pad / 2));
      else line += s + ' '.repeat(pad);
    }
    this.textln(line, encoding);
    return this;
  }

  /**
   * Alias for row() but allows using decimal proportions for widths (e.g. 0.5 for 50%).
   */
  tableCustom(columns: Array<{ text: string; width: number; align?: 'LEFT' | 'CENTER' | 'RIGHT' }>, encoding?: string): this {
    const formattedCols: RowColumn[] = columns.map(col => ({
      text: col.text,
      width: col.width < 1 ? Math.floor(this.width * col.width) : col.width,
      align: (col.align?.toLowerCase() ?? 'left') as 'left' | 'center' | 'right'
    }));
    return this.row(formattedCols, encoding);
  }

  lineItem(
    desc: string,
    price: string | number,
    optionsOrEncoding?: LineItemOptions | string,
    encoding?: string
  ): this {
    const { options, encoding: enc } = normalizeOptionsEncoding<LineItemOptions>(optionsOrEncoding, encoding);
    const priceWidth = options?.priceWidth ?? 12;
    const descWidth = options?.descWidth ?? this.width - priceWidth;
    return this.row(
      [
        { text: String(desc ?? ''), width: descWidth },
        { text: String(price ?? ''), width: priceWidth, align: 'right' },
      ],
      enc
    );
  }

  lineItemWithQty(
    desc: string,
    qty: string | number,
    price: string | number,
    optionsOrEncoding?: LineItemOptions | string,
    encoding?: string
  ): this {
    const { options, encoding: enc } = normalizeOptionsEncoding<LineItemOptions>(optionsOrEncoding, encoding);
    const priceWidth = options?.priceWidth ?? 12;
    const qtyWidth = options?.qtyWidth ?? 6;
    const descWidth = options?.descWidth ?? this.width - priceWidth - qtyWidth;
    return this.row(
      [
        { text: String(desc ?? ''), width: descWidth },
        { text: String(qty ?? ''), width: qtyWidth, align: 'right' },
        { text: String(price ?? ''), width: priceWidth, align: 'right' },
      ],
      enc
    );
  }

  total(
    label: string,
    value: string | number,
    optionsOrEncoding?: TotalOptions | string,
    encoding?: string
  ): this {
    const { options, encoding: enc } = normalizeOptionsEncoding<TotalOptions>(optionsOrEncoding, encoding);
    const bold = !options || options.bold !== false;
    if (bold) this.style('b');
    this.row(
      [
        { text: String(label ?? ''), width: this.width - 12 },
        { text: String(value ?? ''), width: 12, align: 'right' },
      ],
      enc
    );
    if (bold) this.style('normal');
    return this;
  }

  encode(encoding: string): this {
    this.encoding = encoding;
    return this;
  }

  feed(n: number = 1): this {
    const lines = Math.min(255, Math.max(0, Math.floor(Number(n) || 0)));
    if (lines > 0) {
      this.buffer.write(Buffer.concat(new Array(lines).fill(this.commands.EOL)));
    }
    return this;
  }

  feedLines(n: number): this {
    const byte = Math.min(255, Math.max(0, Number(n) || 0));
    this.buffer.write(Buffer.concat([this.commands.FEED_LINES, Buffer.from([byte])]));
    return this;
  }

  control(ctrl: string): this {
    if (typeof ctrl !== 'string' || !ctrl) {
      throw new TypeError('control(ctrl): ctrl must be a non-empty string');
    }
    const key = getFeedControlKey(ctrl);
    if (!key) {
      throw new TypeError(`control(ctrl): invalid ctrl "${ctrl}". Use LF, GLF, FF, CR, HT, or VT.`);
    }
    this.buffer.write(this.commands.FEED_CONTROL_SEQUENCES[key]);
    return this;
  }

  align(align: string): this {
    if (typeof align !== 'string' || !align) {
      throw new TypeError('align(align): align must be a non-empty string (LT, CT, RT)');
    }
    const key = getAlignKey(align);
    if (!key) {
      throw new TypeError(`align(align): invalid align "${align}". Use LT, CT, or RT.`);
    }
    const cmd = this.commands.TEXT_FORMAT[key];
    this.buffer.write(cmd);
    return this;
  }

  font(family: string): this {
    if (typeof family !== 'string' || !family) {
      throw new TypeError('font(family): family must be a non-empty string (A, B, C)');
    }
    const key = getFontKey(family);
    if (!key) {
      throw new TypeError(`font(family): invalid family "${family}". Use A, B, or C.`);
    }
    this.buffer.write(this.commands.TEXT_FORMAT[key]);
    this.width = family.toUpperCase() === 'A' ? (this.options?.width ?? 42) : (this.options?.width ?? 56);
    return this;
  }

  style(type: string): this {
    if (typeof type !== 'string') {
      throw new TypeError('style(type): type must be a string');
    }
    const key = type.toUpperCase();
    const buffers = this.styleMap[key] ?? this.styleMap.NORMAL;
    this.buffer.write(Buffer.concat(buffers));
    return this;
  }

  size(width: number, height: number): this {
    this.buffer.write(this.commands.TEXT_FORMAT.TXT_CUSTOM_SIZE(width, height));
    return this;
  }

  /** Write default or parameterised command (DRY for spacing/lineSpace). */
  private writeOptionalNumber(defaultBuf: Buffer, setPrefix: Buffer, n?: number | null): void {
    if (n === undefined || n === null) {
      this.buffer.write(defaultBuf);
    } else {
      if (!Number.isInteger(n) || n < 0 || n > 255) {
        throw new TypeError('numeric command parameter must be an integer between 0 and 255');
      }
      this.buffer.write(Buffer.concat([setPrefix, Buffer.from(this.commands.numToHexString(n), 'hex')]));
    }
  }

  spacing(n?: number | null): this {
    this.writeOptionalNumber(
      this.commands.CHARACTER_SPACING.CS_DEFAULT,
      this.commands.CHARACTER_SPACING.CS_SET,
      n
    );
    return this;
  }

  lineSpace(n?: number | null): this {
    this.writeOptionalNumber(
      this.commands.LINE_SPACING.LS_DEFAULT,
      this.commands.LINE_SPACING.LS_SET,
      n
    );
    return this;
  }

  hardware(hw: string): this {
    if (typeof hw !== 'string' || !hw) {
      throw new TypeError('hardware(hw): hw must be a non-empty string (INIT, SELECT, RESET)');
    }
    const key = getHardwareKey(hw);
    if (!key) {
      throw new TypeError(`hardware(hw): invalid hw "${hw}". Use INIT, SELECT, or RESET.`);
    }
    this.buffer.write(this.commands.HARDWARE[key]);
    return this;
  }

  barcode(
    code: string,
    type: string = 'EAN13',
    options?: BarcodeOptions
  ): this {
    const profileBuf = this.profile?.buildBarcode?.(code, type, options, {
      commands: this.commands,
      getParityBit: utils.getParityBit,
      codeLength: utils.codeLength,
    });
    if (Buffer.isBuffer(profileBuf)) {
      this.buffer.write(profileBuf);
      return this;
    }
    options = options ?? {};
    const width = options.width;
    const height = options.height;
    const position = options.position;
    const font = options.font;
    const includeParity = options.includeParity !== false;
    const normalizedType = String(type || 'EAN13').toUpperCase();
    const convertCode = String(code);
    let parityBit = '';
    let codeLen: Buffer = Buffer.alloc(0);

    if (normalizedType === 'EAN13' && convertCode.length !== 12 && convertCode.length !== 13) {
      throw new Error('EAN13 Barcode type requires code length 12 or 13');
    }
    if (normalizedType === 'EAN8' && convertCode.length !== 7 && convertCode.length !== 8) {
      throw new Error('EAN8 Barcode type requires code length 7 or 8');
    }
    if (
      normalizedType === 'CODE32' &&
      (convertCode.length < 8 || convertCode.length > 9 || !/^\d+$/.test(convertCode))
    ) {
      throw new Error('CODE32 Barcode type requires 8 or 9 numeric digits');
    }

    const bf = this.commands.BARCODE_FORMAT;
    const widthKey = width != null && width >= 1 && width <= 5 ? (width as BarcodeWidthIndex) : undefined;
    if (widthKey !== undefined) {
      this.buffer.write(bf.BARCODE_WIDTH[widthKey]);
    } else {
      this.buffer.write(bf.BARCODE_WIDTH_DEFAULT);
    }
    if (height != null && height >= 1 && height <= 255) {
      this.buffer.write(bf.BARCODE_HEIGHT(height));
    } else {
      this.buffer.write(bf.BARCODE_HEIGHT_DEFAULT);
    }
    const fontKey = 'BARCODE_FONT_' + (font || 'A').toUpperCase();
    const posKey = 'BARCODE_TXT_' + (position || 'BLW').toUpperCase();
    const typeKey = 'BARCODE_' + normalizedType.replace('-', '_');
    const bfRecord: Record<string, unknown> = bf;
    const fontBuf = bfRecord[fontKey];
    const posBuf = bfRecord[posKey];
    const typeBuf = bfRecord[typeKey];
    if (Buffer.isBuffer(fontBuf)) this.buffer.write(fontBuf);
    if (Buffer.isBuffer(posBuf)) this.buffer.write(posBuf);
    if (Buffer.isBuffer(typeBuf)) this.buffer.write(typeBuf);

    if (includeParity && (normalizedType === 'EAN13' || normalizedType === 'EAN8')) {
      const expectsParity =
        (normalizedType === 'EAN13' && convertCode.length === 12) ||
        (normalizedType === 'EAN8' && convertCode.length === 7);
      if (expectsParity) parityBit = utils.getParityBit(code);
    }
    let payload = convertCode + (includeParity ? parityBit : '');
    const format2Type = normalizedType === 'CODE128' || normalizedType === 'CODE93';
    if (normalizedType === 'CODE128' && !/^\{[ABC]/.test(payload)) {
      // GS k format 2 requires initial code set marker; default to CODE B for generic ASCII payload.
      payload = `{B${payload}`;
    }
    if (format2Type) codeLen = utils.codeLength(payload);
    this.buffer.write(
      Buffer.concat([
        codeLen,
        Buffer.from(payload, 'ascii'),
        ...(format2Type ? [] : [Buffer.from('00', 'hex')]),
      ])
    );
    return this;
  }

  image(image: Image, density: string = 'd24'): this {
    if (!(image instanceof Image)) throw new TypeError('Only Image object supported');
    const n = ['d8', 's8'].includes(density) ? 1 : 3;
    const key = getBitmapDensityKey(density);
    if (!key) throw new TypeError(`image(..., density): invalid density "${density}". Use s8, d8, s24, d24.`);
    const header = this.commands.BITMAP_FORMAT[key];
    const bitmap = image.toBitmap(n * 8);
    for (const line of bitmap.data) {
      const lineLength = Buffer.allocUnsafe(2);
      lineLength.writeUInt16LE(line.length / n, 0);
      this.buffer.write(
        Buffer.concat([
          header,
          lineLength,
          Buffer.from(line),
          this.commands.ESC,
          this.commands.FEED_CONTROL_SEQUENCES.CTL_GLF,
        ])
      );
    }
    return this;
  }

  raster(image: Image, mode: string = 'normal'): this {
    if (!(image instanceof Image)) throw new TypeError('Only Image object supported');
    if (mode === 'dhdw' || mode === 'dwh' || mode === 'dhw') mode = 'dwdh';
    const raster = image.toRaster();
    const key = getGsv0ModeKey(mode);
    if (!key) throw new TypeError(`raster(..., mode): invalid mode "${mode}". Use normal, dw, dh, dwdh.`);
    const header = this.commands.GSV0_FORMAT[key];
    const width = Buffer.allocUnsafe(2);
    width.writeUInt16LE(raster.width, 0);
    const height = Buffer.allocUnsafe(2);
    height.writeUInt16LE(raster.height, 0);
    this.buffer.write(
      Buffer.concat([header, width, height, Buffer.from(raster.data)])
    );
    return this;
  }

  cashdraw(pin: 2 | 5 = 2): this {
    this.buffer.write(this.commands.CASH_DRAWER[getCashDrawerKey(pin)]);
    return this;
  }

  beep(n: number = 1, t: number = 1): this {
    const nB = Buffer.allocUnsafe(1);
    const tB = Buffer.allocUnsafe(1);
    nB.writeUInt8(n, 0);
    tB.writeUInt8(t, 0);
    this.buffer.write(Buffer.concat([this.commands.BEEP, nB, tB]));
    return this;
  }

  /**
   * Feed paper then cut.
   * If the profile has ejectCommandIncludesCut (e.g. CUSTOM VKP80III),
   * we still send feed if feed > 0 before the eject command.
   */
  cut(part: boolean = true, feed: number = 3): this {
    const n = Math.min(255, Math.max(0, feed));
    const presentationCmd = this.resolveTicketPresentationCommand();
    const useEjectOnly = this.profile?.ejectCommandIncludesCut && presentationCmd?.length;

    if (n > 0) {
      this.buffer.write(Buffer.concat([this.commands.FEED_LINES, Buffer.from([n])]));
    }

    if (!useEjectOnly) {
      this.buffer.write(this.commands.PAPER[part ? 'PAPER_PART_CUT' : 'PAPER_FULL_CUT']);
    }

    if (presentationCmd?.length) {
      this.buffer.write(presentationCmd);
    }
    return this;
  }

  /**
   * High-level ticket presentation API.
   * Uses profile-specific presentation command when available; otherwise falls back to cut().
   */
  presentTicket(options?: PresentTicketOptions): this {
    const n = Math.min(255, Math.max(0, options?.feed ?? 3));
    const part = options?.part !== false;
    const presentationCmd = this.resolveTicketPresentationCommand(options);
    if (!presentationCmd?.length) return this.cut(part, n);

    if (n > 0) {
      this.buffer.write(Buffer.concat([this.commands.FEED_LINES, Buffer.from([n])]));
    }

    if (!this.profile?.ejectCommandIncludesCut) {
      this.buffer.write(this.commands.PAPER[part ? 'PAPER_PART_CUT' : 'PAPER_FULL_CUT']);
    }

    this.buffer.write(presentationCmd);
    return this;
  }

  async flush(): Promise<this> {
    const buf = this.buffer.flush();
    if (buf.length === 0) return this;
    try {
      await this.enqueueIo(() => this.adapter.write(buf));
    } catch (error) {
      // Preserve payload for retry in caller-controlled recovery flows.
      this.buffer.prepend(buf);
      throw error;
    }
    return this;
  }

  async close(options?: { timeout?: number }): Promise<this> {
    const buf = this.buffer.flush();
    if (buf.length > 0) {
      try {
        await this.enqueueIo(() => this.adapter.write(buf));
      } catch (error) {
        this.buffer.prepend(buf);
        throw error;
      }
    }
    await this.adapter.close(options);
    return this;
  }

  color(color: 0 | 1): this {
    this.buffer.write(this.commands.COLOR[color === 0 || color === 1 ? color : 0]);
    return this;
  }

  setReverseColors(bool: boolean): this {
    this.buffer.write(bool ? this.commands.COLOR.REVERSE : this.commands.COLOR.UNREVERSE);
    return this;
  }

  setReverseColorsAlt(bool: boolean): this {
    this.buffer.write(bool ? this.commands.COLOR.REVERSE_ALT : this.commands.COLOR.UNREVERSE_ALT);
    return this;
  }

  raw(data: Buffer | string): this {
    if (Buffer.isBuffer(data)) {
      this.buffer.write(data);
    } else if (typeof data === 'string') {
      const normalized = data.toLowerCase().replace(/(\s|:)/g, '');
      if (normalized.length === 0 || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/.test(normalized)) {
        throw new TypeError('raw(data): hex string must have even length and contain only [0-9a-f]');
      }
      this.buffer.write(Buffer.from(normalized, 'hex'));
    } else {
      throw new Error('Data is Invalid!');
    }
    return this;
  }

  private writeNativeQrCode(code: string, options: QrCodeOptions): void {
    const profileBuf = this.profile?.buildQrCode?.(code, options, {
      commands: this.commands,
    });
    if (Buffer.isBuffer(profileBuf)) {
      this.buffer.write(profileBuf);
      return;
    }

    const model = options.model ?? 2;
    const size = options.size ?? 6;
    const level = (options.level ?? 'L').toUpperCase();
    const levels: Record<string, number> = { L: 48, M: 49, Q: 50, H: 51 };

    const cmd = this.commands.CODE2D_FORMAT.GS_H;

    // 1. Select Model (Function 165 -> 0x41)
    this.buffer.write(Buffer.concat([cmd, Buffer.from([0x04, 0x00, 0x31, 0x41, model, 0x00])]));
    // 2. Set Module Size (Function 167 -> 0x43)
    this.buffer.write(Buffer.concat([cmd, Buffer.from([0x03, 0x00, 0x31, 0x43, size])]));
    // 3. Set Error Correction Level (Function 169 -> 0x45)
    this.buffer.write(Buffer.concat([cmd, Buffer.from([0x03, 0x00, 0x31, 0x45, levels[level] ?? 48])]));

    // 4. Store Data (Function 180)
    const data = Buffer.from(code, 'utf8');
    const len = data.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);
    this.buffer.write(Buffer.concat([cmd, Buffer.from([pL, pH, 0x31, 0x50, 0x30]), data]));

    // 5. Print QR Code (Function 181)
    this.buffer.write(Buffer.concat([cmd, Buffer.from([0x03, 0x00, 0x31, 0x51, 0x30])]));
  }

  private writeRasterQrCode(code: string, options: QrCodeOptions): void {
    const level = (options.level ?? 'M').toUpperCase() as 'L' | 'M' | 'Q' | 'H';
    const dotSize = Math.max(1, Math.min(16, Math.floor(options.size ?? 6)));
    const position = options.position?.toLowerCase();
    const offsetCols = Number.isFinite(Number(options.offsetCols))
      ? Math.floor(Number(options.offsetCols))
      : 0;
    const offsetPx = offsetCols * 8;
    const quietZone = 4;

    if (position === 'center') this.buffer.write(this.commands.TEXT_FORMAT.TXT_ALIGN_CT);
    else if (position === 'right') this.buffer.write(this.commands.TEXT_FORMAT.TXT_ALIGN_RT);
    else if (position === 'left') this.buffer.write(this.commands.TEXT_FORMAT.TXT_ALIGN_LT);

    const qr = qrcodeGenerator(0, level);
    qr.addData(code, 'Byte');
    qr.make();

    const modules = qr.getModuleCount();
    const contentPx = (modules + quietZone * 2) * dotSize;
    const extraLeftPx = Math.max(0, -offsetPx);
    const extraRightPx = Math.max(0, offsetPx);
    const canvasPx = contentPx + extraLeftPx + extraRightPx;
    const leftPaddingPx = offsetPx + extraLeftPx;
    const widthBytes = Math.ceil(canvasPx / 8);
    const raster = Buffer.alloc(widthBytes * contentPx);

    for (let y = 0; y < contentPx; y++) {
      const moduleY = Math.floor(y / dotSize) - quietZone;
      for (let x = 0; x < contentPx; x++) {
        const moduleX = Math.floor(x / dotSize) - quietZone;
        const dark =
          moduleX >= 0 &&
          moduleX < modules &&
          moduleY >= 0 &&
          moduleY < modules &&
          qr.isDark(moduleY, moduleX);
        if (!dark) continue;
        const outX = x + leftPaddingPx;
        const index = y * widthBytes + (outX >> 3);
        raster[index] |= 0x80 >> (outX & 0x07);
      }
    }

    const width = Buffer.allocUnsafe(2);
    width.writeUInt16LE(widthBytes, 0);
    const height = Buffer.allocUnsafe(2);
    height.writeUInt16LE(contentPx, 0);
    this.buffer.write(
      Buffer.concat([this.commands.GSV0_FORMAT.GSV0_NORMAL, width, height, raster])
    );
  }

  /**
   * QR Code emission strategy:
   * - native: ESC/POS GS ( k flow.
   * - raster: rendered matrix sent as GS v 0 bitmap.
   * - auto: profile-driven (fallback to raster on native hook failures).
   */
  qrcode(
    code: string,
    options: QrCodeOptions = {}
  ): this {
    const strategy = options.strategy ?? this.profile?.qrCodeStrategy ?? 'native';
    if (strategy === 'raster') {
      this.writeRasterQrCode(code, options);
      return this;
    }

    if (strategy === 'auto') {
      const profileSupportsNative = this.profile?.supportsNativeQrCode ?? true;
      if (!profileSupportsNative) {
        this.writeRasterQrCode(code, options);
        return this;
      }
      try {
        this.writeNativeQrCode(code, options);
      } catch {
        this.writeRasterQrCode(code, options);
      }
      return this;
    }

    this.writeNativeQrCode(code, options);
    return this;
  }

  /**
   * Legacy 2D code command using ESC Z / GS Z command family.
   * Use `qrcode(...)` for modern GS ( k flow when possible.
   */
  code2d(
    code: string,
    type: 'PDF417' | 'DATAMATRIX' | 'QR' = 'QR',
    level?: 'L' | 'M' | 'Q' | 'H'
  ): this {
    const profileBuf = this.profile?.buildCode2d?.(code, type, level, {
      commands: this.commands,
    });
    if (Buffer.isBuffer(profileBuf)) {
      this.buffer.write(profileBuf);
      return this;
    }
    const f = this.commands.CODE2D_FORMAT;
    const typeMap = {
      PDF417: f.TYPE_PDF417,
      DATAMATRIX: f.TYPE_DATAMATRIX,
      QR: f.TYPE_QR,
    } as const;
    const levelMap = {
      L: f.QR_LEVEL_L,
      M: f.QR_LEVEL_M,
      Q: f.QR_LEVEL_Q,
      H: f.QR_LEVEL_H,
    } as const;
    const typeCmd = typeMap[type];
    const levelCmd = level ? levelMap[level] : undefined;
    this.buffer.write(
      Buffer.concat([
        typeCmd,
        f.CODE2D,
        ...(levelCmd ? [levelCmd] : []),
        Buffer.from(String(code), 'ascii'),
      ])
    );
    return this;
  }

  /**
   * Request printer status in real-time.
   * Returns a Buffer with the status byte.
   */
  async getStatus(type: 'PRINTER' | 'OFFLINE' | 'ERROR' | 'PAPER' = 'PRINTER'): Promise<Buffer> {
    return this.enqueueIo(async () => {
      if (typeof this.adapter.read !== 'function') {
        throw new Error('Read not supported');
      }
      const n = this.commands.STATUS[type];
      await this.adapter.write(this.commands.STATUS.DLE_EOT(n));
      return this.adapter.read();
    });
  }

  /**
   * Recover transport + generic ESC/POS runtime state.
   * Intended for post-error cleanup before retrying jobs.
   */
  async recover(options: RecoverOptions = {}): Promise<RecoverResult> {
    return this.enqueueIo(async () => {
      const transport = options.transport !== false;
      const checkStatus = options.checkStatus === true;
      const settleMs = Math.max(0, Math.floor(options.settleMs ?? 120));
      const keepBuffer = options.keepBuffer === true;

      // Drop pending payload on recovery unless keepBuffer is set.
      const discardedBuffer = keepBuffer ? undefined : this.buffer.flush();
      this.currentCodepage = undefined;

      if (transport && typeof this.adapter.recover === 'function') {
        await this.adapter.recover();
      }

      const recoverCmd =
        this.profile?.buildRecoverCommand?.({ commands: this.commands }) ??
        this.commands.HARDWARE.HW_INIT;
      await this.adapter.write(recoverCmd);

      if (settleMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, settleMs));
      }

      const out: RecoverResult = { discardedBuffer };
      if (!checkStatus) return out;

      const canRead = typeof this.adapter.read === 'function';
      if (!canRead) return out;

      const probe = async (key: keyof RecoverResult, n: number) => {
        try {
          await this.adapter.write(this.commands.STATUS.DLE_EOT(n));
          const res = await this.adapter.read();
          if (key !== 'discardedBuffer') (out as any)[key] = res;
        } catch {
          // Best-effort status probing.
        }
      };

      await probe('printer', this.commands.STATUS.PRINTER);
      await probe('offline', this.commands.STATUS.OFFLINE);
      await probe('error', this.commands.STATUS.ERROR);
      await probe('paper', this.commands.STATUS.PAPER);
      return out;
    });
  }
}

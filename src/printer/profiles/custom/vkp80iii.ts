/**
 * CUSTOM VKP80III profile.
 * Manual (CUSTOM_COMMANDS.pdf p.301): FS P (0x1C 0x50) "cuts the paper and manage the ticket presentation".
 * So we use paperEjectAfterCut = 1C 50 14 01 45 0A and ejectCommandIncludesCut = true: cut() sends
 * only feed (ESC d n) + FS P, no separate GS V — matching the working production flow.
 */

import type { PrinterProfile, TicketPresentationOptions } from '../types';

export interface Vkp80iiiTicketPresentationOptions {
  /** FS P parameter a. Default: 0x14. */
  paramA?: number;
  /** FS P parameter b. Default: 0x01. */
  paramB?: number;
  /** FS P parameter c. Default: 0x45. */
  paramC?: number;
  /** FS P parameter d. Default: 0x0A. */
  paramD?: number;
}

/** Horizontal motion unit often 0.125 mm; width in chars ~ (mm / 0.125) / 8 ≈ mm*4/10. Approx. */
function charsToMotionUnits(widthChars: number): number {
  const dots = widthChars * 8; // 1 char ≈ 8 dots at 1x
  return Math.min(608, Math.max(0, dots));
}

function toByte(n: number | undefined, fallback: number): Buffer {
  const value = Number.isFinite(Number(n)) ? Number(n) : fallback;
  const clamped = Math.max(0, Math.min(255, Math.floor(value)));
  return Buffer.from([clamped]);
}

function ensureOptionalByte(value: unknown, label: string): void {
  if (value === undefined) return;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 255
  ) {
    throw new TypeError(
      `custom-vkp80iii ticketPresentation.${label} must be an integer between 0 and 255`
    );
  }
}

export const customVkp80iiiProfile: PrinterProfile = {
  id: 'custom-vkp80iii',
  name: 'CUSTOM VKP80III',
  description: 'CUSTOM VKP80III LAT/REAR/ETH (VKP80II emulation). Paper 50–82.5 mm.',
  defaultPaperWidth: 48,
  paperWidths: [42, 48, 56],
  codepages: {
    'utf8': 255,
    'ascii': 0,
    'cp437': 0,
    'cp850': 2,
    'cp860': 3,
    'latin1': 2,
  },
  commandsOverride: {
    PAPER: {
      PAPER_FULL_CUT: Buffer.from('1D5600', 'hex'),
      PAPER_PART_CUT: Buffer.from('1D5601', 'hex'),
      PAPER_CUT_A: Buffer.from('1D5641', 'hex'),
      PAPER_CUT_B: Buffer.from('1D5642', 'hex'),
    },
    /**
     * VKP80III 1D barcode (CUSTOM_COMMANDS.pdf p.61–64): GS k m [...].
     * Format 1: m 0x00–0x08, 0x14 (CODE32). Format 2: m 0x41–0x49, 0x5A (CODE32).
     * We use Format 1 for all types; CODE93/CODE128 use Format 2 (0x48/0x49) in driver (length-prefixed).
     * GS w n: 0x01–0x06 (default 0x03). GS h n: height in dots (default 0xA2); we use 0x3C.
     */
    BARCODE_FORMAT: {
      BARCODE_TXT_OFF: Buffer.from('1D4800', 'hex'),
      BARCODE_TXT_ABV: Buffer.from('1D4801', 'hex'),
      BARCODE_TXT_BLW: Buffer.from('1D4802', 'hex'),
      BARCODE_TXT_BTH: Buffer.from('1D4803', 'hex'),
      BARCODE_FONT_A: Buffer.from('1D6600', 'hex'),
      BARCODE_FONT_B: Buffer.from('1D6601', 'hex'),
      BARCODE_WIDTH: {
        1: Buffer.from('1D7701', 'hex'), // 0.125 mm
        2: Buffer.from('1D7702', 'hex'), // 0.25 mm
        3: Buffer.from('1D7703', 'hex'), // 0.375 mm (default)
        4: Buffer.from('1D7704', 'hex'), // 0.5 mm
        5: Buffer.from('1D7705', 'hex'), // 0.625 mm
      },
      BARCODE_WIDTH_DEFAULT: Buffer.from('1D7703', 'hex'),
      BARCODE_HEIGHT_DEFAULT: Buffer.from('1D683C', 'hex'),
      BARCODE_UPC_A: Buffer.from('1D6B00', 'hex'),
      BARCODE_UPC_E: Buffer.from('1D6B01', 'hex'),
      BARCODE_EAN13: Buffer.from('1D6B02', 'hex'),
      BARCODE_EAN8: Buffer.from('1D6B03', 'hex'),
      BARCODE_CODE39: Buffer.from('1D6B04', 'hex'),
      BARCODE_ITF: Buffer.from('1D6B05', 'hex'),
      BARCODE_NW7: Buffer.from('1D6B06', 'hex'),
      BARCODE_CODABAR: Buffer.from('1D6B06', 'hex'),
      BARCODE_CODE93: Buffer.from('1D6B48', 'hex'),
      BARCODE_CODE128: Buffer.from('1D6B49', 'hex'),
      BARCODE_CODE32: Buffer.from('1D6B14', 'hex'),
    },
    CODE2D_FORMAT: {
      GS_H: Buffer.from('1D286B', 'hex'),
    },
  },
  getPaperWidthCommand(widthChars: number): Buffer | undefined {
    const n = charsToMotionUnits(widthChars);
    const nL = n & 0xff;
    const nH = (n >> 8) & 0xff;
    return Buffer.from([0x1d, 0x57, nL, nH]);
  },
  /** FS P (p.301): cut + ticket presentation. a=0x14 (20×5mm), b=0x01 (LED blink), c=0x45 (Eject), d=0x0A (10s). */
  paperEjectAfterCut: Buffer.from('1C501401450A', 'hex'),
  /** FS P includes the cut; do not send GS V before it. */
  ejectCommandIncludesCut: true,
  validateTicketPresentationOptions(options?: TicketPresentationOptions): void {
    const vkp = (options ?? {}) as Vkp80iiiTicketPresentationOptions;
    ensureOptionalByte(vkp.paramA, 'paramA');
    ensureOptionalByte(vkp.paramB, 'paramB');
    ensureOptionalByte(vkp.paramC, 'paramC');
    ensureOptionalByte(vkp.paramD, 'paramD');
  },
  getTicketPresentationCommand(options?: TicketPresentationOptions): Buffer | undefined {
    const vkp = (options ?? {}) as Vkp80iiiTicketPresentationOptions;
    const a = toByte(vkp.paramA, 0x14);
    const b = toByte(vkp.paramB, 0x01);
    const c = toByte(vkp.paramC, 0x45);
    const d = toByte(vkp.paramD, 0x0a);
    return Buffer.concat([Buffer.from([0x1c, 0x50]), a, b, c, d]);
  },
  /**
   * Recovery baseline for VKP80III in ESC/POS mode.
   * Keep it non-destructive: no cut/present commands (FS P) here.
   */
  buildRecoverCommand: ({ commands }): Buffer =>
    Buffer.concat([
      commands.HARDWARE.HW_INIT, // ESC @
      commands.TEXT_FORMAT.TXT_ALIGN_LT, // ESC a 0
      commands.LINE_SPACING.LS_DEFAULT, // ESC 2
      commands.TEXT_FORMAT.TXT_NORMAL, // ESC ! 0
      commands.TEXT_FORMAT.TXT_FONT_A, // ESC M 0
      commands.TEXT_FORMAT.TXT_UNDERL_OFF, // ESC - 0
    ]),
};

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
    BARCODE_FORMAT: {
      BARCODE_WIDTH_DEFAULT: Buffer.from('1D7703', 'hex'),
      BARCODE_HEIGHT_DEFAULT: Buffer.from('1D683C', 'hex'),
      BARCODE_FONT_A: Buffer.from('1D6600', 'hex'),
      BARCODE_TXT_BLW: Buffer.from('1D4802', 'hex'),
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

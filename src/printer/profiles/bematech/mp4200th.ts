/**
 * Bematech MP-4200 TH profile.
 *
 * The programming manual describes ESC/Bematech and ESC/POS operation modes.
 * This library targets ESC/POS mode for interoperability with the generic command set.
 *
 * Notes:
 * - No ticket presenter/eject command is configured here.
 * - `presentTicket(...)` will gracefully fallback to generic `cut(...)`.
 */

import type { PrinterProfile } from '../types';

function buildPdf417GsK(code: string): Buffer {
  const cmd = Buffer.from('1D286B', 'hex');
  const data = Buffer.from(String(code), 'utf8');
  const len = data.length + 3;
  const pL = len & 0xff;
  const pH = (len >> 8) & 0xff;
  return Buffer.concat([
    // fn=65: columns = auto
    cmd, Buffer.from([0x03, 0x00, 0x30, 0x41, 0x00]),
    // fn=66: rows = auto (manual indicates auto-only)
    cmd, Buffer.from([0x03, 0x00, 0x30, 0x42, 0x00]),
    // fn=67: module width default = 3
    cmd, Buffer.from([0x03, 0x00, 0x30, 0x43, 0x03]),
    // fn=68: row height default = 3
    cmd, Buffer.from([0x03, 0x00, 0x30, 0x44, 0x03]),
    // fn=69: error correction default = ratio mode (m=49), n=1
    cmd, Buffer.from([0x04, 0x00, 0x30, 0x45, 0x31, 0x01]),
    // fn=70: options = standard (n=0)
    cmd, Buffer.from([0x03, 0x00, 0x30, 0x46, 0x00]),
    // fn=80: store data
    cmd, Buffer.from([pL, pH, 0x30, 0x50, 0x30]), data,
    // fn=81: print symbol
    cmd, Buffer.from([0x03, 0x00, 0x30, 0x51, 0x30]),
  ]);
}

export const bematechMp4200thProfile: PrinterProfile = {
  id: 'bematech-mp4200th',
  name: 'Bematech MP-4200 TH',
  description: 'Bematech MP-4200 TH in ESC/POS mode.',
  defaultPaperWidth: 48,
  paperWidths: [42, 48, 56, 64],
  codepages: {
    'ascii': 0,
    'cp437': 0,
    'cp850': 2,
    'cp860': 3,
    'latin1': 2,
  },
  commandsOverride: {
    TEXT_FORMAT: {
      // ESC M n for MP-4200 TH is documented with n=0/1.
      // Keep font C aliasing to a supported value to avoid sending n=2.
      TXT_FONT_C: Buffer.from('1B4D00', 'hex'),
    },
    BARCODE_FORMAT: {
      // MP-4200 TH ESC/POS manual:
      // GS w n default is n=3 and GS h n default is n=192.
      BARCODE_WIDTH_DEFAULT: Buffer.from('1D7703', 'hex'),
      BARCODE_HEIGHT_DEFAULT: Buffer.from('1D68C0', 'hex'),
    },
  },
  buildCode2d(code, type): Buffer | undefined {
    if (type === 'PDF417') return buildPdf417GsK(code);
    if (type === 'QR') {
      throw new Error(
        'For bematech-mp4200th use qrcode(...) with strategy native/raster/auto; code2d("QR") is not used by this profile.'
      );
    }
    return undefined;
  },
  buildRecoverCommand: ({ commands }): Buffer =>
    Buffer.concat([
      commands.HARDWARE.HW_INIT, // ESC @
      commands.TEXT_FORMAT.TXT_ALIGN_LT, // ESC a 0
      commands.LINE_SPACING.LS_DEFAULT, // ESC 2
      commands.TEXT_FORMAT.TXT_NORMAL, // ESC ! 0
      commands.TEXT_FORMAT.TXT_FONT_A, // enforce documented baseline font
      commands.TEXT_FORMAT.TXT_UNDERL_OFF,
    ]),
  // In field deployments, native QR support depends on firmware/configuration.
  // Use raster QR by default for robust behavior; callers can force native with { strategy: 'native' }.
  qrCodeStrategy: 'auto',
  supportsNativeQrCode: false,
};

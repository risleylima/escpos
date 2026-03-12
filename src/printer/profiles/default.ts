/**
 * Default ESC/POS profile (generic, model-agnostic).
 * Use this when the printer follows standard ESC/POS or when the model is unknown.
 */

import type { PrinterProfile } from './types';

export const defaultProfile: PrinterProfile = {
  id: 'default',
  name: 'ESC/POS Standard',
  description: 'Generic ESC/POS; compatible with most thermal printers.',
  defaultPaperWidth: 80,
  paperWidths: [42, 48, 56, 72, 80],
  buildRecoverCommand: ({ commands }) =>
    Buffer.concat([
      commands.HARDWARE.HW_INIT, // ESC @
      commands.TEXT_FORMAT.TXT_ALIGN_LT, // ESC a 0
      commands.LINE_SPACING.LS_DEFAULT, // ESC 2
      commands.TEXT_FORMAT.TXT_NORMAL, // ESC ! 0
      commands.TEXT_FORMAT.TXT_BOLD_OFF,
      commands.TEXT_FORMAT.TXT_UNDERL_OFF,
    ]),
};

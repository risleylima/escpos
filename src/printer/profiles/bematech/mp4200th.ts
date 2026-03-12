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

export const bematechMp4200thProfile: PrinterProfile = {
  id: 'bematech-mp4200th',
  name: 'Bematech MP-4200 TH',
  description: 'Bematech MP-4200 TH in ESC/POS mode.',
  defaultPaperWidth: 48,
  paperWidths: [42, 48, 56, 64],
  codepages: {
    'utf8': 255,
    'ascii': 0,
    'cp437': 0,
    'cp850': 2,
    'cp860': 3,
    'latin1': 2,
  },
};

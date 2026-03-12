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
};

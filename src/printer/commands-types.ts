/**
 * Strong types for the ESC/POS command set.
 * Used by Printer to avoid weak casts (as unknown as Record<string, Buffer>).
 */

import type { commands } from './commands';

/** Command set shape (inferred from commands). */
export type CommandSet = typeof commands;

// ─── Feed control sequences (control()) ─────────────────────────────────────
export const FEED_CONTROL_KEYS = ['CTL_LF', 'CTL_GLF', 'CTL_FF', 'CTL_CR', 'CTL_HT', 'CTL_VT'] as const;
export type FeedControlKey = (typeof FEED_CONTROL_KEYS)[number];

// ─── Text format – alignment (align()) ──────────────────────────────────────
export const ALIGN_KEYS = ['TXT_ALIGN_LT', 'TXT_ALIGN_CT', 'TXT_ALIGN_RT'] as const;
export type AlignKey = (typeof ALIGN_KEYS)[number];

// ─── Text format – font (font()) ───────────────────────────────────────────
export const FONT_KEYS = ['TXT_FONT_A', 'TXT_FONT_B', 'TXT_FONT_C'] as const;
export type FontKey = (typeof FONT_KEYS)[number];

// ─── Hardware (hardware()) ─────────────────────────────────────────────────
export const HARDWARE_KEYS = ['HW_INIT', 'HW_SELECT', 'HW_RESET'] as const;
export type HardwareKey = (typeof HARDWARE_KEYS)[number];

// ─── Bitmap density (image()) ───────────────────────────────────────────────
export const BITMAP_DENSITY_KEYS = ['BITMAP_S8', 'BITMAP_D8', 'BITMAP_S24', 'BITMAP_D24'] as const;
export type BitmapDensityKey = (typeof BITMAP_DENSITY_KEYS)[number];

// ─── Raster mode (raster()) ─────────────────────────────────────────────────
export const GSV0_MODE_KEYS = ['GSV0_NORMAL', 'GSV0_DW', 'GSV0_DH', 'GSV0_DWDH'] as const;
export type Gsv0ModeKey = (typeof GSV0_MODE_KEYS)[number];

// ─── Cash drawer (cashdraw()) ──────────────────────────────────────────────
export const CASH_DRAWER_KEYS = ['CD_KICK_2', 'CD_KICK_5'] as const;
export type CashDrawerKey = (typeof CASH_DRAWER_KEYS)[number];

// ─── Barcode format keys (string-based lookup; validated at runtime) ────────
export type BarcodeWidthIndex = 1 | 2 | 3 | 4 | 5;

/** Narrow FEED_CONTROL_SEQUENCES key from string. Returns undefined if invalid. */
export function getFeedControlKey(ctrl: string): FeedControlKey | undefined {
  const key = 'CTL_' + ctrl.toUpperCase();
  return FEED_CONTROL_KEYS.includes(key as FeedControlKey) ? (key as FeedControlKey) : undefined;
}

/** Narrow TEXT_FORMAT alignment key from string. */
export function getAlignKey(align: string): AlignKey | undefined {
  const key = 'TXT_ALIGN_' + align.toUpperCase();
  return ALIGN_KEYS.includes(key as AlignKey) ? (key as AlignKey) : undefined;
}

/** Narrow TEXT_FORMAT font key from string. */
export function getFontKey(family: string): FontKey | undefined {
  const key = 'TXT_FONT_' + family.toUpperCase();
  return FONT_KEYS.includes(key as FontKey) ? (key as FontKey) : undefined;
}

/** Narrow HARDWARE key from string. */
export function getHardwareKey(hw: string): HardwareKey | undefined {
  const key = 'HW_' + hw.toUpperCase();
  return HARDWARE_KEYS.includes(key as HardwareKey) ? (key as HardwareKey) : undefined;
}

/** Narrow BITMAP_FORMAT key from density string. */
export function getBitmapDensityKey(density: string): BitmapDensityKey | undefined {
  const key = 'BITMAP_' + density.toUpperCase();
  return BITMAP_DENSITY_KEYS.includes(key as BitmapDensityKey) ? (key as BitmapDensityKey) : undefined;
}

/** Narrow GSV0_FORMAT key from mode string. */
export function getGsv0ModeKey(mode: string): Gsv0ModeKey | undefined {
  const key = 'GSV0_' + mode.toUpperCase();
  return GSV0_MODE_KEYS.includes(key as Gsv0ModeKey) ? (key as Gsv0ModeKey) : undefined;
}

/** Cash drawer key from pin. */
export function getCashDrawerKey(pin: 2 | 5): CashDrawerKey {
  return pin === 2 ? 'CD_KICK_2' : 'CD_KICK_5';
}

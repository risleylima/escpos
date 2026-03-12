/**
 * Types for the printer profile system.
 * Profiles allow model-specific command sets and paper width handling
 * while keeping the Printer API agnostic.
 */

import type { CommandSet as CommandSetType } from '../commands-types';

/** Full command set shape (same as default commands.ts). */
export type CommandSet = CommandSetType;

/**
 * One-level deep override: top-level keys can be replaced,
 * and nested objects (e.g. PAPER, TEXT_FORMAT) can be partially overridden.
 */
export type CommandSetOverride = {
  [K in keyof CommandSet]?: CommandSet[K] extends Buffer
    ? Buffer
    : CommandSet[K] extends (...args: unknown[]) => unknown
      ? CommandSet[K]
      : CommandSet[K] extends object
        ? Partial<CommandSet[K]>
        : CommandSet[K];
};

/**
 * Optional hook to send a paper width command to the printer.
 * Some models use GS W (1D 57) or similar; return undefined to only set width in software.
 */
export type PaperWidthCommandFn = (widthChars: number) => Buffer | undefined;

/** Generic model-specific options bag for ticket presentation. */
export type TicketPresentationOptions = Record<string, unknown>;
export interface BarcodeOptions {
  width?: number;
  height?: number;
  position?: string;
  font?: string;
  includeParity?: boolean;
}

export interface QrCodeOptions {
  model?: number;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
}

export interface BarcodeBuildContext {
  commands: CommandSet;
  getParityBit: (code: string) => string;
  codeLength: (code: string) => Buffer;
}

export interface QrCodeBuildContext {
  commands: CommandSet;
}

export interface PrinterProfile {
  /** Unique id (e.g. 'default', 'custom-vkp80iii'). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Short description of the model/family. */
  description?: string;
  /** Default paper width in characters when not specified in options. */
  defaultPaperWidth?: number;
  /** Supported paper widths for this model (for validation/warnings). */
  paperWidths?: number[];
  /**
   * Overrides to the default ESC/POS command set.
   * Omitted keys fall back to the default commands.
   */
  commandsOverride?: CommandSetOverride;
  /**
   * If set, called when paper width is changed so the printer can receive a model-specific command.
   */
  getPaperWidthCommand?: PaperWidthCommandFn;
  /**
   * If set, sent after feed (and after cut, unless ejectCommandIncludesCut) to deliver/release the ticket.
   * Semantics are model-specific.
   */
  paperEjectAfterCut?: Buffer;
  /**
   * If true, paperEjectAfterCut performs the cut itself.
   * cut() will then send only feed (ESC d n) + paperEjectAfterCut, and will NOT send PAPER_FULL_CUT/PART_CUT.
   */
  ejectCommandIncludesCut?: boolean;
  /**
   * Optional profile-specific builder for ticket presentation command.
   * This enables a high-level API while keeping model bytes inside the profile.
   */
  getTicketPresentationCommand?: (options?: TicketPresentationOptions) => Buffer | undefined;
  /**
   * Optional validator for ticket presentation options.
   * Throw to reject invalid values for the current model.
   */
  validateTicketPresentationOptions?: (options?: TicketPresentationOptions) => void;
  /**
   * Optional profile-specific barcode command builder.
   * Return Buffer to fully override default barcode behavior.
   */
  buildBarcode?: (
    code: string,
    type: string,
    options: BarcodeOptions | undefined,
    context: BarcodeBuildContext
  ) => Buffer | undefined;
  /**
   * Optional profile-specific QR command builder.
   * Return Buffer to fully override default QR behavior.
   */
  buildQrCode?: (
    code: string,
    options: QrCodeOptions | undefined,
    context: QrCodeBuildContext
  ) => Buffer | undefined;
  /**
   * Mapping of encoding name to codepage number (ESC t n).
   * Example: { 'utf8': 255, 'cp860': 3 }
   */
  codepages?: Record<string, number>;
}

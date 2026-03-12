/**
 * Printer profile registry.
 * Register model-specific profiles and resolve them by id.
 */

import { mergeCommands } from './merge';
import type { CommandSet, PrinterProfile } from './types';
import { defaultProfile } from './default';
import { customVkp80iiiProfile } from './custom/vkp80iii';
import { bematechMp4200thProfile } from './bematech/mp4200th';

export interface ProfileRegistry {
  registerProfile(profile: PrinterProfile, options?: { overwrite?: boolean }): void;
  getProfile(id: string): PrinterProfile | undefined;
  getCommandsForProfile(profile: PrinterProfile): CommandSet;
  listProfiles(): { id: string; name: string }[];
}

function cloneProfile(profile: PrinterProfile): PrinterProfile {
  return {
    ...profile,
    paperWidths: profile.paperWidths ? [...profile.paperWidths] : undefined,
    codepages: profile.codepages ? { ...profile.codepages } : undefined,
    commandsOverride: profile.commandsOverride
      ? ({ ...profile.commandsOverride } as PrinterProfile['commandsOverride'])
      : undefined,
  };
}

function createRegistry(): ProfileRegistry {
  const registry = new Map<string, PrinterProfile>();

  return {
    registerProfile(profile: PrinterProfile, options?: { overwrite?: boolean }): void {
      if (!profile || typeof profile !== 'object') {
        throw new TypeError('registerProfile(profile): profile must be an object');
      }
      if (typeof profile.id !== 'string' || profile.id.trim() === '') {
        throw new TypeError('registerProfile(profile): profile.id must be a non-empty string');
      }
      if (typeof profile.name !== 'string' || profile.name.trim() === '') {
        throw new TypeError('registerProfile(profile): profile.name must be a non-empty string');
      }

      const id = profile.id.trim();
      const overwrite = options?.overwrite === true;
      if (!overwrite && registry.has(id)) {
        throw new Error(`Profile "${id}" is already registered.`);
      }

      registry.set(id, cloneProfile({ ...profile, id }));
    },

    getProfile(id: string): PrinterProfile | undefined {
      const profile = registry.get(id);
      return profile ? cloneProfile(profile) : undefined;
    },

    getCommandsForProfile(profile: PrinterProfile): CommandSet {
      return mergeCommands(profile.commandsOverride);
    },

    listProfiles(): { id: string; name: string }[] {
      return Array.from(registry.values()).map((p) => ({ id: p.id, name: p.name }));
    },
  };
}

export function createProfileRegistry(initialProfiles: PrinterProfile[] = []): ProfileRegistry {
  const created = createRegistry();
  for (const profile of initialProfiles) {
    created.registerProfile(profile);
  }
  return created;
}

const defaultRegistry = createProfileRegistry([
  defaultProfile,
  customVkp80iiiProfile,
  bematechMp4200thProfile,
]);

export function registerProfile(profile: PrinterProfile, options?: { overwrite?: boolean }): void {
  defaultRegistry.registerProfile(profile, options);
}

/**
 * Returns a profile by id, or undefined if not found.
 */
export function getProfile(id: string): PrinterProfile | undefined {
  return defaultRegistry.getProfile(id);
}

/**
 * Returns the effective command set for a profile (default merged with overrides).
 */
export function getCommandsForProfile(profile: PrinterProfile): CommandSet {
  return defaultRegistry.getCommandsForProfile(profile);
}

/**
 * Lists all registered profile ids and names.
 */
export function listProfiles(): { id: string; name: string }[] {
  return defaultRegistry.listProfiles();
}

export type {
  PrinterProfile,
  CommandSet,
  CommandSetOverride,
  PaperWidthCommandFn,
  TicketPresentationOptions,
  BarcodeOptions,
  QrCodeOptions,
  BarcodeBuildContext,
  QrCodeBuildContext,
} from './types';
export { defaultProfile } from './default';
export { customVkp80iiiProfile } from './custom/vkp80iii';
export { bematechMp4200thProfile } from './bematech/mp4200th';
export type { Vkp80iiiTicketPresentationOptions } from './custom/vkp80iii';

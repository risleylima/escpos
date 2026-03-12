/**
 * Merges the default command set with profile overrides.
 * Nested objects (e.g. PAPER, TEXT_FORMAT) are merged one level deep.
 */

import { commands as defaultCommands } from '../commands';
import type { CommandSet, CommandSetOverride } from './types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Buffer.isBuffer(v);
}

function cloneNode<T>(value: T): T {
  if (Buffer.isBuffer(value)) return Buffer.from(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => cloneNode(item)) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = cloneNode(v);
    }
    return out as T;
  }
  return value;
}

function deepFreezeObject<T>(value: T): T {
  if (Buffer.isBuffer(value) || value === null) return value;
  if (typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeObject(child);
  }
  return value;
}

export function mergeCommands(override: CommandSetOverride | undefined): CommandSet {
  if (!override || Object.keys(override).length === 0) {
    return deepFreezeObject(cloneNode(defaultCommands)) as CommandSet;
  }
  const result = cloneNode(defaultCommands) as Record<string, unknown>;
  for (const key of Object.keys(override) as (keyof CommandSet)[]) {
    const o = override[key];
    if (o === undefined) continue;
    const d = (defaultCommands as Record<string, unknown>)[key];
    if (isPlainObject(d) && isPlainObject(o) && typeof (d as { length?: number }).length !== 'number') {
      (result as Record<string, unknown>)[key] = { ...cloneNode(d), ...cloneNode(o) };
    } else {
      (result as Record<string, unknown>)[key] = cloneNode(o);
    }
  }
  return deepFreezeObject(result) as CommandSet;
}

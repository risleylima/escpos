# Profile Contract (Generic Extension Standard)

This is the canonical contract for adding support for new printer models.

## Purpose

- Keep `Printer` API stable and generic.
- Isolate model-specific behavior inside profile modules.
- Allow incremental support: command overrides first, algorithm hooks when needed.

## Minimum profile contract

Each model profile must implement:

- `id`: unique stable identifier.
- `name`: display name.

Optional but recommended:

- `description`
- `defaultPaperWidth`
- `paperWidths`
- `commandsOverride`

## Extension points

### 1) Byte-level command overrides

Use `commandsOverride` to replace command constants (e.g. cut, barcode defaults, QR header).

### 2) Paper width command

Use `getPaperWidthCommand(widthChars)` for model-specific hardware width commands.

### 3) Ticket presentation

Use:

- `paperEjectAfterCut`
- `ejectCommandIncludesCut`
- `getTicketPresentationCommand(options?)`
- `validateTicketPresentationOptions(options?)`

This allows `Printer.presentTicket(...)` and `Printer.cut(...)` to stay generic.

Important:

- Ticket presentation is model-specific and optional.
- Do NOT implement these hooks for models that do not support presenter/eject commands
  (for example, many standard ESC/POS printers such as Bematech MP4200TH).
- When not implemented, `presentTicket(...)` gracefully falls back to generic `cut(...)`.

### 4) Algorithm hooks (advanced)

For models that require non-standard payload assembly:

- `buildBarcode(code, type, options, context)`
- `buildQrCode(code, options, context)`

If a hook returns a `Buffer`, it fully overrides the default `Printer` implementation for that operation.

## Runtime registration

Profiles can be registered at runtime using:

```ts
registerProfile(profile);
```

For multi-tenant or isolated runtime contexts, prefer:

```ts
const registry = createProfileRegistry([defaultProfile]);
const p = new Printer(adapter, { profile: 'default', profileRegistry: registry });
```

Rules:

- Duplicate ids are rejected by default.
- Use `registerProfile(profile, { overwrite: true })` only when intentional.
- `Printer` now fails fast when a `profile` string cannot be resolved in the selected registry.

## Recommended implementation flow for a new model

1. Start with `commandsOverride`.
2. Validate real prints for cut/presentation/barcode/QR.
3. Add `getTicketPresentationCommand` if presenter differs.
4. Add `buildBarcode`/`buildQrCode` only if byte overrides are not enough.
5. Add unit tests for every model-specific hook and critical command hex.

## Test checklist

- Profile is retrievable by id.
- Merged command set contains intended overrides.
- `presentTicket()` emits expected sequence.
- Barcode and QR hooks (if any) are called and override default path.
- Unknown/missing options fail fast via `validateTicketPresentationOptions` (only for models
  that implement ticket presentation hooks).

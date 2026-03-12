# Bematech MP-4200 TH Profile Guide

This document explains the `bematech-mp4200th` profile and how it fits in parallel with `custom-vkp80iii`.

## Scope

- Target printer: Bematech MP-4200 TH.
- Operating mode in this library: ESC/POS mode.
- Strategy: keep generic ESC/POS commands, with no presenter/eject specialization.

## Why this profile exists

- Keep model identity explicit (`id`, `name`, paper width expectations).
- Allow future Bematech-specific command hooks without changing application code.
- Maintain a clean parallel profile catalog (e.g. VKP80III and MP-4200 TH).

## Current behavior

- `id`: `bematech-mp4200th`
- `defaultPaperWidth`: `48`
- `paperWidths`: `[42, 48]`
- No `ticketPresentation` hooks:
  - no `getTicketPresentationCommand`
  - no `paperEjectAfterCut`
  - no `ejectCommandIncludesCut`

Because of that:

- `presentTicket(...)` falls back to generic `cut(...)`.
- `cut(...)` follows standard ESC/POS path.

## Usage

```ts
const printer = new Printer(adapter, {
  profile: 'bematech-mp4200th',
  encoding: 'ascii',
  width: 48
});
```

## Future evolution checklist

- Validate model-specific constraints directly from MP-4200 TH programming manual.
- Add command overrides only when there is a confirmed byte-level difference.
- Add profile hooks (`buildBarcode`, `buildQrCode`, etc.) only if generic flow is insufficient.

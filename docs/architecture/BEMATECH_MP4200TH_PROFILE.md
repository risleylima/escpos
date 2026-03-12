# Bematech MP-4200 TH Profile Guide

This document explains the `bematech-mp4200th` profile and how it fits in parallel with `custom-vkp80iii`.

## Scope

- Target printer: Bematech MP-4200 TH.
- Operating mode in this library: ESC/POS mode.
- Strategy: keep generic ESC/POS flow, adding explicit hooks only where field behavior differs.

## Why this profile exists

- Keep model identity explicit (`id`, `name`, paper width expectations).
- Encapsulate Bematech-specific behavior (font/barcode baseline, QR strategy, recover baseline).
- Maintain a clean parallel profile catalog (e.g. VKP80III and MP-4200 TH).

## Current behavior

- `id`: `bematech-mp4200th`
- `defaultPaperWidth`: `48`
- `paperWidths`: `[42, 48, 56, 64]`
- `codepages`: explicit map for `ascii`, `cp437`, `cp850`, `cp860`, `latin1`
- No `ticketPresentation` hooks:
  - no `getTicketPresentationCommand`
  - no `paperEjectAfterCut`
  - no `ejectCommandIncludesCut`
- `buildCode2d(...)`:
  - `PDF417`: profile-specific `GS ( k` sequence
  - `QR`: intentionally rejected in `code2d("QR")`; use `qrcode(...)` strategies instead
- `buildRecoverCommand(...)`:
  - non-destructive runtime reset (`ESC @`, align left, default line spacing, normal text, font A, underline off)
- QR defaults:
  - `qrCodeStrategy: 'auto'`
  - `supportsNativeQrCode: false` (conservative default for field reliability)

Because of that:

- `presentTicket(...)` falls back to generic `cut(...)`.
- `cut(...)` follows standard ESC/POS path.
- `qrcode(..., { strategy: 'auto' })` resolves to raster path for safer interoperability.

## Usage

```ts
const printer = new Printer(adapter, {
  profile: 'bematech-mp4200th',
  encoding: 'ascii',
  width: 48
});
```

For QR in production:

```ts
printer.qrcode('https://example.local', { strategy: 'auto' });   // recommended default
printer.qrcode('https://example.local', { strategy: 'native' }); // force native when validated
printer.qrcode('https://example.local', { strategy: 'raster' }); // force raster fallback
```

## Future evolution checklist

- Validate model-specific constraints directly from MP-4200 TH programming manual.
- Add command overrides only when there is a confirmed byte-level difference.
- Keep recover flow non-destructive and side-effect free.
- Add more profile-specific hooks (`buildBarcode`, `buildQrCode`) only if generic flow is insufficient.

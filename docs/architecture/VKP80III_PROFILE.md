# VKP80III Profile Guide (AI-Friendly)

This document explains how `custom-vkp80iii` maps generic ESC/POS APIs to CUSTOM VKP80III behavior.

## 1) Goals

- Keep `Printer` API generic (`cut`, `barcode`, `qrcode`, etc.).
- Keep model-specific bytes inside the profile.
- Expose high-level ticket presentation with tunable options.
- Keep this implementation isolated to VKP80III; other models can ignore ticket presentation hooks.

## 2) Core Mapping

### Paper presentation

- Generic API: `printer.presentTicket(...)` or `printer.cut(...)`
- VKP80III command: `FS P` (`1C 50 a b c d`)
- Default bytes used by profile: `1C 50 14 01 45 0A`
- Profile flags:
  - `ejectCommandIncludesCut: true`
  - Means: when presenting ticket, we do **not** send `GS V` cut before `FS P`.

### Barcode defaults for VKP80III profile

- Width default: `1D 77 03`
- Height default: `1D 68 3C`
- Font A: `1D 66 00`
- Text below: `1D 48 02`

### QR command family

- Profile override uses `GS ( k` header: `1D 28 6B`
- This is set in `CODE2D_FORMAT.GS_H` for `custom-vkp80iii`.

## 3) New High-Level Options

`PrinterOptions` now accepts:

```ts
{
  profile: 'custom-vkp80iii',
  ticketPresentation: {
    paramA?: number,
    paramB?: number,
    paramC?: number,
    paramD?: number
  }
}
```

These map directly to `FS P a b c d`.

### VKP80III default set

- `paramA = 0x14`
- `paramB = 0x01`
- `paramC = 0x45`
- `paramD = 0x0A`

## 4) New High-Level API

`Printer.presentTicket(options?)`

```ts
printer.presentTicket({
  feed: 3,   // ESC d n before presentation
  part: true,
  paramA: 0x14,
  paramB: 0x01,
  paramC: 0x45,
  paramD: 0x0A
});
```

Behavior:

- If profile supports ticket presentation command:
  - send optional feed (`ESC d n`)
  - send optional cut only when needed by profile
  - send presentation command (`FS P ...`)
- If profile does not support it:
  - fallback to `cut(part, feed)`

Note:

- This feature is intentionally optional in the global profile contract.
- Example: a printer like Bematech MP4200TH typically uses generic `cut(...)` only.

## 5) EAN handling update

For better real-world compatibility:

- `EAN13` accepts `12` or `13` digits
- `EAN8` accepts `7` or `8` digits
- parity is auto-appended only for incomplete inputs (`12` for EAN13, `7` for EAN8)

## 6) Recommended usage

Use this when printer is VKP80III:

```ts
const printer = new Printer(adapter, {
  encoding: 'ascii',
  width: 48,
  profile: 'custom-vkp80iii',
  ticketPresentation: { paramA: 0x14, paramB: 0x01, paramC: 0x45, paramD: 0x0A }
});
```

Then:

```ts
printer
  .textln('Ticket demo')
  .barcode('789123456789', 'EAN13', { includeParity: true })
  .presentTicket({ feed: 3 });
```

## 7) Debug checklist

- Keep width aligned to the profile baseline (`48` chars by default).
- Prefer ASCII in price formatting (`R$ 47,90`) to avoid codepage artifacts.
- Add a short linger before socket close after flush (example: `1500-3000ms`) when presenter timing is sensitive.

## 8) Recover baseline

`custom-vkp80iii` also implements `buildRecoverCommand(...)` to restore a safe ESC/POS baseline after transport/protocol errors.

Recover flow intentionally avoids side effects:

- Includes baseline reset (`ESC @`, align left, default line spacing, normal text, font A, underline off).
- Does **not** include `FS P` (present/cut side effects are not part of recover).

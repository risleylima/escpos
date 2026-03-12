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

### 1D Barcode (CUSTOM_COMMANDS.pdf p.57–64)

VKP80III supports **GS k** (1D 6B) with two formats. The profile aligns all types to the manual:

| Type       | Format 1 (m) | Format 2 (m) | Notes                    |
|-----------|---------------|--------------|--------------------------|
| UPC-A     | 0x00          | 0x41         | 11–12 digits             |
| UPC-E     | 0x01          | 0x42         | 11–12 digits             |
| EAN13     | 0x02          | 0x43         | 12–13 digits             |
| EAN8      | 0x03          | 0x44         | 7–8 digits               |
| CODE39    | 0x04          | 0x45         |                          |
| ITF       | 0x05          | 0x46         | Even number of digits    |
| CODABAR/NW7 | 0x06        | 0x47         |                          |
| CODE93    | 0x07          | 0x48         | Driver uses Format 2     |
| CODE128   | 0x08          | 0x49         | Driver uses Format 2     |
| CODE32    | 0x14          | 0x5A         | Italian pharmacy, 8–9 digits |

- **GS w** (width): n = 0x01–0x06 (default 0x03). Profile maps width 1–5 to 0x01–0x05.
- **GS h** (height): default in manual 0xA2; profile uses `1D 68 3C` (60 dots).
- **GS H** (HRI position): OFF, ABV, BLW, BTH. Profile sets all four.
- **GS f** (HRI font): A (0x00), B (0x01). Profile sets both.
- **CODE93/CODE128 payload framing**: driver uses Format 2 (`m=0x48/0x49`) with length byte and no trailing `NUL`.
- **CODE128 code set**: if payload does not start with `{A`, `{B`, or `{C`, driver auto-prefixes `{B`.

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

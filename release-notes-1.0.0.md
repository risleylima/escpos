# @risleylima/escpos v1.0.0

Primeira release estável 1.0.0: TypeScript-first, adapters reforçados, sistema de perfis e pipeline de imagens (GIF/SVG/PNG Adam7).

## Added
- Full TypeScript migration across public entrypoint, adapters, printer core, commands, image pipeline, and profiles.
- Network adapter implementation with open/write/read/close lifecycle and dedicated unit tests.
- Profile system expansion:
  - `custom-vkp80iii` and `bematech-mp4200th` model profiles
  - runtime registration and listing
  - isolated registry support via `createProfileRegistry(...)`
- Image loader improvements:
  - GIF support (first frame via `omggif`)
  - SVG support via internal rasterization before print pipeline
  - Data URI and Buffer input for `Image.load` / `loadImagePixels`
- PNG Adam7 (interlaced) decoding support.
- New tests for QR/Barcode behavior, adapter lifecycle, profile contract, and image loader parity.

## Changed
- QR Code flow aligned to ESC/POS `GS ( k` with official functions 165/167/169/180/181.
- Default profile paper width set to 80 columns; model-specific widths remain profile-driven.
- Printer reliability: transactional `flush()`, serialized I/O for `getStatus()`, fail-fast on unknown profile.
- Adapter resilience: timeouts and close-safety for Network/Serial/USB.
- Documentation restructured to `docs/architecture/*`.

## Fixed
- QR opcode/function mismatch that could fail on strict ESC/POS devices.
- Buffer-loss scenario during failed flush/write operations.
- Multiple lifecycle edge cases in adapters.

## Removed
- Legacy JavaScript source tree in favor of TypeScript.
- Root legacy `index.js` entrypoint.

---

**Install:** `npm install @risleylima/escpos`

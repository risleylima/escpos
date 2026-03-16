# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.6] - 2026-03-16

### Added
- **USB adapter read support:** When the printer exposes a USB IN endpoint, `read()` and `getStatus()` work. If no IN endpoint exists, `read()` throws with a clear message. Network and Serial always support read.
- **Documentation in pt-BR:** `README.pt-BR.md` and `docs/pt-BR/` with Portuguese translations of COMMANDS_API and COMMANDS_RECIPES. Links in main README and docs index for Brazilian developers.
- **SEO keywords:** `bematech`, `elgin`, `daruma`, `epson`, `pdv`, `node` in package.json for discoverability on npm and search engines.
- **Assets in package:** `assets/` folder added to package `files` for logo variants used by integrations and examples.
- **Encoding tests:** Unit tests for cp860, unknown encoding fallback, empty string, latin1 native path, and chars outside BMP (emoji).

### Changed
- **DRY refactoring:** SpecBuffer overflow logic extracted to `assertWithinLimit()`; `toBuffer()` helper for print/println; adapters use `writeInChunks()` and `recoverAfterClose()` base helpers; commands `CTL_LF` now references `LF` to avoid duplication.
- **Adapter documentation:** AdapterLike JSDoc updated to reflect USB read behavior (implements when IN endpoint exists, throws otherwise).
- **COMMANDS_API.md:** Note that `getStatus()` requires adapter read support (Network/Serial always; USB when device has IN endpoint).
- **examples/printTest.js:** Fixed to use adapter instance instead of class (correct lifecycle: connect, open, close, disconnect).
- **README:** Test badge updated to 239 passed; Reliability section updated.

### Fixed
- **Adapter recover deadlock:** Removed `synchronized` from adapter `recover()` overrides to prevent deadlock when recover called `close()` (which also uses synchronized).
- **SpecBuffer:** Consistent overflow handling between `write()` and `prepend()` via shared helper.

## [1.0.5] - 2026-03-12

### Added
- **iconv-lite** dependency for encodings not natively supported by Node (e.g. `cp850`, `cp860`).
- `encodeText()` in Printer: uses Node `Buffer` when encoding is supported, else `iconv.encode()` so text like "Paraná" prints correctly when the profile maps that encoding to the printer codepage.
- Unit test for cp850 encoding (e.g. Paraná → 0xA0) in Codepage Automation suite.
- COMMANDS_API.md: note that encodings such as cp850/cp860 are converted via iconv-lite.

### Changed
- `text()` and `textln()` now use the shared encoding path; setting `encoding: 'cp850'` (or `'cp860'`) with a profile that maps it to the correct `ESC t n` produces correct accented output on thermal printers (e.g. VKP80III).

### Fixed
- Encoding options like `cp850`/`cp860` previously had no effect (Node fallback to UTF-8); codepage command was sent but bytes were wrong, causing garbled text (e.g. "Parantí" instead of "Paraná"). Now bytes are correctly converted via iconv-lite.

## [1.0.4] - 2026-03-12

### Added
- Barcode compatibility tests for newly aligned VKP80III paths:
  - CODE32 acceptance/rejection by manual limits
  - CODABAR opcode assertion
  - CODE93/CODE128 format-2 framing checks
  - CODE128 auto code-set prefix behavior.

### Changed
- VKP80III profile barcode map completed from `CUSTOM_COMMANDS.pdf` (GS k / GS w / GS h / HRI):
  - explicit support mapping for CODABAR and CODE32
  - explicit GS w width map (1..5 -> 0x01..0x05) with VKP80III defaults.
- Command API docs and VKP80III profile guide expanded with complete barcode type coverage and framing notes.

### Fixed
- `barcode()` framing for CODE93/CODE128 now correctly follows GS k format 2 (length-prefixed payload with no trailing NUL).
- CODE128 now auto-injects `{B` when no initial code set marker is provided, preventing `HRI NOT OK` on strict firmware.
- CODE32 now validates 8-9 numeric digits and emits proper command path.

## [1.0.3] - 2026-03-12

### Added
- Comprehensive command abstraction documentation:
  - `docs/architecture/COMMANDS_API.md` (method-by-method reference)
  - `docs/architecture/COMMANDS_RECIPES.md` (practical usage patterns)
- New serial Bematech example: `examples/print-serial-bematech.js`.
- Integration snapshots for QR payload generation strategy and profile behavior:
  - `tests/integration/qr-payload-snapshots.test.js`.
- Local type declaration for `qrcode-generator` (`src/types/qrcode-generator.d.ts`).

### Changed
- Recovery flow expanded and standardized across adapters and printer profile hooks, with serialized I/O safeguards and operational hardening for transport reinitialization.
- QR behavior hardened for profile-driven strategy selection (`native` | `raster` | `auto`), including raster alignment calibration (`position`, `offsetCols`).
- Bematech and VKP80III profile behavior aligned with profile contracts and recover baselines.
- Architecture docs updated for command abstraction, profile extension points, and operational reliability guidance.
- Project docs index and root README now include direct links to command API and recipe guides.

### Fixed
- Multiple adapter lifecycle edge cases for reconnect/close/recover under unstable links.
- Printer buffer handling in failure/recovery paths to preserve retryability.
- Consistency gaps in tests around profile behavior and printer command emission.

## [1.0.2] - 2026-03-11

### Added
- Recovery contract at adapter layer (`recover()`) with transport-specific implementations for Network, Serial, and USB.
- Printer-level recovery API (`Printer.recover(...)`) with optional status probing via real-time `DLE EOT` checks.
- Profile-level recovery hook (`buildRecoverCommand(context)`) to allow model-specific baseline reset flows.
- Recovery command baselines for:
  - `default` profile (generic ESC/POS)
  - `bematech-mp4200th`
  - `custom-vkp80iii` (non-destructive recover; no presenter/cut command side effects)
- QR code raster alignment: `position` (left/center/right) and `offsetCols` for calibration on generic firmwares.

### Changed
- Architecture docs (`PROFILE_CONTRACT.md`) now include `buildCode2d(...)` and `buildRecoverCommand(...)` as first-class profile extension points.
- README: QR section documents `offsetCols` for fine-tuning raster QR placement; Reliability section documents transactional `flush()` and `printer.recover()` after errors.
- `PROTOCOL_IMPLEMENTATION.md`: removed invalid reference to `escp2ref.pdf`; specs list aligned to available docs.

## [1.0.1] - 2026-03-12

### Added
- Serial adapter: default `baudRate` 9600 when omitted (node-serialport requires it; no breaking change).
- README: Serial examples for Windows (COM port) and cross-platform port path notes.

### Changed
- README: Serial section documents optional baudRate and Windows-only example block.
- JSDoc on `Serial.connect()`: baudRate is optional; open() uses 9600 by default.

## [1.0.0] - 2026-03-11

### Added
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
- New tests for:
  - QR/Barcode command behavior
  - adapter lifecycle robustness
  - profile registration/contract
  - image loader parity scenarios.

### Changed
- QR Code flow aligned to ESC/POS `GS ( k` with official functions 165/167/169/180/181.
- Default profile paper width set to 80 columns; model-specific widths remain profile-driven.
- Printer reliability behavior:
  - transactional `flush()` preserving payload on adapter write failure
  - serialized I/O path for `flush()`, `close()`, and `getStatus()`
  - fail-fast when an unknown profile id is provided
- Adapter resilience hardening:
  - timeout and close-safety improvements for Network/Serial/USB
  - safer reconnect semantics and partial-failure handling.
- Documentation restructured to `docs/architecture/*` with profile-specific guides and protocol references.

### Fixed
- QR opcode/function mismatch that could fail on strict ESC/POS devices.
- Buffer-loss scenario during failed flush/write operations.
- Multiple lifecycle edge cases in adapters under long-running and reconnect-heavy workloads.

### Removed
- Legacy JavaScript source tree (`src/**/*.js`) in favor of TypeScript sources.
- Root legacy `index.js` entrypoint in favor of `src/index.ts` -> `dist/index.js`.
- Legacy/duplicated docs replaced by architecture/specs structure.

## [0.2.1] - 2025-11-23

### Added
- Versioning documentation (`docs/architecture/VERSIONING.md`) with explicit semantic versioning rules

## [0.2.0] - 2025-11-23

### Added
- `Serial.listSerial()` method to list all available serial ports
  - Returns array of serial port objects with path, manufacturer, vendorId, productId, etc.
  - Similar functionality to `USB.listUSB()` for consistency between adapters

## [0.1.0] - 2025-11-23

### Added
- Complete JSDoc documentation for all public APIs
- Comprehensive test suite with 145+ tests achieving 100% coverage
- Detailed documentation in `docs/` folder:
  - Library Overview
  - USB v2 Migration Review
  - SerialPort v13 Migration Complete
  - Test Coverage Analysis
  - JSDoc Review
  - Public API Analysis
- Enhanced README with complete installation, usage examples, and API documentation

### Changed
- **BREAKING (Internal)**: Updated `usb` from `^1.9.1` to `^2.16.0`
  - Migrated from callback-based to Promise-based API
  - Improved error handling and interface management
  - Note: Public API remains unchanged, no breaking changes for library users
- **BREAKING (Internal)**: Updated `serialport` from `^12.0.0` to `^13.0.0`
  - Migrated from callback-based to Promise-based API
  - Improved connection handling and error management
  - Note: Public API remains unchanged, no breaking changes for library users
- Updated `debug` from `^4.3.1` to `^4.4.3`
- Updated `iconv-lite` from `^0.6.3` to `^0.7.0`
- Updated `jest` from `^29.7.0` to `^30.2.0`

### Fixed
- Fixed event emission consistency in USB and Serial adapters
- Fixed adapter instantiation in Printer class to maintain consistency
- Improved error handling in adapter close/disconnect methods
- Fixed test coverage gaps in commands and printer utilities

### Improved
- Architecture improvements for better event handling
- Enhanced error messages and debugging information
- Better interface release logic in USB adapter
- Improved test isolation and reliability

### Security
- Updated dependencies to latest versions with security patches

## [0.0.14] - Previous Release

Initial stable release with USB and Serial adapter support.

---

## Version History

- **1.0.1** - Serial default baudRate 9600; README Windows Serial examples and docs
- **1.0.0** - TypeScript-first stable release with hardened adapters, profile system, QR protocol fixes, and advanced image pipeline (GIF/SVG/Adam7)
- **0.2.1** - Added versioning documentation
- **0.2.0** - Added `Serial.listSerial()` method for listing available serial ports
- **0.1.0** - Major dependency updates, 100% test coverage, complete documentation
- **0.0.14** - Initial stable release


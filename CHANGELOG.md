# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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


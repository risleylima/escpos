# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- **0.1.0** - Major dependency updates, 100% test coverage, complete documentation
- **0.0.14** - Initial stable release


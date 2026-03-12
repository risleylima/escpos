# Versioning Rules

This project follows [Semantic Versioning 2.0.0](https://semver.org/).

## Summary
- **MAJOR (x.0.0):** Incompatible API changes (e.g., changing `Printer` method signatures).
- **MINOR (0.x.0):** Added functionality in a backwards-compatible manner (e.g., new `qrcode` method).
- **PATCH (0.0.x):** Backwards-compatible bug fixes (e.g., fixing a specific command sequence).

## Special Case: Pre-v1.0.0
According to SemVer, during initial development (0.y.z), anything may change at any time. However, for this project:
- `0.x.0` increments will signal potential breaking changes in the adapter API until stability is reached.
- Patch increments will be reserved for non-breaking fixes.

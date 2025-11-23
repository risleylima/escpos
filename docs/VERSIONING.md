# Semantic Versioning Rules

This document defines the explicit versioning rules for this project.

## Version Format

Following [Semantic Versioning](https://semver.org/spec/v2.0.0.html): `MAJOR.MINOR.PATCH`

## Versioning Rules

### Starting from `0.0.0`:

#### MINOR Update: `0.0.0` → `0.0.1`
- **When to use**: Adding new features, functions, or methods
- **Examples**:
  - Adding a new function like `Serial.listSerial()`
  - Adding a new method to an existing class
  - Adding new functionality that doesn't break existing code
- **Rule**: New features = increment MINOR (third number)

#### MAJOR Update: `0.0.0` → `0.1.0`
- **When to use**: Significant changes, major updates, or substantial improvements
- **Examples**:
  - Major dependency updates (e.g., `usb@^1.9.1` → `usb@^2.16.0`)
  - Major refactoring
  - Significant architectural changes
  - Multiple new features bundled together
- **Rule**: Major changes = increment MAJOR (second number) when in `0.x.x` range

#### BREAKING CHANGES: `0.0.0` → `1.0.0`
- **When to use**: Breaking changes to the public API
- **Examples**:
  - Removing or renaming public methods
  - Changing method signatures in a way that breaks existing code
  - Removing exported modules
  - Changing behavior in a way that breaks backward compatibility
- **Rule**: Breaking changes = increment to `1.0.0` (first number)

## Examples from This Project

### `0.0.14` → `0.0.15` (MINOR)
- Adding a single new function: `Serial.listSerial()`
- This is a **MINOR** update (patch increment)

### `0.0.14` → `0.1.0` (MAJOR)
- Major dependency updates (usb v1 → v2, serialport v12 → v13)
- Complete test suite addition
- Comprehensive documentation
- Multiple significant improvements bundled together
- This is a **MAJOR** update (minor increment in 0.x.x range)

### Future: `0.x.x` → `1.0.0` (BREAKING)
- If we remove `USB.listUSB()` method
- If we change `Printer` constructor signature
- If we remove support for a feature
- This would be a **BREAKING** change (major increment to 1.0.0)

## Decision Tree

```
Is it a bug fix or small correction?
  YES → PATCH (0.0.0 → 0.0.1)

Is it a single new feature/function?
  YES → MINOR (0.0.0 → 0.0.1)

Is it multiple features or major updates?
  YES → MAJOR (0.0.0 → 0.1.0)

Does it break existing code/API?
  YES → BREAKING (0.0.0 → 1.0.0)
```

## Important Notes

1. **In `0.x.x` range**: 
   - The second number (MINOR) acts as MAJOR
   - The third number (PATCH) acts as MINOR
   - This is standard Semantic Versioning behavior for pre-1.0.0 versions

2. **After `1.0.0`**:
   - Standard semver rules apply
   - MAJOR.MINOR.PATCH
   - Breaking changes = MAJOR increment
   - New features = MINOR increment
   - Bug fixes = PATCH increment

3. **Always consider**:
   - Impact on users
   - Backward compatibility
   - Number of changes
   - Significance of changes

## Summary Table

| Change Type | From `0.0.0` | Example |
|-------------|--------------|---------|
| Bug fix | `0.0.1` | Fix typo, fix error handling |
| New function/method | `0.0.1` | Add `Serial.listSerial()` |
| Major updates | `0.1.0` | Dependency updates, major refactoring |
| Breaking changes | `1.0.0` | Remove API, change signatures |


# Tests - EscPos

This directory contains the test suite for the EscPos library.

## Structure

```
tests/
├── unit/              # Isolated unit tests
│   ├── printer/       # Printer class tests
│   ├── adapters/      # Adapter tests (USB/Serial)
│   ├── image/         # Image processing tests
│   └── utils/         # Utility functions tests
└── integration/       # Integration tests
    └── printer-flow/  # Complete flow tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Coverage

The tests cover:
- ✅ Buffer operations
- ✅ Text formatting
- ✅ ESC/POS commands
- ✅ Image processing
- ✅ Barcodes
- ✅ Adapters (with mocks)
- ✅ Complete print flows

## Mocks

The tests use mocks for:
- **USB Adapter**: Mock of `usb` module
- **Serial Adapter**: Mock of `serialport` module
- **Image**: Mock of `get-pixels` module

This allows running tests without requiring real hardware.

## Adding New Tests

1. Create the test file in `tests/unit/` or `tests/integration/`
2. Use the `*.test.js` convention
3. Follow Jest's describe/it pattern
4. Use mocks for external dependencies

## Example

```javascript
describe('MyFeature', () => {
  it('should do something', () => {
    // test here
  });
});
```


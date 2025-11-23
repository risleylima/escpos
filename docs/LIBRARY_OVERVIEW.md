# Library Overview - @risleylima/escpos

## 📋 General Information

- **Name**: `@risleylima/escpos`
- **Version**: `0.1.0`
- **License**: MIT
- **Node.js**: `>=18.0.0`
- **Description**: Library to manage ESC/POS commands in Buffer (Node.js), then use an adapter to send the resulting data to the printer.

## 🏗️ Architecture

### Core Components

The library follows a modular architecture with clear separation of concerns:

```
escpos/
├── src/
│   ├── adapter/          # Base adapter class (EventEmitter)
│   ├── usb-adapter/      # USB communication adapter
│   ├── serial-adapter/   # Serial port communication adapter
│   └── printer/          # ESC/POS command generation
│       ├── commands.js   # ESC/POS command definitions
│       ├── image.js      # Image processing for thermal printers
│       ├── utils.js      # Utility functions
│       └── index.js      # Main Printer class
├── tests/                # Comprehensive test suite
│   ├── unit/            # Unit tests
│   └── integration/      # Integration tests
└── examples/            # Usage examples
```

### Public API

The library exports the following modules:

```javascript
const { USB, Serial, Printer, Adapter, Image } = require('@risleylima/escpos');
```

- **USB**: USB adapter instance (EventEmitter)
- **Serial**: Serial port adapter instance (EventEmitter)
- **Printer**: ESC/POS command generator class
- **Adapter**: Base adapter class
- **Image**: Image processing utilities

## 🔌 Adapters

### USB Adapter (`usb-adapter`)

- **Technology**: `node-usb` v2.16.0 (Promise-based API)
- **Features**:
  - Device discovery and listing
  - VID/PID-based connection
  - Automatic printer interface detection
  - Kernel driver handling (Linux/macOS)
  - Event-driven architecture (connect, disconnect, close, detach)
  - Error handling and recovery

**Key Methods**:
- `listUSB()`: List all USB printer devices
- `connect(vid, pid)`: Connect to a specific device
- `open()`: Open device and claim interface
- `write(data)`: Send data to printer
- `close()`: Close device connection
- `disconnect()`: Disconnect device

### Serial Adapter (`serial-adapter`)

- **Technology**: `serialport` v13.0.0 (Promise-based API)
- **Features**:
  - Port verification
  - Auto-open disabled (manual control)
  - Event-driven architecture (connect, disconnect, close)
  - Error handling via events
  - Flush and drain operations

**Key Methods**:
- `connect(port, options)`: Connect to serial port
- `open()`: Open port if closed
- `write(data)`: Send data to printer
- `read()`: Read data from port
- `close(timeout)`: Close port with optional timeout
- `disconnect(timeout)`: Disconnect port

## 🖨️ Printer Class

The `Printer` class generates ESC/POS commands and manages a buffer system.

### Core Features

- **Buffer Management**: Dynamic buffer for command accumulation
- **Text Operations**: Print text with encoding support
- **Formatting**: Alignment, size, style (bold, italic, underline)
- **Hardware Control**: Cut, beep, cash drawer
- **Barcode Generation**: Multiple barcode formats
- **Image Printing**: Convert and print images
- **Method Chaining**: Fluent API for command composition

### Key Methods

**Text Operations**:
- `print(data)`: Print raw data
- `println(data)`: Print with line break
- `text(content, encoding)`: Print encoded text
- `textln(content, encoding)`: Print encoded text with line break

**Formatting**:
- `align(position)`: Set text alignment (left, center, right)
- `size(width, height)`: Set text size
- `style(style)`: Set text style (NORMAL, BOLD, ITALIC, UNDERLINE)
- `encode(codeTable)`: Set character encoding table

**Hardware**:
- `cut(partial)`: Cut paper
- `beep(count, time)`: Beep buzzer
- `cashdraw(pin)`: Open cash drawer
- `hardware(command)`: Hardware initialization

**Barcode**:
- `barcode(code, type, width, height, position, font)`: Print barcode

**Image**:
- `image(image, density)`: Print image

**Control**:
- `flush()`: Send buffered data to printer
- `close(options)`: Close connection and flush

## 📊 Test Coverage

### Test Statistics

- **Total Test Files**: 9
- **Total Tests**: 145
- **Test Suites**: 9
- **Coverage**: 100% (100% statements, 100% branches, 100% functions, 100% lines) ✅
- **Test Framework**: Jest 30.2.0

### Test Structure

```
tests/
├── unit/
│   ├── adapters/
│   │   ├── adapter.test.js          # Base adapter tests
│   │   ├── usb-adapter.test.js      # USB adapter tests
│   │   └── serial-adapter.test.js   # Serial adapter tests
│   ├── printer/
│   │   ├── buffer.test.js           # Buffer tests
│   │   └── printer.test.js          # Printer class tests
│   ├── image/
│   │   └── image.test.js            # Image processing tests
│   └── utils/
│       └── utils.test.js            # Utility function tests
└── integration/
    └── printer-flow.test.js         # End-to-end flow tests
```

### Test Coverage by Module

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| All files | 100% | 100% | 100% | 100% |
| commands.js | 100% | 100% | 100% | 100% |
| image.js | 100% | 100% | 100% | 100% |
| utils.js | 100% | 100% | 100% | 100% |

## 📦 Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `debug` | ^4.4.3 | Debug logging |
| `get-pixels` | custom fork | Image pixel extraction |
| `iconv-lite` | ^0.7.0 | Text encoding conversion |
| `serialport` | ^13.0.0 | Serial port communication |
| `usb` | ^2.16.0 | USB device communication |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^30.2.0 | Testing framework |

**All dependencies are up to date!** ✅

## 🔄 Recent Improvements

### 1. Dependency Updates

- ✅ **USB Library**: Migrated from v1.9.1 (callbacks) to v2.16.0 (Promises)
- ✅ **SerialPort**: Migrated from v12.0.0 to v13.0.0 (Promise-based API)
- ✅ **iconv-lite**: Updated from 0.6.3 to 0.7.0
- ✅ **debug**: Updated from 4.3.1 to 4.4.3
- ✅ **jest**: Updated from 29.7.0 to 30.2.0

### 2. Architecture Improvements

- ✅ **Event Consistency**: Fixed adapter event emission by using the same object instance internally and externally
- ✅ **Adapter Pattern**: Simplified Printer to use adapter directly instead of creating wrapper instances
- ✅ **Code Cleanup**: Removed unused imports and dependencies

### 3. Test Suite

- ✅ **Comprehensive Coverage**: 126 tests covering all major functionality
- ✅ **Unit Tests**: All core components tested in isolation
- ✅ **Integration Tests**: End-to-end printer flow validation
- ✅ **Mock Strategy**: Proper mocking of USB and Serial adapters

### 4. Documentation

- ✅ **Migration Guides**: Detailed documentation for USB v2 and SerialPort v13 migrations
- ✅ **Test Documentation**: Complete test suite documentation
- ✅ **Dependency Review**: Comprehensive dependency status tracking

## 🎯 Key Features

### 1. Multi-Adapter Support

The library supports multiple connection types:
- **USB**: Direct USB printer connection
- **Serial**: Serial port (RS-232) connection

Both adapters share the same interface and can be used interchangeably.

### 2. Event-Driven Architecture

All adapters extend EventEmitter, providing:
- `connect` event: Emitted when device connects
- `disconnect` event: Emitted when device disconnects
- `close` event: Emitted when connection closes
- `detach` event: Emitted when USB device is unplugged

### 3. Fluent API

The Printer class supports method chaining:

```javascript
printer
  .hardware('init')
  .align('ct')
  .size(2, 2)
  .textln('Hello World')
  .cut(true);
```

### 4. Encoding Support

Full support for various character encodings:
- GB18030 (default)
- UTF-8
- ASCII
- And more via iconv-lite

### 5. Image Processing

Built-in image processing for thermal printers:
- Image loading and conversion
- Bitmap and raster format support
- Density control

## 📝 Usage Example

```javascript
const { USB, Printer } = require('@risleylima/escpos');

(async () => {
  // Connect to USB printer
  await USB.connect(1046, 20497);
  await USB.open();
  
  // Create printer instance
  const printer = new Printer(USB);
  
  // Print receipt
  printer
    .hardware('init')
    .align('ct')
    .size(2, 2)
    .textln('RECEIPT')
    .size(1, 1)
    .align('lt')
    .textln('Item 1: $10.00')
    .textln('Item 2: $20.00')
    .align('rt')
    .textln('Total: $30.00')
    .cut(true);
  
  // Send to printer
  await printer.flush();
  
  // Close connection
  await USB.close();
  await USB.disconnect();
})();
```

## 🔍 Code Quality

### Metrics

- **Files**: 7 source files
- **Test Files**: 8 test files
- **Test Coverage**: 88.09% (excellent)
- **All Tests Passing**: ✅ 126/126

### Architecture Quality

- ✅ **Separation of Concerns**: Clear module boundaries
- ✅ **Single Responsibility**: Each module has a focused purpose
- ✅ **Event-Driven**: Proper use of EventEmitter pattern
- ✅ **Promise-Based**: Modern async/await patterns
- ✅ **Error Handling**: Comprehensive error handling
- ✅ **Type Safety**: JSDoc comments for better IDE support

## 🚀 Performance

- **Buffer Management**: Efficient buffer accumulation and flushing
- **Async Operations**: Non-blocking I/O operations
- **Event System**: Lightweight event emission
- **Memory**: Efficient buffer reuse

## 🔒 Stability

- **Test Coverage**: 88.09% with 126 tests
- **All Tests Passing**: ✅
- **Dependencies**: All up to date
- **Breaking Changes**: None in recent updates
- **API Compatibility**: Maintained throughout updates

## 📚 Documentation

Comprehensive documentation available in `docs/`:

- `DEPENDENCIES_REVIEW.md`: Dependency status and update history
- `PUBLIC_API_ANALYSIS.md`: Public API documentation
- `TESTS_IMPLEMENTED.md`: Test suite documentation
- `USB_V2_MIGRATION.md`: USB v2 migration guide
- `USB_V2_REVIEW.md`: USB v2 review and changes
- `SERIALPORT_V13_MIGRATION_PLAN.md`: SerialPort v13 migration plan
- `SERIALPORT_V13_MIGRATION_COMPLETE.md`: SerialPort v13 migration completion
- `SERIALPORT_V13_ANALYSIS.md`: SerialPort v13 analysis

## 🎓 Best Practices

The library follows Node.js best practices:

1. **Error Handling**: Try-catch blocks and error events
2. **Async/Await**: Modern Promise-based async operations
3. **EventEmitter**: Proper event-driven architecture
4. **Modularity**: Clear separation of concerns
5. **Testing**: Comprehensive test coverage
6. **Documentation**: JSDoc comments and detailed guides

## 🔮 Future Considerations

Potential areas for future enhancement:

1. **TypeScript**: Consider migrating to TypeScript for better type safety
2. **Network Adapter**: Add support for network printers (TCP/IP)
3. **Bluetooth Adapter**: Add support for Bluetooth printers
4. **More Barcode Types**: Expand barcode format support
5. **PDF Support**: Direct PDF to ESC/POS conversion
6. **QR Code**: Native QR code generation
7. **Printer Status**: Query printer status and paper levels

## 📊 Summary

**@risleylima/escpos** is a modern, well-architected ESC/POS library for Node.js with:

- ✅ **Modern Architecture**: Event-driven, Promise-based
- ✅ **Comprehensive Testing**: 126 tests, 88% coverage
- ✅ **Up-to-Date Dependencies**: All dependencies current
- ✅ **Multi-Adapter Support**: USB and Serial
- ✅ **Rich Feature Set**: Text, images, barcodes, formatting
- ✅ **Excellent Documentation**: Comprehensive guides and examples
- ✅ **Production Ready**: Stable, tested, and maintained

The library is ready for production use and provides a solid foundation for thermal printer integration in Node.js applications.


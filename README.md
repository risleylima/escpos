# @risleylima/escpos

[![npm version](https://img.shields.io/npm/v/@risleylima/escpos.svg)](https://www.npmjs.com/package/@risleylima/escpos)
[![Node.js](https://img.shields.io/node/v/@risleylima/escpos.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, well-tested Node.js library for generating ESC/POS commands and communicating with thermal printers via USB or Serial ports.

## Features

- 🖨️ **Full ESC/POS Support**: Complete implementation of ESC/POS commands
- 🔌 **Multiple Adapters**: USB and Serial port support
- 📝 **Fluent API**: Method chaining for easy command composition
- 🖼️ **Image Printing**: Convert and print images on thermal printers
- 📊 **Barcode Generation**: Support for multiple barcode formats (EAN13, EAN8, CODE128, CODE39, etc.)
- 🌐 **Encoding Support**: Multiple character encodings (GB18030, UTF-8, ASCII, etc.)
- 📦 **Modern JavaScript**: Promise-based async/await, ES6+
- ✅ **Well Tested**: 100% test coverage with 145+ tests
- 📚 **Fully Documented**: Complete JSDoc documentation
- 🔄 **Event-Driven**: EventEmitter-based architecture for connection events

## Installation

### Via NPM

```bash
npm install @risleylima/escpos
```

### Via Yarn

```bash
yarn add @risleylima/escpos
```

## Requirements

- **Node.js**: >= 18.0.0
- **Operating System**: Linux, macOS, or Windows

### Platform-Specific Requirements

#### Linux
- For USB: `libusb` development libraries
  ```bash
  sudo apt-get install libusb-1.0-0-dev  # Debian/Ubuntu
  sudo yum install libusb-devel          # CentOS/RHEL
  ```
- For Serial: Usually built-in, may need permissions
  ```bash
  sudo usermod -a -G dialout $USER  # Add user to dialout group
  ```

#### macOS
- For USB: Usually works out of the box
- For Serial: Usually works out of the box

#### Windows
- For USB: Usually works out of the box
- For Serial: Usually works out of the box

## Quick Start

### USB Printer Example

```javascript
const { USB, Printer } = require('@risleylima/escpos');

(async () => {
  try {
    // Connect to USB printer (VID and PID)
    await USB.connect(1046, 20497);
    await USB.open();
    
    // Create printer instance
    const printer = new Printer(USB);
    
    // Print a receipt
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
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

### Serial Printer Example

```javascript
const { Serial, Printer } = require('@risleylima/escpos');

(async () => {
  try {
    // Connect to serial printer
    await Serial.connect('/dev/ttyUSB0');
    await Serial.open();
    
    // Create printer instance
    const printer = new Printer(Serial);
    
    // Print text
    printer
      .hardware('init')
      .textln('Hello, World!')
      .cut(true);
    
    // Send to printer
    await printer.flush();
    
    // Close connection
    await Serial.close();
    await Serial.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

## API Documentation

### Exports

The library exports the following modules:

```javascript
const { USB, Serial, Printer, Adapter, Image } = require('@risleylima/escpos');
```

- **`USB`**: USB adapter instance (EventEmitter)
- **`Serial`**: Serial port adapter instance (EventEmitter)
- **`Printer`**: ESC/POS command generator class
- **`Adapter`**: Base adapter class
- **`Image`**: Image processing utilities

### USB Adapter

#### Methods

##### `USB.listUSB()`
List all available USB printer devices.

```javascript
const devices = await USB.listUSB();
console.log(devices); // Array of USB devices with manufacturer and product info
```

##### `USB.connect(vid, pid)`
Connect to a USB printer by Vendor ID and Product ID.

```javascript
await USB.connect(1046, 20497); // Connect to specific device
// OR
await USB.connect(); // Connect to first available printer
```

**Events:**
- `connect` - Emitted when device connects
- `detach` - Emitted when device is unplugged

##### `USB.open()`
Open the USB device and claim the printer interface.

```javascript
await USB.open();
```

**Events:**
- `connect` - Emitted when device is opened

##### `USB.write(data)`
Write data buffer to the printer.

```javascript
await USB.write(Buffer.from('Hello', 'ascii'));
```

##### `USB.close()`
Close the USB device connection.

```javascript
await USB.close();
```

**Events:**
- `close` - Emitted when device closes

##### `USB.disconnect()`
Disconnect from the USB device (calls `close` internally).

```javascript
await USB.disconnect();
```

**Events:**
- `disconnect` - Emitted when device disconnects

### Serial Adapter

#### Methods

##### `Serial.listSerial()`
List all available serial ports.

```javascript
const ports = await Serial.listSerial();
console.log(ports); // Array of serial port objects with path, manufacturer, vendorId, productId, etc.
```

##### `Serial.connect(port, options)`
Connect to a serial port printer.

```javascript
await Serial.connect('/dev/ttyUSB0');
// OR with options
await Serial.connect('/dev/ttyUSB0', {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
});
```

**Events:**
- `connect` - Emitted when port connects
- `close` - Emitted when reconnecting (closing previous connection)

##### `Serial.open()`
Open the serial port if it's closed.

```javascript
await Serial.open();
```

##### `Serial.write(data)`
Write data buffer to the printer.

```javascript
await Serial.write(Buffer.from('Hello', 'ascii'));
```

##### `Serial.read()`
Read data from the serial port.

```javascript
const data = await Serial.read();
```

##### `Serial.close(timeout)`
Close the serial port connection.

```javascript
await Serial.close(); // Default timeout: 50ms
await Serial.close(100); // Custom timeout: 100ms
```

**Events:**
- `close` - Emitted when port closes

##### `Serial.disconnect(timeout)`
Disconnect from the serial port (calls `close` internally).

```javascript
await Serial.disconnect();
```

**Events:**
- `disconnect` - Emitted when port disconnects

### Printer Class

#### Constructor

```javascript
const printer = new Printer(adapter, options);
```

**Parameters:**
- `adapter` (Adapter): USB or Serial adapter instance
- `options` (Object, optional):
  - `encoding` (String): Character encoding (default: 'GB18030')
  - `width` (Number): Paper width in columns (default: 48)

#### Text Operations

##### `printer.print(content)`
Print raw text without encoding.

```javascript
printer.print('Hello');
```

##### `printer.println(content)`
Print text with line break.

```javascript
printer.println('Hello');
```

##### `printer.text(content, encoding)`
Print text with encoding.

```javascript
printer.text('Hello', 'UTF-8');
```

##### `printer.textln(content, encoding)`
Print text with encoding and line break.

```javascript
printer.textln('Hello', 'UTF-8');
```

##### `printer.newLine()`
Send end of line command.

```javascript
printer.newLine();
```

#### Formatting

##### `printer.align(position)`
Set text alignment.

```javascript
printer.align('lt'); // Left
printer.align('ct'); // Center
printer.align('rt'); // Right
```

##### `printer.size(width, height)`
Set text size (1-8 for both width and height).

```javascript
printer.size(2, 2); // Double width and height
```

##### `printer.style(type)`
Set text style.

```javascript
printer.style('B'); // Bold
printer.style('I'); // Italic
printer.style('U'); // Underline
printer.style('NORMAL'); // Normal
```

##### `printer.font(family)`
Set font family.

```javascript
printer.font('A'); // Font A (42 columns)
printer.font('B'); // Font B (56 columns)
printer.font('C'); // Font C
```

##### `printer.encode(encoding)`
Set character encoding.

```javascript
printer.encode('UTF-8');
printer.encode('GB18030');
```

#### Hardware Control

##### `printer.hardware(command)`
Send hardware commands.

```javascript
printer.hardware('init'); // Initialize printer
```

##### `printer.cut(partial, feed)`
Cut paper.

```javascript
printer.cut(true); // Partial cut
printer.cut(false); // Full cut
printer.cut(true, 5); // Partial cut with 5 line feeds
```

##### `printer.beep(count, time)`
Beep buzzer.

```javascript
printer.beep(2, 1); // Beep 2 times, 100ms each
```

##### `printer.cashdraw(pin)`
Open cash drawer.

```javascript
printer.cashdraw(2); // Pulse pin 2
printer.cashdraw(5); // Pulse pin 5
```

#### Barcode

##### `printer.barcode(code, type, options)`
Print barcode.

```javascript
// EAN13 barcode
printer.barcode('123456789012', 'EAN13');

// CODE128 with options
printer.barcode('ABC123', 'CODE128', {
  width: 2,
  height: 100,
  position: 'BLW', // Below: 'OFF', 'ABV', 'BLW', 'BTH'
  font: 'A',
  includeParity: true
});
```

**Supported Types:**
- `EAN13`, `EAN8`, `UPC-A`, `UPC-E`
- `CODE39`, `CODE93`, `CODE128`
- `ITF`, `NW7`

#### Image Printing

##### `printer.image(image, density)`
Print image in bitmap mode.

```javascript
const { Image } = require('@risleylima/escpos');

// Load image
const image = await Image.load('/path/to/image.png', 'image/png');

// Print image
printer.image(image, 'd24'); // Density: 'd8', 's8', 'd24', 's24'
```

##### `printer.raster(image, mode)`
Print image in raster mode.

```javascript
const image = await Image.load('/path/to/image.png', 'image/png');
printer.raster(image, 'normal'); // Mode: 'normal', 'dw', 'dh', 'dwdh'
```

#### Control Methods

##### `printer.flush()`
Send buffered data to printer.

```javascript
await printer.flush();
```

##### `printer.close(options)`
Close connection and flush buffer.

```javascript
await printer.close();
```

#### Utility Methods

##### `printer.drawLine(character)`
Draw a line with specified character.

```javascript
printer.drawLine('-'); // Draw line with dashes
printer.drawLine('='); // Draw line with equals
```

##### `printer.feed(n)`
Feed paper n lines.

```javascript
printer.feed(3); // Feed 3 lines
```

##### `printer.color(color)`
Set print color (if printer supports it).

```javascript
printer.color(0); // Black
printer.color(1); // Red
```

##### `printer.setReverseColors(bool)`
Reverse colors (if printer supports it).

```javascript
printer.setReverseColors(true); // White text on black background
printer.setReverseColors(false); // Normal
```

##### `printer.raw(data)`
Write raw ESC/POS commands.

```javascript
// Hex string
printer.raw('1B40'); // Initialize

// Buffer
printer.raw(Buffer.from('1B40', 'hex'));
```

## Advanced Examples

### Complete Receipt

```javascript
const { USB, Printer } = require('@risleylima/escpos');

(async () => {
  await USB.connect(1046, 20497);
  await USB.open();
  
  const printer = new Printer(USB, {
    encoding: 'UTF-8',
    width: 48
  });
  
  printer
    .hardware('init')
    .beep(1, 1)
    .align('ct')
    .size(2, 2)
    .textln('MY STORE')
    .size(1, 1)
    .textln('123 Main Street')
    .textln('City, State 12345')
    .textln('Phone: (555) 123-4567')
    .drawLine()
    .align('lt')
    .textln('Date: ' + new Date().toLocaleString())
    .textln('Receipt #: 001234')
    .drawLine()
    .textln('Item 1              $10.00')
    .textln('Item 2              $20.00')
    .textln('Item 3              $15.00')
    .drawLine()
    .align('rt')
    .textln('Subtotal:           $45.00')
    .textln('Tax:                $4.50')
    .size(2, 1)
    .textln('Total:              $49.50')
    .size(1, 1)
    .drawLine()
    .align('ct')
    .textln('Thank you for your purchase!')
    .feed(3)
    .cut(true);
  
  await printer.flush();
  await USB.close();
  await USB.disconnect();
})();
```

### Barcode Example

```javascript
const { USB, Printer } = require('@risleylima/escpos');

(async () => {
  await USB.connect(1046, 20497);
  await USB.open();
  
  const printer = new Printer(USB);
  
  printer
    .hardware('init')
    .align('ct')
    .textln('PRODUCT CODE')
    .barcode('123456789012', 'EAN13', {
      width: 2,
      height: 100,
      position: 'BLW',
      font: 'A'
    })
    .feed(2)
    .cut(true);
  
  await printer.flush();
  await USB.close();
  await USB.disconnect();
})();
```

### Image Printing Example

```javascript
const { USB, Printer, Image } = require('@risleylima/escpos');

(async () => {
  await USB.connect(1046, 20497);
  await USB.open();
  
  const printer = new Printer(USB);
  
  // Load and print image
  const image = await Image.load('/path/to/logo.png', 'image/png');
  
  printer
    .hardware('init')
    .align('ct')
    .image(image, 'd24')
    .feed(2)
    .textln('Company Logo')
    .cut(true);
  
  await printer.flush();
  await USB.close();
  await USB.disconnect();
})();
```

### Event Handling

```javascript
const { USB, Printer } = require('@risleylima/escpos');

USB.on('connect', (device) => {
  console.log('Device connected:', device);
});

USB.on('disconnect', (device) => {
  console.log('Device disconnected:', device);
});

USB.on('close', (device) => {
  console.log('Device closed:', device);
});

USB.on('detach', () => {
  console.log('Device unplugged!');
});

(async () => {
  await USB.connect(1046, 20497);
  await USB.open();
  
  const printer = new Printer(USB);
  printer.textln('Hello, World!');
  await printer.flush();
  
  await USB.close();
  await USB.disconnect();
})();
```

### Finding USB Printers

```javascript
const { USB } = require('@risleylima/escpos');

(async () => {
  // List all USB printers
  const devices = await USB.listUSB();
  
  console.log('Found printers:');
  devices.forEach((device, index) => {
    console.log(`${index + 1}. ${device.manufacturer} - ${device.product}`);
    console.log(`   VID: ${device.deviceDescriptor.idVendor}`);
    console.log(`   PID: ${device.deviceDescriptor.idProduct}`);
  });
  
  // Connect to first printer
  if (devices.length > 0) {
    await USB.connect();
    await USB.open();
    // ... use printer
  }
})();
```

## Method Chaining

The Printer class supports method chaining for fluent API:

```javascript
printer
  .hardware('init')
  .align('ct')
  .size(2, 2)
  .textln('TITLE')
  .size(1, 1)
  .align('lt')
  .textln('Content here')
  .cut(true);
```

## Error Handling

Always wrap printer operations in try-catch blocks:

```javascript
try {
  await USB.connect(1046, 20497);
  await USB.open();
  
  const printer = new Printer(USB);
  printer.textln('Hello');
  await printer.flush();
  
  await USB.close();
  await USB.disconnect();
} catch (error) {
  console.error('Printer error:', error);
  // Handle error appropriately
}
```

## Testing

The library includes comprehensive tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Coverage: 100%** ✅
- 145+ tests
- Unit and integration tests
- All edge cases covered

## Documentation

Additional documentation is available in the `docs/` folder:

- [Library Overview](./docs/LIBRARY_OVERVIEW.md) - Complete library overview
- [JSDoc Review](./docs/JSDOC_REVIEW.md) - JSDoc documentation review
- [Test Coverage](./docs/COVERAGE_ANALYSIS.md) - Test coverage analysis
- [Dependencies Review](./docs/DEPENDENCIES_REVIEW.md) - Dependencies status
- [USB v2 Migration](./docs/USB_V2_MIGRATION.md) - USB library migration guide
- [SerialPort v13 Migration](./docs/SERIALPORT_V13_MIGRATION_COMPLETE.md) - SerialPort migration guide

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone repository
git clone https://github.com/risleylima/escpos.git
cd escpos

# Install dependencies
npm install
# or
yarn install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## License

MIT License

Copyright (c) 2021 Risley Lima risley@rlimainfo.com.br

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Acknowledgments

This library is a refactoring/rewrite of [node-escpos](https://github.com/song940/node-escpos) by Lsong, with improvements and modern JavaScript patterns.

## Support

- **Issues**: [GitHub Issues](https://github.com/risleylima/escpos/issues)
- **Email**: risley@rlimainfo.com.br

## Changelog

### v0.0.14
- ✅ Updated all dependencies to latest versions
- ✅ Migrated USB library from v1 to v2 (Promise-based)
- ✅ Migrated SerialPort from v12 to v13 (Promise-based)
- ✅ 100% test coverage (145+ tests)
- ✅ Complete JSDoc documentation
- ✅ Architecture improvements and bug fixes

---

**Made with ❤️ by [Rlima Info](https://github.com/risleylima)**

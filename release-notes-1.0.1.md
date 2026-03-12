# @risleylima/escpos v1.0.1

Patch release: Serial adapter default baud rate and README improvements for Windows users.

## Added
- **Serial adapter:** Default `baudRate` 9600 when omitted in `connect(port, options)`. node-serialport requires a baud rate; the adapter now supplies 9600 so you can call `connect('/dev/ttyUSB0')` or `connect('COM3')` without options. Pass `{ baudRate: 115200 }` (or 9600) to match your printer.
- **README:** Serial examples for Windows (COM port) and cross-platform port path notes. Windows-only code sample using `COM3`; inline note on Device Manager (Ports COM & LPT).

## Changed
- README Serial section: documents optional baudRate and adds a Windows-only example block.
- JSDoc on `Serial.connect()`: baudRate is optional; `open()` uses 9600 by default.

---

**Upgrade:** `npm install @risleylima/escpos@1.0.1`

No breaking changes; fully backward compatible with 1.0.0.

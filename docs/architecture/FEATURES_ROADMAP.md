# Features Roadmap

Plan for future improvements and pending functionalities.

## Short Term (v1.1.x)
- [x] Modern QR Code implementation (GS ( k).
- [x] Real-time status monitoring (DLE EOT).
- [x] Support for Indexed/Grayscale PNG and multi-bit BMP.
- [x] Transport + profile-aware recovery API (`Adapter.recover()`, `Printer.recover(...)`, `buildRecoverCommand(...)`).
- [ ] Implement robust `table()` method for automatic multi-column text wrapping.
- [ ] Add `printer.rawFile(path)` for sending pre-rendered binary files.

## Mid Term (v1.2.x)
- [ ] Bluetooth (BLE) Adapter support.
- [ ] Electron-specific transport optimizations.
- [ ] PDF to Image conversion built-in helper.

## Long Term (v2.x)
- [ ] Full driver-less support for Star and Zebra (ZPL) protocols via the same `Printer` API (Universal Printer Driver).
- [ ] Web-based UI for visual receipt composition.

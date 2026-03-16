# @risleylima/escpos

[![npm version](https://img.shields.io/npm/v/@risleylima/escpos.svg)](https://www.npmjs.com/package/@risleylima/escpos)
[![Node.js](https://img.shields.io/node/v/@risleylima/escpos.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-239%20passed-brightgreen.svg)]()

**🇧🇷 Documentação em português:** [README.pt-BR.md](./README.pt-BR.md) • [Documentação técnica (pt-BR)](./docs/pt-BR/README.md)

**The definitive thermal printing library for Node.js.** — Industrial-grade robustness, O(n) performance, and a fully agnostic architecture.

## 🚀 Why choose this library?

This library was designed to solve common technical bottlenecks found in traditional thermal printing implementations. Our focus is on reliability, performance, and clean architecture.

### Technical Advantages

| Feature | Our Modern Approach | Common Legacy Patterns |
| :--- | :--- | :--- |
| **Buffer Efficiency** | **O(n)** (Smart chunk accumulation) | O(n²) (Recursive concatenation) |
| **Event Loop** | **Protected** (Async pixel processing) | Blocked (Synchronous processing) |
| **State Management** | **Instantiable** (Multi-printer support) | Singletons (Global state limits) |
| **Protocol Support** | **Modern GS ( k** (Native QR) | Legacy ESC Z commands |
| **Connectivity** | **Fully Agnostic** (Interface-based) | Coupled to specific IO |

---

## 🛠️ Architectural Pillars

1.  **Transport Agnostic (IO):** The printer core communicates through an `AdapterLike` abstraction. Use USB, Serial, or Network interchangeably.
2.  **Model Agnostic (Profiles):** Handle manufacturer-specific "quirks" (Epson, Elgin, Bematech, Custom) via a robust Profile system.
3.  **Industrial Reliability:** Built-in mechanisms for `drain` (with timeouts), chunking, and serialized IO to ensure zero data loss under high load.

---

## 📦 Installation

```bash
npm install @risleylima/escpos
```

---

## 🧰 Development Setup

If you are contributing or building from source:
```bash
yarn install
yarn build
yarn test
```

---

## ⚡ Quick Start

### Network (TCP RAW)
```javascript
import { Network, Printer } from '@risleylima/escpos';

const adapter = new Network();
await adapter.connect('10.1.1.50', 9100);
await adapter.open();

const printer = new Printer(adapter);
printer.textln('Hello Network World').cut();

await printer.flush();
await adapter.close();
```

### Serial (RS232)
```javascript
import { Serial, Printer } from '@risleylima/escpos';

const adapter = new Serial();
// baudRate is optional; if omitted, 9600 is used.
await adapter.connect('/dev/ttyUSB0', { baudRate: 115200 });
await adapter.open();

const printer = new Printer(adapter);
printer.textln('Hello Serial World').cut();

await printer.flush();
await adapter.close();
```
*Note for Windows: Use paths like `COM1`, `COM2`, etc.*

### USB Direct
```javascript
import { USB, Printer } from '@risleylima/escpos';

const adapter = new USB();
await adapter.connect(0x04b8, 0x0202); // VID, PID
await adapter.open();

const printer = new Printer(adapter);
printer.textln('Hello USB World').cut();

await printer.flush();
await adapter.close();
```

### Complete Command Documentation

- Full method-by-method reference: [`docs/architecture/COMMANDS_API.md`](./docs/architecture/COMMANDS_API.md)
- Practical usage patterns: [`docs/architecture/COMMANDS_RECIPES.md`](./docs/architecture/COMMANDS_RECIPES.md)

---

## 🔳 QR Code Strategies

`printer.qrcode(...)` supports three strategies to ensure compatibility with any printer:

- `native`: Sends native `GS ( k` commands. Fast and sharp.
- `raster`: Generates a bitmask in memory and prints as an image. Works on *any* printer that supports graphics.
- `auto`: Uses the profile configuration to decide the best path (e.g., Bematech defaults to raster for reliability).

```javascript
printer.qrcode('https://google.com', {
  size: 6,
  level: 'M',
  strategy: 'raster',
  position: 'center'
});
```

For raster QR, `position` uses standard alignment (`ESC a`). On some generic firmwares alignment may be approximate; use `offsetCols` (in character columns) to fine-tune horizontal placement.

---

## 🖼️ Image Processing

- **Supported Formats:** PNG (Adam7/Indexed/Gray/RGB), BMP (1/4/8/24-bit), JPEG, GIF, and **SVG**.
- **Non-blocking:** Heavy processing yields to the Event Loop, keeping your server responsive.
- **SVG Excellence:** Automatic transparency flattening over white background.

```javascript
import { Image } from '@risleylima/escpos';
const image = await Image.load('./logo.svg');
printer.raster(image); 
```

---

## 🛟 Recovery API

Reliable error handling for production environments:

```javascript
// Recover transport + printer baseline
const result = await printer.recover({ checkStatus: true });

// If recovery had to clear the buffer, the data is returned for logging/retry
if (result.discardedBuffer) {
  console.log('Unprinted data:', result.discardedBuffer.length, 'bytes');
}
```

---

## 🖨️ Profile Support

- **'default'**: Standard ESC/POS.
- **'custom-vkp80iii'**: Custom VKP80III (Special eject/cut flow).
- **'bematech-mp4200th'**: Optimized for Brazilian market standard.

Register your own:
```javascript
import { registerProfile } from '@risleylima/escpos';
registerProfile({ id: 'my-model', name: 'My Model', defaultPaperWidth: 42 });
```

---

## ✅ Reliability

- **239+ Unit and Integration Tests.**
- **TypeScript Strict:** Type safety for the entire command set.
- **Spec-Validated:** Aligned with official Epson and manufacturer manuals.
- **Transactional flush:** On write failure, the buffer is preserved so you can retry or log; call `printer.recover()` after transport errors before resuming prints.

---

**Built with ❤️ for mission-critical systems.**

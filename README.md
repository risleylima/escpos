# @risleylima/escpos

[![npm version](https://img.shields.io/npm/v/@risleylima/escpos.svg)](https://www.npmjs.com/package/@risleylima/escpos)
[![Node.js](https://img.shields.io/node/v/@risleylima/escpos.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-138%20passed-brightgreen.svg)]()

**The definitive thermal printing library for Node.js.** — Industrial-grade robustness, O(n) performance, and a fully agnostic architecture.

## 🚀 Why choose this library?

This library was designed to solve common technical bottlenecks found in traditional thermal printing implementations. Our focus is on reliability, performance, and clean architecture.

### Technical Advantages

| Feature | Our Modern Approach | Common Legacy Patterns |
| :--- | :--- | :--- |
| **Buffer Efficiency** | **O(n)** (Smart chunk accumulation) | O(n²) (Recursive concatenation) |
| **Event Loop** | **Protected** (Async pixel processing) | Blocked (Synchronous processing) |
| **State Management** | **Instantiable** (Multi-printer support) | Singletons (Global state limits) |
| **Protocol Support** | **Modern GS ( k** (QR Functions 165/167/169/180/181) | Legacy ESC Z commands |
| **Connectivity** | **Fully Agnostic** (Interface-based) | Coupled to specific IO |

---

## 🛠️ Architectural Pillars

1.  **Transport Agnostic (IO):** The printer core is pure and communicates through an `AdapterLike` abstraction. Use USB, Serial, or Network interchangeably.
2.  **Model Agnostic (Profiles):** Handle manufacturer-specific "quirks" (Epson, Elgin, Bematech, Custom) via a robust Profile system.
3.  **Industrial Reliability:** Built-in mechanisms for `drain` and graceful shutdown to ensure zero data loss.

---

## 📦 Installation

```bash
npm install @risleylima/escpos
```

---

## 🧰 Development Setup

- **Official package manager:** `yarn`
- Use `yarn install` for dependency install in this repository.
- Use `yarn test`, `yarn test:coverage`, and `yarn build` for local workflows.

```bash
yarn install
yarn build
yarn test
```

---

## ⚡ Quick Start

### Network (TCP RAW) Example
```javascript
import { Network, Printer } from '@risleylima/escpos';

const adapter = new Network();
await adapter.connect('10.1.1.50', 9100);
await adapter.open();

const printer = new Printer(adapter);
printer.textln('Hello World').cut();

await printer.flush();
await adapter.close();
```

### USB Example
```javascript
import { USB, Printer } from '@risleylima/escpos';

const adapter = new USB();
await adapter.connect(0x04b8, 0x0202); // VID, PID
await adapter.open();

const printer = new Printer(adapter);
printer.textln('USB Printing').cut();

await printer.flush();
await adapter.close();
```

---

## 📝 Visual Result Preview

```text
------------------------------------------------
                   MY STORE
            1024 Engineering Street
------------------------------------------------
Item 001                                $ 10.00
Item 002                                $ 20.00
------------------------------------------------
TOTAL                                   $ 30.00
------------------------------------------------
          [ MODERN QR CODE HERE ]
------------------------------------------------
```

---

## 🖼️ Industrial Image Processing

- **Formats:** PNG (Indexed/Gray/RGB), BMP (1/4/8/24-bit), JPEG, and GIF.
- **Non-blocking:** Asynchronous decoding with `setImmediate` ensuring your server stays responsive.

```javascript
import { Image } from '@risleylima/escpos';
const image = await Image.load('./logo.png');
printer.raster(image); 
```

---

## 🔍 Status Monitoring

Reliable hardware feedback:

```javascript
const status = await printer.getStatus('PAPER');
if (status[0] & 0x0C) {
  console.log('Alert: Paper low or out of paper!');
}
```

---

## 🖨️ Profile Support

The library uses profiles to handle model-specific commands:

- **'default'**: Standard ESC/POS.
- **'custom-vkp80iii'**: CUSTOM VKP80III (Uses FS P for advanced cut/eject).
- **'bematech-mp4200th'**: Bematech MP-4200 TH in ESC/POS mode.

You can also register model profiles at runtime with `registerProfile(...)`, or use an isolated registry with `createProfileRegistry(...)` for multi-tenant applications.

---

## ⚙️ Reliability and Safety Notes

- `flush()` is transactional: if adapter write fails, payload is preserved in buffer for retry/recovery.
- Printer I/O is serialized internally for `flush()`, `close()`, and `getStatus()` to reduce race conditions in concurrent flows.
- Passing an unknown profile id now fails fast with a descriptive error instead of silently falling back.

---

## ✅ Reliability

- **138 Unit and Integration Tests.**
- **Strict TypeScript:** Full type safety for the entire ESC/POS command set.
- **Spec-Validated:** QR Code aligned to ESC/POS GS ( k (Functions 165/167/169/180/181) and industrial connection lifecycles.

---

**Built with ❤️ for mission-critical systems.**

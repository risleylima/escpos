# escpos Project Architecture (Industrial Grade)

This document describes the architectural decisions and design patterns applied in the `@risleylima/escpos` library.

## 1. Agnosticism Principles

The primary differentiator of this library is the total separation between **WHAT** to print and **HOW** to transport it.

### Transport Agnostic (IO Agnostic)
The `Printer` class has no hardware dependencies. It operates on an `AdapterLike` interface, which is a data stream abstraction.
- **Serialization:** All IO operations are synchronized at both the `Printer` level (`ioChain`) and `Adapter` level (`synchronized`). This prevents data interleaving in high-concurrency environments.
- **Flow Control:** Adapters implement **Chunking** (e.g., 8KB chunks) to prevent overflowing hardware reception buffers.

### Model Agnostic (Model Agnostic)
Although ESC/POS is a "standard," every manufacturer implements variations.
- **Profiles:** The system abstracts model-specific quirks (e.g., cut commands, QR strategies).
- **Isolated Registries:** For multi-tenant applications, `createProfileRegistry()` allows maintaining independent sets of custom profiles without global state conflicts.

## 2. Fundamental Principles (SOLID)

### Single Responsibility (SRP)
- **Adapters:** Focused exclusively on the byte transport layer (USB, Serial, Network).
- **Printer:** Responsible for generating ESC/POS protocol commands.
- **ImageLoader:** Specialized in decoding multiple formats (including SVG and Adam7 PNG).

### Dependency Inversion (DIP)
The `Printer` class receives an `AdapterLike` interface, allowing you to swap between USB, Serial, or Network at runtime without logic changes.

## 3. Industrial Performance & Safety

### SpecBuffer (O(n))
Chunk-based accumulation system. Concatenation occurs only during `flush()`, minimizing GC pressure.
- **Memory Protection:** `maxBufferSize` (default 10MB) prevents Out-of-Memory (OOM) crashes in case of rogue application loops.
- **Transactional Flush:** If a write fails, the buffer is preserved (`prepend`) allowing for automated retry/recovery.

### Image Manipulation
Optimized to handle buffers directly. 
- **Non-blocking:** Uses `setImmediate` yields during heavy pixel processing (PNG/BMP) to keep the Node.js Event Loop responsive.
- **SVG Engine:** Uses `resvg` for high-fidelity vector rendering, automatically flattening transparency over white for thermal compatibility.

## 4. Strict Typing
The project uses TypeScript in `strict` mode, ensuring type safety across the entire command processing chain.

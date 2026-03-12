# escpos Project Architecture (Industrial Grade)

This document describes the architectural decisions and design patterns applied in the `@risleylima/escpos` library.

## 1. Agnosticism Principles

The primary differentiator of this library is the total separation between **WHAT** to print and **HOW** to transport it.

### Transport Agnostic (IO Agnostic)
The `Printer` class has no hardware dependencies. It operates on an `AdapterLike` interface, which is a data stream abstraction.
- **Advantage:** If a new protocol emerges (e.g., Bluetooth or WebSocket), you only need to create a new adapter. Your application code that generates the receipt remains **identical**.

### Model Agnostic (Model Agnostic)
Although ESC/POS is a "standard," every manufacturer implements variations (e.g., different cut commands or paper widths).
- **Advantage:** The **Profiles** system abstracts these differences. Your application calls `printer.cut()`, and the profile decides whether to send `GS V 0` or `ESC i`.

## 2. Fundamental Principles (SOLID)

### Single Responsibility (SRP)
- **Adapters:** Focused exclusively on the byte transport layer (USB, Serial, Network).
- **Printer:** Responsible for generating ESC/POS protocol commands.
- **Image/ImageLoader:** Focused on pixel matrix manipulation and file loading.

### Open/Closed (OCP)
- The **Profiles** system allows extending support to new printers without modifying the main `Printer` class.
- New adapters can be created by inheriting from the `Adapter` abstract class.

### Dependency Inversion (DIP)
- The `Printer` class does not depend on concrete hardware implementations. It receives an `AdapterLike` interface, allowing you to swap between USB, Serial, or Network at runtime.

## 3. Industrial Performance

### SpecBuffer (O(n))
Unlike naive implementations that concatenate buffers on every write, we use a chunk-based accumulation system. Concatenation occurs only during the `flush()` call, minimizing Garbage Collector pressure.

### Transactional Flush
The `Printer` flush path is transactional: if the adapter write fails, payload is re-queued into the internal buffer so callers can retry without losing print data.

### Serialized Printer I/O
Critical operations (`flush`, `close`, `getStatus`) are serialized internally to reduce race conditions when multiple async flows interact with the same printer instance.

### Image Manipulation
The image loading process is optimized to handle buffers directly, avoiding the overhead of intermediate conversions to base64 or binary strings. It uses `setImmediate` to ensure the Node.js Event Loop remains responsive during heavy processing.

## 4. Strict Typing
The project uses TypeScript in `strict` mode, ensuring type safety across the entire command processing chain.

# Printer Commands API (High-Level ESC/POS Abstraction)

This document is the practical reference for the `Printer` command abstraction.
It focuses on **how to call each method**, accepted values, defaults, and expected behavior.

---

## 1) Operating model

- `Printer` is a buffered command builder.
- Most methods return `this` and only append bytes to the internal buffer.
- Data is actually sent to the device only on `await printer.flush()` (or `await printer.close()`).

Basic flow:

```ts
import { Network, Printer } from '@risleylima/escpos';

const adapter = new Network();
await adapter.connect('10.102.224.60', 2000);
await adapter.open();

const printer = new Printer(adapter, { profile: 'default', width: 80 });
printer.textln('Hello').cut();
await printer.flush();
await adapter.close();
```

---

## 2) Constructor and options

```ts
new Printer(adapter, options?)
```

### `PrinterOptions`

- `encoding?: string` default text encoding (default: `utf8`)
- `width?: number` software line width in characters
- `profile?: string | PrinterProfile` profile id (for example: `default`, `custom-vkp80iii`, `bematech-mp4200th`) or custom profile object
- `ticketPresentation?: TicketPresentationOptions` default options passed to profile ticket presentation hooks
- `profileRegistry?: ProfileRegistry` isolated registry for multi-tenant/runtime isolation
- `maxBufferSize?: number` max buffered bytes before overflow error (default: 10MB)

Behavior notes:

- If `profile` is a string and cannot be resolved, constructor throws.
- Default width is `options.width ?? profile.defaultPaperWidth ?? 80`.

---

## 3) Text and layout commands

### Raw print primitives

| Method | Purpose |
|---|---|
| `print(content: string \| Buffer)` | Appends content as-is (string uses ASCII) |
| `println(content: string \| Buffer)` | Same as `print` plus newline |
| `newLine()` | Appends one newline |
| `text(content: string, encoding?: string)` | Encoded text with profile codepage auto-switch support |
| `textln(content: string, encoding?: string)` | `text` plus newline |

### Alignment helpers

| Method | Accepted values |
|---|---|
| `align(align: string)` | `lt`, `ct`, `rt` (case-insensitive) |
| `center(content, encoding?)` | Temporary center, then back to left |
| `centerln(content, encoding?)` | Same as `center` with newline |
| `right(content, encoding?)` | Temporary right, then back to left |
| `rightln(content, encoding?)` | Same as `right` with newline |

### Font and style

| Method | Accepted values / behavior |
|---|---|
| `font(family: string)` | `A`, `B`, `C` |
| `style(type: string)` | `B`, `I`, `U`, `U2`, `BI`, `BIU`, `BIU2`, `BU`, `BU2`, `IU`, `IU2`, `NORMAL` |
| `size(width: number, height: number)` | Character scale from 1..8 (internally clamped) |
| `spacing(n?: number \| null)` | Character spacing (`0..255`); undefined/null resets to default |
| `lineSpace(n?: number \| null)` | Line spacing (`0..255`); undefined/null resets to default |

Important:

- Bold text is done with `style('b')`.
- To return to normal style, use `style('normal')`.
- `font()` updates internal `width` heuristically (`A` => base width, `B/C` => wider estimate).

### Table and ticket helpers

| Method | Purpose |
|---|---|
| `drawLine(character = '-')` | Draws a full-width line and newline |
| `section(title, encoding?)` | Separator + centered title + separator |
| `row(columns, encoding?)` | Fixed-width row formatter |
| `tableCustom(columns, encoding?)` | Alias to `row`; supports decimal widths (`0.5` = 50%) |
| `lineItem(desc, price, optionsOrEncoding?, encoding?)` | Typical 2-column item line |
| `lineItemWithQty(desc, qty, price, optionsOrEncoding?, encoding?)` | Typical 3-column line |
| `total(label, value, optionsOrEncoding?, encoding?)` | Total row (bold by default). Options: `{ bold?: boolean }`. |

`row` column shape:

```ts
type RowColumn = {
  text: string;
  width: number;
  align?: 'left' | 'right' | 'center';
};
```

`lineItem`/`lineItemWithQty` options:

```ts
type LineItemOptions = {
  descWidth?: number;
  priceWidth?: number;
  qtyWidth?: number;
};
```

---

## 4) Paper, feed, and hardware

| Method | Purpose |
|---|---|
| `feed(n = 1)` | Writes `n` line feeds (`0..255`) |
| `feedLines(n)` | Uses ESC/POS feed-lines command (`0..255`) |
| `control(ctrl)` | Control sequence: `LF`, `GLF`, `FF`, `CR`, `HT`, `VT` |
| `cut(part = true, feed = 3)` | Feed + partial/full cut + optional profile presentation command |
| `presentTicket(options?)` | Profile-aware presenter flow (falls back to `cut`) |
| `paperWidth(width)` | Updates software width and sends profile hardware width command when available |
| `margin(type, size)` | `LEFT`, `RIGHT`, `BOTTOM` |
| `marginBottomCancel()` | Cancels bottom margin |
| `hardware(hw)` | `INIT`, `SELECT`, `RESET` |
| `beep(n = 1, t = 1)` | Buzzer command |
| `cashdraw(pin = 2)` | Drawer pulse on pin `2` or `5` |

### Ticket presentation (`presentTicket`)

```ts
printer.presentTicket({
  feed: 4,
  part: true,
  // plus model-specific presentation fields handled by profile hooks
});
```

If profile does not implement presentation hooks, `presentTicket()` degrades gracefully to `cut()`.

---

## 5) Graphics and images

| Method | Purpose |
|---|---|
| `image(image, density = 'd24')` | Legacy bit-image path (`s8`, `d8`, `s24`, `d24`) |
| `raster(image, mode = 'normal')` | Raster path (`normal`, `dw`, `dh`, `dwdh`) |

`image`/`raster` require an `Image` instance:

```ts
import { Image } from '@risleylima/escpos';
const logo = await Image.load('./assets/logo.png');
printer.raster(logo, 'normal');
```

---

## 6) Barcode and 2D codes

### `barcode(code, type = 'EAN13', options?)`

Supported `type` values:

- `UPC-A`, `UPC-E`, `EAN13`, `EAN8`, `CODE39`, `ITF`, `NW7`, `CODABAR`, `CODE93`, `CODE128`, `CODE32`

`BarcodeOptions`:

```ts
type BarcodeOptions = {
  width?: number;       // 1..5
  height?: number;      // 1..255
  position?: string;    // off | abv | blw | bth
  font?: string;        // A | B
  includeParity?: boolean; // default true for EAN8/EAN13 auto parity cases
};
```

Validation notes:

- `EAN13` requires 12 or 13 digits.
- `EAN8` requires 7 or 8 digits.
- `CODE32` (Italian pharmacy) requires 8 or 9 numeric digits.
- `CODABAR` uses the same ESC/POS opcode as `NW7`.
- `CODE93` and `CODE128` use GS k format 2 in this driver (length-prefixed, no trailing `NUL`).
- `CODE128` requires a code set selector (`{A`, `{B`, `{C`); when omitted, the driver auto-prefixes `{B`.
- Parity digit is auto-calculated when applicable and `includeParity !== false`.

### `qrcode(code, options?)`

`QrCodeOptions`:

```ts
type QrCodeOptions = {
  model?: number; // default 2 for native
  size?: number;  // module size
  level?: 'L' | 'M' | 'Q' | 'H';
  strategy?: 'native' | 'raster' | 'auto';
  position?: 'left' | 'center' | 'right'; // raster only
  offsetCols?: number; // raster only, horizontal calibration in columns
};
```

Strategy behavior:

- `native`: sends ESC/POS `GS ( k` flow.
- `raster`: renders QR matrix in memory and sends as raster image.
- `auto`: uses profile preference and capability hints.

### `code2d(code, type = 'QR', level?)`

Legacy 2D flow (`ESC Z` / `GS Z`) for compatibility:

- `type`: `PDF417` | `DATAMATRIX` | `QR`
- `level`: `L` | `M` | `Q` | `H` (QR level when applicable)

Prefer `qrcode(...)` for modern QR where possible.

---

## 7) Color, reverse, and raw access

| Method | Purpose |
|---|---|
| `color(0 \| 1)` | Select color channel |
| `setReverseColors(bool)` | Reverse on/off (`GS B`) |
| `setReverseColorsAlt(bool)` | Alternate reverse command pair |
| `raw(data: Buffer \| string)` | Sends raw bytes directly (`string` must be even-length hex) |
| `setCharacterCodeTable(codeTable)` | Sends `ESC t n` directly |
| `encode(encoding)` | Changes default text encoding for future `text/textln` calls |

Use `raw(...)` only when you need command-level control not exposed by the high-level API.

---

## 8) IO and reliability commands

| Method | Return | Notes |
|---|---|---|
| `flush()` | `Promise<this>` | Sends current buffer. On write failure, payload is prepended back (transactional behavior). |
| `close(options?)` | `Promise<this>` | Flushes pending buffer then closes adapter. `options`: `{ timeout?: number }`. |
| `getStatus(type?)` | `Promise<Buffer>` | Reads real-time status (`PRINTER`, `OFFLINE`, `ERROR`, `PAPER`). |
| `recover(options?)` | `Promise<RecoverResult>` | Adapter recover + profile/global printer baseline reset. |

`RecoverOptions`:

```ts
type RecoverOptions = {
  transport?: boolean; // default true
  checkStatus?: boolean; // default false
  settleMs?: number; // default 120
  keepBuffer?: boolean; // default false
};
```

`RecoverResult`:

```ts
type RecoverResult = {
  printer?: Buffer;
  offline?: Buffer;
  error?: Buffer;
  paper?: Buffer;
  discardedBuffer?: Buffer;
};
```

Production recommendation:

1. On transport/protocol failure, call `await printer.recover(...)`.
2. Inspect `discardedBuffer` (if any) for retry/logging policy.
3. Retry `flush()` only after successful recovery.

---

## 9) Example: full high-level ticket

```ts
printer
  .hardware('init')
  .align('ct')
  .style('b')
  .textln('CAFE NODE & BYTE')
  .style('normal')
  .drawLine()
  .align('lt')
  .lineItem('Double Espresso', 'R$ 7.00')
  .lineItemWithQty('Cookie', 2, 'R$ 8.00')
  .drawLine()
  .total('TOTAL', 'R$ 15.00')
  .newLine()
  .qrcode('https://example.com/order/123', {
    strategy: 'raster',
    size: 6,
    level: 'M',
    position: 'center',
    offsetCols: 0,
  })
  .feed(2)
  .cut();

await printer.flush();
```

---

## 10) Related docs

- Profile extension contract: `docs/architecture/PROFILE_CONTRACT.md`
- Protocol overview and command families: `docs/architecture/PROTOCOL_IMPLEMENTATION.md`
- Model-specific notes:
  - `docs/architecture/VKP80III_PROFILE.md`
  - `docs/architecture/BEMATECH_MP4200TH_PROFILE.md`

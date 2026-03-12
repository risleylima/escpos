# Printer Commands Recipes

This guide provides copy-paste patterns for common scenarios using the high-level `Printer` API.

---

## 1) Minimal network ticket

```ts
import { Network, Printer } from '@risleylima/escpos';

const adapter = new Network();
await adapter.connect('10.102.224.60', 2000);
await adapter.open();

const printer = new Printer(adapter, { profile: 'default', width: 80 });

printer
  .align('ct')
  .style('b')
  .textln('HELLO')
  .style('normal')
  .feed(2)
  .cut();

await printer.flush();
await adapter.close();
```

---

## 2) Styled text blocks (bold, underline, centered)

```ts
printer
  .align('ct')
  .style('b')
  .textln('CAFE NODE & BYTE')
  .style('normal')
  .align('lt')
  .style('u')
  .textln('Table 07')
  .style('normal')
  .newLine();
```

Key values:

- `style('b')` -> bold on
- `style('u')` / `style('u2')` -> underline modes
- `style('normal')` -> clear style

---

## 3) Itemized ticket layout

```ts
printer
  .section('Order #A104')
  .lineItemWithQty('Double Espresso', 2, 'R$ 14.00')
  .lineItem('Cheese Bread', 'R$ 9.00')
  .lineItem('Mineral Water', 'R$ 4.00')
  .drawLine()
  .total('TOTAL', 'R$ 27.00')
  .newLine();
```

---

## 4) QR Code strategies

### Native QR (sharpest when firmware supports it)

```ts
printer.qrcode('https://example.com/pay/123', {
  strategy: 'native',
  model: 2,
  size: 6,
  level: 'M',
});
```

### Raster QR (compatibility-first)

```ts
printer.qrcode('https://example.com/pay/123', {
  strategy: 'raster',
  size: 6,
  level: 'M',
  position: 'center',
  offsetCols: 0,
});
```

### Auto QR (profile-driven)

```ts
printer.qrcode('https://example.com/pay/123', {
  strategy: 'auto',
  size: 6,
  level: 'M',
});
```

When raster alignment is not exact on generic firmware:

- keep `position: 'left' | 'center' | 'right'`
- calibrate with `offsetCols` (`+` right, `-` left)

---

## 5) Barcode (EAN13 / CODE128)

```ts
printer.barcode('789123456789', 'EAN13', {
  width: 2,
  height: 90,
  position: 'blw',
  font: 'A',
});

printer.feed(1);

printer.barcode('ORDER-00001234', 'CODE128', {
  width: 2,
  height: 80,
  position: 'off',
});
```

---

## 6) Images (logo)

```ts
import { Image } from '@risleylima/escpos';

const logo = await Image.load('./assets/logo.png');

printer
  .align('ct')
  .raster(logo, 'normal')
  .align('lt')
  .newLine();
```

Supported `Image.load(...)` formats include PNG (Adam7), BMP, JPEG, GIF, and SVG.

---

## 7) Profile-aware ticket presentation

```ts
const printer = new Printer(adapter, {
  profile: 'custom-vkp80iii',
  ticketPresentation: { station: 1, mode: 69, distance: 10 },
});

printer
  .textln('PARKING VALIDATED')
  .presentTicket({ feed: 3, part: true })
  .flush();
```

For models without presenter support, `presentTicket(...)` falls back to normal cut.

---

## 8) Transactional flush + recovery pattern

```ts
try {
  await printer.flush();
} catch (error) {
  const recovery = await printer.recover({ checkStatus: true });
  // Optional: inspect recovery.discardedBuffer for logging/retry policy.
  throw error;
}
```

Why this pattern:

- `flush()` preserves payload on write failure by prepending it back to buffer.
- `recover()` re-establishes transport and printer baseline before next send.

---

## 9) Advanced raw command injection

```ts
// Hex string (must be even-length and valid hex)
printer.raw('1b401b6101');

// Or explicit Buffer
printer.raw(Buffer.from([0x1b, 0x40]));
```

Use `raw()` sparingly, mainly for diagnostics or firmware-specific commands not yet abstracted.

---

## 10) Recommended sequence for production jobs

1. `connect` + `open` adapter
2. create `Printer(adapter, { profile, width, ... })`
3. build ticket with fluent API
4. `await printer.flush()`
5. on error: `await printer.recover(...)`
6. `await adapter.close()`

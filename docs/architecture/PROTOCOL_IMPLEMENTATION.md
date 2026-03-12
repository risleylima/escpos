# ESC/POS Protocol Implementation

This document details the support for low-level commands and the references used.

## 1. Primary Technical References

Official reference manuals are available in the `docs/specs/` directory:
- **Core Reference:** `escp2ref.pdf` (Epson ESC/P Reference).
- **Command Manual:** `Commande ESCPOS.pdf` (Generic specification).
- **Manufacturer Manuals (Custom):** `Manual-de-Progamacion.pdf` and `CUSTOM-MANUAL.PDF`.

## 2. Implemented Commands

### Text and Formatting
- **ESC t n:** Automated Codepage switching based on profile (UTF-8, Latin1, CP860, etc).
- **ESC ! n:** Font styles (Bold, Italic, Underline, Double Width/Height).
- **GS ! n:** Custom character size (up to 8x).
- **ESC a n:** Alignment (Left, Center, Right).

### Graphics (Images)
- **ESC * m nL nH d1...dk:** Bit Image (Supports d8, s8, d24, s24 densities).
- **GS v 0 m xL xH yL yH d1...dk:** Raster Bit Image (Optimized method for modern images).

### Barcodes
- Native support for **UPC-A, UPC-E, EAN13, EAN8, CODE39, ITF, NW7, CODE93, CODE128**.
- Automated **Parity Digit** calculation for EAN8 and EAN13.

### Modern QR Code
- **GS ( k (Functions 165/167/169/180/181):** High-level implementation that dynamically calculates payload size and follows the official ESC/POS QR flow (model, module size, error correction, store, print).

### Real-time Status
- **DLE EOT n:** Real-time printer status transmission. Essential for detecting "Out of Paper" or "Cover Open" conditions before/during print jobs.

### Other Features
- **ESC p m t1 t2:** Cash drawer kick-out.
- **ESC B n t:** Configurable beep/buzzer.
- **GS V m n:** Paper cut (Full or Partial) with automatic feed.

## 3. Profiles System

Different manufacturers implement the protocol with variations. Our profiles system (`src/printer/profiles`) allows handling these exceptions:
- **Eject After Cut:** Some printers (e.g., VKP80III) require extra ejection commands after cutting.
- **Paper Width:** Configurable line width (42, 48, 56, 80 columns).
- **Custom Commands:** Overriding byte sequences for specific manufacturer commands.
- **Codepage Mapping:** Mapping encoding strings (e.g., 'utf8') to hardware codepage IDs.

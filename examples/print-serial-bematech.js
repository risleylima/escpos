'use strict';

/**
 * Bematech MP-4200 TH serial test example.
 *
 * Usage:
 *   node examples/print-serial-bematech.js
 *   node examples/print-serial-bematech.js /dev/tty.usbmodem112301 115200 auto both
 *
 * Args:
 *   [2] serial port path (default: /dev/tty.usbmodem112301)
 *   [3] baudRate (default: 115200)
 *   [4] qrStrategy: native|raster|auto (default: auto)
 *   [5] symbolMode: both|qr|pdf417|none (default: both)
 */

const path = require('path');
const { Serial, Printer, Image } = require('../dist/index.js');

const SERIAL_PORT = process.argv[2] || '/dev/tty.usbmodem112301';
const BAUD_RATE = parseInt(process.argv[3] || '115200', 10);
const QR_STRATEGY = (process.argv[4] || 'auto').toLowerCase();
const SYMBOL_MODE = (process.argv[5] || 'both').toLowerCase();

const VALID_QR_STRATEGIES = new Set(['native', 'raster', 'auto']);
const VALID_SYMBOL_MODES = new Set(['both', 'qr', 'pdf417', 'none']);

function padCenter(value, width) {
  const s = String(value);
  const pad = Math.max(0, width - s.length);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return `${' '.repeat(left)}${s}${' '.repeat(right)}`;
}

async function main() {
  if (!VALID_QR_STRATEGIES.has(QR_STRATEGY)) {
    throw new Error(`Invalid qrStrategy: ${QR_STRATEGY}. Use native, raster, auto.`);
  }
  if (!VALID_SYMBOL_MODES.has(SYMBOL_MODE)) {
    throw new Error(`Invalid symbolMode: ${SYMBOL_MODE}. Use both, qr, pdf417, none.`);
  }

  const adapter = new Serial();
  const printer = new Printer(adapter, {
    encoding: 'ascii',
    width: 48,
    profile: 'bematech-mp4200th',
  });

  const logoPath = path.resolve(__dirname, '../assets/logo-ticket-node-byte.png');
  const logo = await Image.load(logoPath, 'image/png', {
    mode: 'floydSteinberg',
    threshold: 220,
  });

  const now = new Date();
  const id = Math.floor(Math.random() * 900000) + 100000;
  const qrPayload = `https://vale.exemplo.local/${id}`;
  const pdfPayload = `VALE|ID=${id}|DT=${now.toISOString()}`;

  console.log(`Connecting serial ${SERIAL_PORT} @ ${BAUD_RATE}...`);
  await adapter.connect(SERIAL_PORT, { baudRate: BAUD_RATE });
  await adapter.open();
  console.log('Connected. Printing Bematech test...');

  try {
    printer
      .hardware('init')
      .align('ct')
      .raster(logo)
      .feed(1)
      .textln('BEMATECH MP-4200 TH')
      .textln(padCenter('SERIAL PROFILE TEST', 48))
      .drawLine('-')
      .align('lt')
      .textln(`PORT: ${SERIAL_PORT}`)
      .textln(`BAUD: ${BAUD_RATE}`)
      .textln(`SYMBOL MODE: ${SYMBOL_MODE.toUpperCase()}`)
      .textln(`QR STRATEGY: ${QR_STRATEGY.toUpperCase()}`)
      .textln(`ID: ${id}`)
      .drawLine('-')
      .align('ct');

    if (SYMBOL_MODE === 'both' || SYMBOL_MODE === 'qr') {
      printer
        .textln('QR CODE')
        .qrcode(qrPayload, { size: 6, level: 'M', strategy: QR_STRATEGY })
        .feed(1);
    }

    if (SYMBOL_MODE === 'both' || SYMBOL_MODE === 'pdf417') {
      printer
        .textln('PDF417 (code2d)')
        .code2d(pdfPayload, 'PDF417')
        .feed(1);
    }

    printer
      .barcode(String(id).padStart(10, '0'), 'CODE93', {
        width: 2,
        height: 100,
        position: 'blw',
      })
      .feed(2)
      .cut(false);

    await printer.flush();
    console.log('Print sent successfully.');
  } finally {
    await adapter.close({ timeout: 5000 });
    console.log('Serial connection closed.');
  }
}

main().catch((err) => {
  console.error('Serial Bematech test failed:', err.message);
  process.exit(1);
});

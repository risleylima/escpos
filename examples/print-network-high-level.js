'use strict';

/**
 * Prova de fogo: ticket "Cafe Node & Byte" usando apenas abstracao de alto nivel.
 *
 * Uso:
 *   node examples/print-network-high-level.js
 *   node examples/print-network-high-level.js 10.102.224.60 2000 2000
 *
 * Args:
 *   [2] host (default: 10.102.224.60)
 *   [3] port (default: 2000)
 *   [4] lingerMs antes de fechar socket (default: 2000)
 *   [5] logoType: svg|jpg|jpeg|png|adam7|bmp|gif (default: jpg)
 */

const path = require('path');
const { Network, Printer, Image } = require('../dist/index.js');

const HOST = process.argv[2] || '10.102.224.60';
const PORT = parseInt(process.argv[3] || '2000', 10);
const LINGER_MS = parseInt(process.argv[4] || '2000', 10);
const CONNECT_TIMEOUT_MS = 10000;
const WIDTH = 44;
const LOGO_TYPE = (process.argv[5] || 'jpg').toLowerCase();

const LOGO_VARIANTS = {
  svg: {
    file: '../assets/logo-ticket-node-byte.svg',
    mime: 'image/svg+xml',
    label: 'SVG',
  },
  jpg: {
    file: '../assets/logo-ticket-node-byte.jpg',
    mime: 'image/jpeg',
    label: 'JPG',
  },
  jpeg: {
    file: '../assets/logo-ticket-node-byte.jpg',
    mime: 'image/jpeg',
    label: 'JPG',
  },
  png: {
    file: '../assets/logo-ticket-node-byte.png',
    mime: 'image/png',
    label: 'PNG',
  },
  adam7: {
    file: '../assets/logo-ticket-node-byte-adam7.png',
    mime: 'image/png',
    label: 'PNG-ADAM7',
  },
  bmp: {
    file: '../assets/logo-ticket-node-byte.bmp',
    mime: 'image/bmp',
    label: 'BMP',
  },
  gif: {
    file: '../assets/logo-ticket-node-byte.gif',
    mime: 'image/gif',
    label: 'GIF',
  },
};

function brl(value) {
  // ASCII only: avoids locale NBSP/control chars rendered as garbage on some codepages.
  const fixed = Number(value || 0).toFixed(2).replace('.', ',');
  return `R$ ${fixed}`;
}

function buildOrder() {
  return [
    { desc: 'Cafe filtrado 300ml', qty: 2, unit: 7.5 },
    { desc: 'Pao de queijo', qty: 3, unit: 4.0 },
    { desc: 'Brownie da casa', qty: 1, unit: 9.9 },
    { desc: 'Suco laranja 400ml', qty: 1, unit: 11.0 },
  ];
}

async function main() {
  const adapter = new Network();
  const logoVariant = LOGO_VARIANTS[LOGO_TYPE];
  if (!logoVariant) {
    throw new Error(`Tipo de logo nao suportado: ${LOGO_TYPE}. Use: ${Object.keys(LOGO_VARIANTS).join(', ')}`);
  }
  const logoPath = path.resolve(__dirname, logoVariant.file);
  const logo = await Image.load(logoPath, logoVariant.mime, {
    mode: 'floydSteinberg',
    threshold: 220,
  });
  const printer = new Printer(adapter, {
    encoding: 'ascii',
    width: WIDTH,
    profile: 'custom-vkp80iii',
    ticketPresentation: {
      // Defaults from VKP80III manual; can be tuned per installation.
      paramA: 0x14,
      paramB: 0x01,
      paramC: 0x45,
      paramD: 0x0a,
    },
  });

  const now = new Date();
  const orderId = `NB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const barcodeEan13 = '789123456789';
  const items = buildOrder();
  const subtotal = items.reduce((acc, i) => acc + i.qty * i.unit, 0);
  const service = subtotal * 0.1;
  const total = subtotal + service;

  console.log(`Conectando em ${HOST}:${PORT} (high-level, logo ${logoVariant.label})...`);
  await adapter.connect({ host: HOST, port: PORT, timeout: CONNECT_TIMEOUT_MS });
  await adapter.open();
  console.log(
    `Conectado. Montando ticket Cafe Node & Byte... (logo ${logoVariant.label} ${logo.size.width}x${logo.size.height})`
  );

  printer
    .hardware('init')
    .align('ct');

  printer
    .align('ct')
    .raster(logo)
    .feed(1)
    .textln(`TIPO LOGO: ${logoVariant.label}`)
    .feed(1)
    .size(2, 2)
    .textln('CAFE NODE & BYTE')
    .size(1, 1)
    .textln('Rua das APIs, 404 - Sao Paulo')
    .textln('CNPJ 12.345.678/0001-99')
    .drawLine('-')
    .align('lt')
    .textln(`Pedido: ${orderId}`)
    .textln(`Data: ${now.toLocaleString('pt-BR')}`)
    .textln(`Destino: ${HOST}:${PORT}`)
    .drawLine('-')
    .row([
      { text: 'ITEM', width: 24 },
      { text: 'QTD', width: 6, align: 'right' },
      { text: 'TOTAL', width: 14, align: 'right' },
    ]);

  for (const item of items) {
    printer.lineItemWithQty(item.desc, item.qty, brl(item.qty * item.unit), {
      descWidth: 24,
      qtyWidth: 6,
      priceWidth: 14,
    });
  }

  printer
    .drawLine('-')
    .lineItem('Subtotal', brl(subtotal))
    .lineItem('Taxa de servico (10%)', brl(service))
    .total('TOTAL', brl(total))
    .drawLine('-')
    .align('ct')
    .textln('Acompanhe seu pedido')
    .qrcode(`https://pedido.exemplo.local/${orderId}`, { size: 6, level: 'M' })
    .feed(1)
    .barcode(barcodeEan13, 'EAN13', {
      width: 2,
      height: 60,
      font: 'A',
      position: 'blw',
      includeParity: true,
    })
    .feed(1)
    .textln('Volte sempre!')
    .presentTicket({ feed: 3, part: true });

  try {
    await printer.flush();
    console.log(`Ticket enviado. Aguardando ${LINGER_MS}ms antes de fechar...`);
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, LINGER_MS)));
  } finally {
    await adapter.close({ timeout: 5000 });
    console.log('Conexao fechada.');
  }
}

main().catch((err) => {
  console.error('Falha no teste high-level:', err.message);
  process.exit(1);
});


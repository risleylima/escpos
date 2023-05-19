'use strict';
// DEBUGGER
const debug = require('debug')('escpos:test-printer');

//IMPORT USB ADAPTER
const USB = require('../src/usb-adapter');

//IMPORT PRINTER MANAGER
const Printer = require('../src/printer');

let print = async (printer, n) => {
  printer.hardware('init');
  printer
    .beep(2, 1)
    .encode(860)
    .size(2, 2)
    .align('ct')
    .textln('PRINT CUPOM TEST')
    .size(1, 1)
    .textln(`Cupom Nº ${n}`)
    .align('lt')
    .textln(`Mr. Fulano Maluco`)
    .textln(`TEL: +55 (11) 3453-6549`)
    .textln(`ADDRESS: Rua Prof. Vida Louca, 500 - Casa B`)
    .textln(`POSTAL CODE: 56589-085  - MARINGA - PR`)
    .align('ct')
    .textln(`What is your favorite color?`)
    .align('lt')
    .textln('(___) Red')
    .textln('(___) Green')
    .textln('(___) Other: __________________________')
    .align('ct')
    .raw(printer.commands.TEXT_FORMAT.TXT_BOLDER)
    .textln('Check the rules of this promotion')
    .textln('FREE DISTRIBUTION')
    .raw(printer.commands.TEXT_FORMAT.TXT_NORMAL)
    .drawLine()
    .cut(true);

  await printer.flush();
};

(async () => {
  let vid = 1046, pid = 20497;
  await USB.connect(vid, pid);
  const printerDevice = new Printer(USB);

  for (let i = 0; i < 3; i++) {
    await USB.open();
    await print(printerDevice, i);
    debug('Printed ' + i + ' of ' + 3);
    await USB.close();
  }
  await USB.disconnect();
  process.exit();
})().catch(e => {
  debug(e);
  process.exit();
});
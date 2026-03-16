'use strict';
const debug = require('debug')('escpos:test-printer');

const { USB, Printer } = require('@risleylima/escpos');

const print = async (printer, n) => {
  printer.hardware('init');
  printer
    .beep(2, 1)
    .encode('UTF-8')
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
  const vid = 1046;
  const pid = 20497;
  const adapter = new USB();
  await adapter.connect(vid, pid);
  const printerDevice = new Printer(adapter, {
    encoding: 'utf8',
    width: 48,
    profile: 'default',
  });

  for (let i = 0; i < 3; i++) {
    await adapter.open();
    await print(printerDevice, i);
    debug('Printed ' + i + ' of ' + 3);
    await adapter.close();
  }
  await adapter.disconnect();
  process.exit();
})().catch(e => {
  debug(e);
  process.exit();
});
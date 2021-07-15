const USB = require('./src/usb-adapter');
const Serial = require('./src/serial-adapter');
const Printer = require('./src/printer');
const Adapter = require('./src/adapter');
const Image = require('./src/printer/image');

module.exports = { USB, Serial, Printer, Adapter, Image }
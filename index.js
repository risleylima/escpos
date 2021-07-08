const USB = require('./src/usb-adapter');
const printer = require('./src/printer');
const adapter = require('./src/adapter');
const Image = require('./src/printer/image');

module.exports = { USB, printer, adapter, Image }
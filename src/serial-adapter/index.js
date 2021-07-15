'use strict';
const util = require('util');
const EventEmitter = require('events');
const Adapter = require('../adapter');
const SerialPort = require('serialport');

const debug = require('debug')('escpos:serial-adapter');

const scope = {
  device: null
}

const Serial = new EventEmitter();

Serial.connect = async (port, options) => {
  scope.device = null;
  options = options || {
    baudRate: 9600,
    autoOpen: false
  };

  scope.device = new SerialPort(port, options);

  Serial.on('close', () => {
    Serial.emit('disconnect', scope.device);
    scope.device = null;
  });

  Serial.emit('connect', scope.device);
  debug('Device Connected!');
  return true;
};


Serial.open = () => {
  return new Promise((resolve, reject) => {
    scope.device.open((err) => {
      if (err)
        reject(err)
      resolve(true);
    });
  });
};

Serial.write = (data) => {
  return new Promise((resolve, reject) => {
    scope.device.write(data, (e) => {
      // if (e) {
      //   reject(e);
      // }
      resolve(true);
    });
  });
};

Serial.close = (timeout) => {
  let time = Number(timeout);
  if (Number.isNaN(time)) {
    time = 50
  }


  return new Promise((resolve, reject) => {
    scope.device.drain(() => {
      scope.device.flush((err) => {
        setTimeout(() => {
          if (err)
            debug('Error while Flush Device: ', err);

          scope.device.close((errClosing) => {
            if (errClosing)
              debug('Error while Close Device: ', errClosing);
            scope.device = null;
            Serial.emit('close');
            resolve(true);
          })
        });
      }, time);
    });
  });
};

Serial.disconnect = (timeout) => {
  return Serial.close(timeout);
}

Serial.read = () => {
  return new Promise((resolve, reject) => {
    this.device.on('data', (data) => {
      resolve(data);
    });
  })
};

module.exports = new Adapter(Serial);
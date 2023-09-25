'use strict';
const { SerialPort } = require('serialport');
const EventEmitter = require('events');
const Adapter = require('../adapter');

const debug = require('debug')('escpos:serial-adapter');

const scope = {
  port: null,
  verifyPort: async (port) => {
    let ports = await SerialPort.list();
    if (!ports.find((i) => i.path === port)) {
      throw new Error('The specified port does not exist!')
    }
    return port;
  }
}

const Serial = new EventEmitter();

Serial.connect = (port, options) => {
  return new Promise((resolve, reject) => {
    let connectListener = () => {
      Serial.removeListener('close', connectListener);
      scope.verifyPort(port).catch(e => reject(e)).then((portVerified) => {
        if (portVerified) {
          scope.port = new SerialPort(Object.assign(options || {}, { path: portVerified, autoOpen: true }), (err) => {
            if (err) {
              debug('Error Opening the Selected Port: ', err);
              if (scope.port) {
                scope.port.close(async () => {
                  await connectListener();
                })
              }
            }

            let clearPort = () => {
              Serial.emit('disconnect', scope.port);
              scope.port.removeListener('close', clearPort);
              scope.port = null;
            }

            scope.port.on('close', clearPort);

            debug('Device Connected and Open!');
            Serial.emit('connect', scope.port);

            resolve(true);
          });
        }
      });
    }

    Serial.on('close', connectListener);

    if (scope.port) {
      scope.port.close((e) => {
        Serial.emit('close');
      });
    } else {
      Serial.emit('close');
    }
  });
}

Serial.open = () => {
  return new Promise((resolve, reject) => {
    if (!scope.port.isOpen) {
      scope.port.open((err) => {
        if (err)
          reject(err)
        debug('Device Opened!');
        resolve(scope.port.isOpen);
      });
    } else {
      debug('Device is already Opened!');
      resolve(true)
    }
  });
};

Serial.write = (data) => {
  return new Promise((resolve, reject) => {
    scope.port.write(data, (e) => {
      if (e)
        reject(e);
      scope.port.drain(() => {
        resolve(true);
      })
    });
  });
};

Serial.close = (timeout) => {
  let time = Number(timeout);
  if (Number.isNaN(time)) {
    time = 50
  }

  return new Promise((resolve, reject) => {
    scope.port.flush((e) => {
      setTimeout(() => {
        if (e)
          debug('Error while Flush Device: ', e);
        scope.port.drain(() => {
          scope.port.close((eClosing) => {
            if (eClosing)
              debug('Error while Close Device: ', eClosing);
            Serial.emit('close');
            resolve(true);
          });
        })
      }, time);
    });
  });

}

Serial.disconnect = (timeout) => {
  return Serial.close(timeout);
}

Serial.read = () => {
  return new Promise((resolve, reject) => {
    let dataHandler = (data) => {
      scope.port.removeListener('data', dataHandler);
      resolve(data);
    }
    scope.port.on('data', dataHandler);
  });
};

module.exports = new Adapter(Serial);
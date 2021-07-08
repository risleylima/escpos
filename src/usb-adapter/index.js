'use strict'
const { EventEmitter } = require('stream');
const Adapter = require('../adapter');
const usb = require('usb');
const os = require('os');

const debug = require('debug')('escpos:usb-adapter');

const scope = {
  device: null,
  endpoint: null
}

const USB = new EventEmitter();

USB.listUSB = async () => {
  const devices = usb.getDeviceList();
  let retorno = [];

  const getDescriptor = (device, type) => new Promise((resolve, reject) => {
    device.open();
    device.getStringDescriptor(type, (err, data) => {
      if (err) {
        reject(new Error('Error while read selected Description'));
      }
      device.close();
      resolve(data);
    });
  });

  for (let device of devices) {
    device.manufacturer = await getDescriptor(device, device.deviceDescriptor.iManufacturer);
    device.product = await getDescriptor(device, device.deviceDescriptor.iProduct);
    retorno.push(device);
  }

  return retorno;
};

USB.connect = async (vid, pid) => {
  scope.device = null;
  if (vid && pid) {
    scope.device = usb.findByIds(vid, pid);
  }

  if (!scope.device) {
    throw new Error("Cannot find printer!");
  }
  USB.emit('connect', scope.device);

  usb.on('detach', (device) => {
    if (device === scope.device) {
      debug('Device Unplugged!');
      USB.emit('detach');
      scope.device = null;
    }
  });

  debug('Device Connected!');
  return true;
};

USB.open = async () => {
  scope.device.open();
  for (let iface of scope.device.interfaces) {
    if (scope.endpoint) {
      break;
    }

    if ("win32" !== os.platform()) {
      if (iface.isKernelDriverActive()) {
        try {
          iface.detachKernelDriver();
        } catch (e) {
          throw new Error("[ERROR] Could not detatch kernel driver: %s", e);
        }
      }
      iface.claim(); // must be called before using any endpoints of this interface.
    }
    for (let endpoint of iface.endpoints) {
      if (scope.endpoint) {
        break;
      } else if (endpoint.direction == 'out') {
        scope.endpoint = endpoint;
        USB.emit('connect', scope.device);
        debug('Device Opened!');
      }
    }
  }

  if (!scope.endpoint) {
    throw new Error('Can not find endpoint from printer');
  }
  return true;
};

USB.close = async () => {
  if (scope.device) {
    await scope.device.close();
  }

  USB.emit('close', scope.device);
  debug('Device Closed!');
  scope.endpoint = null;

  return true;
}

USB.disconnect = async () => {
  if (scope.device) {
    await USB.close().catch(e => { debug(e); return true });
  }
  USB.emit('disconnect', scope.device);
  debug('Device Disconnected!');
  scope.endpoint = null;
  scope.device = null;

  return true;
}


USB.write = (data) => {
  return new Promise((resolve, reject) => {
    scope.endpoint.transfer(data, (e) => {
      if (e) {
        reject(e);
      }
      resolve(true);
    });
  })
}

module.exports = new Adapter(USB);
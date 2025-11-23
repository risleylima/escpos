'use strict'
const Adapter = require('../adapter');
const usb = require('usb');
const os = require('os');

const debug = require('debug')('escpos:usb-adapter');

const scope = {
  device: null,
  endpoint: null
}

/**
 * [USB Class Codes ]
 * @type {Object}
 * @docs http://www.usb.org/developers/defined_class
 */
const IFACE_CLASS = {
  AUDIO: 0x01,
  HID: 0x03,
  PRINTER: 0x07,
  HUB: 0x09
};

// Create Adapter instance first, so it's the same object used internally and exported
const USB = new Adapter();

/**
 * List all available USB printer devices
 * @async
 * @returns {Promise<Array>} Array of USB printer devices with manufacturer and product information
 */
USB.listUSB = async () => {
  const devices = usb.getDeviceList().filter((device) => {
    try {
      // In v2, we need to check configDescriptor for interface class
      const configDescriptor = device.configDescriptor;
      if (!configDescriptor || !configDescriptor.interfaces) {
        return false;
      }
      // configDescriptor.interfaces is an array of arrays (alternate settings)
      return configDescriptor.interfaces.some((ifaceArray) => {
        return ifaceArray.some((iface) => {
          return iface.bInterfaceClass === IFACE_CLASS.PRINTER;
        });
      });
    } catch (e) {
      debug('Error while get device info: ', e);
      return false;
    }
  });

  let retorno = [];

  /**
   * Get string descriptor from USB device
   * @private
   * @async
   * @param {Object} device - USB device object
   * @param {Number} type - Descriptor type index
   * @returns {Promise<String|Boolean>} Descriptor string or false on error
   */
  const getDescriptor = async (device, type) => {
    try {
      await device.open();
      const data = await device.getStringDescriptor(type);
      await device.close();
      return data;
    } catch (e) {
      debug('Error while read device description: ', e);
      try {
        await device.close();
      } catch (closeErr) {
        // Ignore close errors
      }
      return false;
    }
  };

  for (let device of devices) {
    device.manufacturer = await getDescriptor(device, device.deviceDescriptor.iManufacturer);
    device.product = await getDescriptor(device, device.deviceDescriptor.iProduct);
    if (device.manufacturer && device.product) {
      retorno.push(device);
    }
  }

  return retorno;
};

/**
 * Connect to a USB printer device
 * @async
 * @param {Number} [vid] - Vendor ID (optional, if not provided, uses first available printer)
 * @param {Number} [pid] - Product ID (optional, if not provided, uses first available printer)
 * @returns {Promise<Boolean>} True if connection successful
 * @throws {Error} If printer cannot be found
 * @fires USB#connect
 */
USB.connect = async (vid, pid) => {
  scope.device = null;
  scope.endpoint = null;
  if (vid && pid) {
    scope.device = usb.findByIds(vid, pid);
  }else{
    let devices = await USB.listUSB();
    if(devices && devices.length)
      scope.device = devices[0];
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

/**
 * Open the USB device and claim the printer interface
 * @async
 * @returns {Promise<Boolean>} True if device opened successfully
 * @throws {Error} If interfaces cannot be accessed or endpoint not found
 * @fires USB#connect
 */
USB.open = async () => {
  await scope.device.open();
  
  // In v2, device.interfaces is a direct array of Interface objects
  // We need to iterate through all interfaces to find the printer interface
  const interfaces = scope.device.interfaces;
  if (!interfaces || interfaces.length === 0) {
    throw new Error('Cannot access device interfaces');
  }

  for (let interfaceObj of interfaces) {
    if (scope.endpoint) {
      break;
    }

    // Check if this interface is a printer interface
    const descriptor = interfaceObj.descriptor;
    if (descriptor && descriptor.bInterfaceClass !== IFACE_CLASS.PRINTER) {
      continue;
    }

    // Claim interface (required on all platforms)
    if ("win32" !== os.platform()) {
      // On Linux/macOS, detach kernel driver first if active
      if (interfaceObj.isKernelDriverActive()) {
        try {
          await interfaceObj.detachKernelDriver();
        } catch (e) {
          throw new Error(`[ERROR] Could not detach kernel driver: ${e.message}`);
        }
      }
    }
    // Claim interface (required on all platforms before using endpoints)
    await interfaceObj.claim();
    
    for (let endpoint of interfaceObj.endpoints) {
      if (scope.endpoint) {
        break;
      } else if (endpoint.direction === 'out') {
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

/**
 * Close the USB device connection and release interfaces
 * @async
 * @returns {Promise<Boolean>} True if device closed successfully
 * @fires USB#close
 */
USB.close = async () => {
  const device = scope.device; // Save device reference before cleanup
  
  if (scope.device) {
    try {
      // Release interfaces before closing
      // Only release the interface we actually claimed
      if (scope.endpoint && scope.endpoint.interface) {
        const interfaceObj = scope.endpoint.interface;
        try {
          // Check if interface is still valid and was claimed
          if (interfaceObj && typeof interfaceObj.release === 'function') {
            await interfaceObj.release();
          }
        } catch (e) {
          debug('Error releasing interface: ', e);
        }
      } else {
        // Fallback: try to release all interfaces
        const interfaces = scope.device.interfaces;
        if (interfaces && interfaces.length > 0) {
          for (let interfaceObj of interfaces) {
            try {
              // Only release if we claimed it (kernel driver was detached)
              if (interfaceObj && typeof interfaceObj.release === 'function' && !interfaceObj.isKernelDriverActive()) {
                await interfaceObj.release();
              }
            } catch (e) {
              debug('Error releasing interface: ', e);
            }
          }
        }
      }
      await scope.device.close();
    } catch (e) {
      debug('Error closing device: ', e);
    }
  }

  // Clear endpoint before emitting event
  scope.endpoint = null;
  
  // Emit event synchronously - this ensures listeners are called immediately
  USB.emit('close', device);
  debug('Device Closed!');

  return true;
}

/**
 * Disconnect from the USB device (calls close internally)
 * @async
 * @returns {Promise<Boolean>} True if disconnection successful
 * @fires USB#disconnect
 */
USB.disconnect = async () => {
  const device = scope.device; // Save device reference before cleanup
  
  if (scope.device) {
    await USB.close().catch(e => { debug(e); return true });
  }
  
  // Clear scope before emitting event
  scope.endpoint = null;
  scope.device = null;
  
  // Emit event synchronously - this ensures listeners are called immediately
  USB.emit('disconnect', device);
  debug('Device Disconnected!');

  return true;
}

/**
 * Write data to the USB printer
 * @async
 * @param {Buffer} data - Data buffer to send to printer
 * @returns {Promise<Boolean>} True if write successful
 * @throws {Error} If write fails
 */
USB.write = async (data) => {
  try {
    await scope.endpoint.transfer(data);
    return true;
  } catch (e) {
    throw e;
  }
}

// USB is already an Adapter instance, so export it directly
module.exports = USB;
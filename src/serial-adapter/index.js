'use strict';
const { SerialPort } = require('serialport');
const Adapter = require('../adapter');

const debug = require('debug')('escpos:serial-adapter');

const scope = {
  port: null,
  /**
   * Verify that a serial port exists
   * @private
   * @async
   * @param {String} port - Serial port path to verify
   * @returns {Promise<String>} Verified port path
   * @throws {Error} If port does not exist
   */
  verifyPort: async (port) => {
    let ports = await SerialPort.list();
    if (!ports.find((i) => i.path === port)) {
      throw new Error('The specified port does not exist!')
    }
    return port;
  }
}

// Create Adapter instance first, so it's the same object used internally and exported
const Serial = new Adapter();

/**
 * Connect to a serial port printer
 * @async
 * @param {String} port - Serial port path (e.g., '/dev/ttyUSB0' or 'COM3')
 * @param {Object} [options] - Serial port options (baudRate, dataBits, etc.)
 * @returns {Promise<Boolean>} True if connection successful
 * @throws {Error} If port does not exist or cannot be opened
 * @fires Serial#connect
 * @fires Serial#close (if reconnecting)
 */
Serial.connect = async (port, options) => {
  // Close existing connection if any
  if (scope.port) {
    try {
      await scope.port.close();
    } catch (e) {
      debug('Error closing existing port: ', e);
    }
    Serial.emit('close');
  }

  // Verify port exists
  const portVerified = await scope.verifyPort(port);
  
  // Create SerialPort instance (v13: no callback, autoOpen: false)
  scope.port = new SerialPort(Object.assign(options || {}, { 
    path: portVerified, 
    autoOpen: false 
  }));

  // Handle errors via events
  scope.port.on('error', (err) => {
    debug('Error on Serial Port: ', err);
  });

  // Handle close event
  let clearPort = () => {
    Serial.emit('disconnect', scope.port);
    scope.port.removeListener('close', clearPort);
    scope.port = null;
  };
  scope.port.on('close', clearPort);

  // Open the port manually (v13: returns Promise)
  try {
    await scope.port.open();
    debug('Device Connected and Open!');
    Serial.emit('connect', scope.port);
    return true;
  } catch (err) {
    debug('Error Opening the Selected Port: ', err);
    if (scope.port) {
      try {
        await scope.port.close();
      } catch (closeErr) {
        debug('Error closing port after open failure: ', closeErr);
      }
    }
    throw err;
  }
}

/**
 * Open the serial port if it's closed
 * @async
 * @returns {Promise<Boolean>} True if port is open (or was already open)
 * @throws {Error} If port cannot be opened
 */
Serial.open = async () => {
  if (!scope.port.isOpen) {
    try {
      await scope.port.open();
      debug('Device Opened!');
      return scope.port.isOpen;
    } catch (err) {
      throw err;
    }
  } else {
    debug('Device is already Opened!');
    return true;
  }
};

/**
 * Write data to the serial port
 * @async
 * @param {Buffer} data - Data buffer to send to printer
 * @returns {Promise<Boolean>} True if write successful
 * @throws {Error} If write fails
 */
Serial.write = async (data) => {
  try {
    await scope.port.write(data);
    await scope.port.drain();
    return true;
  } catch (e) {
    throw e;
  }
};

/**
 * Close the serial port connection
 * @async
 * @param {Number} [timeout] - Timeout in milliseconds before closing (default: 50ms)
 * @returns {Promise<Boolean>} True if port closed successfully
 * @fires Serial#close
 */
Serial.close = async (timeout) => {
  let time = Number(timeout);
  if (Number.isNaN(time)) {
    time = 50;
  }

  try {
    await scope.port.flush();
    await new Promise(resolve => setTimeout(resolve, time));
    await scope.port.drain();
    await scope.port.close();
    // Emit event synchronously - this ensures listeners are called immediately
    Serial.emit('close');
    return true;
  } catch (e) {
    debug('Error while closing device: ', e);
    // Emit event synchronously even on error - this ensures listeners are called immediately
    Serial.emit('close');
    return true; // Still resolve to allow cleanup
  }
}

/**
 * Disconnect from the serial port (calls close internally)
 * @param {Number} [timeout] - Timeout in milliseconds before closing (default: 50ms)
 * @returns {Promise<Boolean>} True if disconnection successful
 */
Serial.disconnect = (timeout) => {
  return Serial.close(timeout);
}

/**
 * Read data from the serial port
 * @returns {Promise<Buffer>} Data received from the port
 */
Serial.read = () => {
  return new Promise((resolve, reject) => {
    let dataHandler = (data) => {
      scope.port.removeListener('data', dataHandler);
      resolve(data);
    }
    scope.port.on('data', dataHandler);
  });
};

// Serial is already an Adapter instance, so export it directly
module.exports = Serial;
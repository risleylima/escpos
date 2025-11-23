'use strict'
const EventEmitter = require('events');

class NotImplementedException extends Error {
  // Nothing.
}

/**
 * Generic Adapter that will implement the different types of adapter that will be constructed
 * @class
 * @extends EventEmitter
 * @classdesc Base adapter class that provides the interface for USB and Serial adapters
 */
class Adapter extends EventEmitter {
  /**
   * Creates an instance of Adapter
   * @param {Adapter} [adapter] - Optional adapter instance to copy properties from
   */
  constructor(adapter) {
    super();
    if (adapter) {
      for(let key of Object.keys(adapter)){
        this[key] = adapter[key];
      }
    }
  }

  /**
   * Connect to the device
   * @abstract
   * @throws {NotImplementedException} Must be implemented by subclasses
   */
  connect() {
    throw new NotImplementedException();
  }

  /**
   * Open the device connection
   * @abstract
   * @throws {NotImplementedException} Must be implemented by subclasses
   */
  open() {
    throw new NotImplementedException();
  }

  /**
   * Write data to the device
   * @abstract
   * @param {Buffer} data - Data to write
   * @throws {NotImplementedException} Must be implemented by subclasses
   */
  write() {
    throw new NotImplementedException();
  }

  /**
   * Close the device connection
   * @abstract
   * @throws {NotImplementedException} Must be implemented by subclasses
   */
  close() {
    throw new NotImplementedException();
  }

  /**
   * Read data from the device
   * @abstract
   * @throws {NotImplementedException} Must be implemented by subclasses
   */
  read() {
    throw new NotImplementedException();
  }
}

module.exports = Adapter;
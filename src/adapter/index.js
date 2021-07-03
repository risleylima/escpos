'use strict'
const EventEmitter = require('events');

class NotImplementedException extends Error {
  // Nothing.
}

/**
 * Generic Adapter that will implement the different types of adapter that will be constructed
 */
class Adapter extends EventEmitter {
  constructor(adapter) {
    super();
    if (adapter) {
      for(let key of Object.keys(adapter)){
        this[key] = adapter[key];
      }
    }
  }

  connect() {
    throw new NotImplementedException();
  }
  open() {
    throw new NotImplementedException();
  }
  write() {
    throw new NotImplementedException();
  }
  close() {
    throw new NotImplementedException();
  }
  read() {
    throw new NotImplementedException();
  }
}

module.exports = Adapter;
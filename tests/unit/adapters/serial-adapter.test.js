'use strict';

const { Serial: SerialClass } = require('../../../dist');
const { SerialPort } = require('serialport');

// Mock serialport
jest.mock('serialport', () => {
  const listeners = {};
  const mockPort = {
    isOpen: false,
    open: jest.fn().mockImplementation((cb) => {
      mockPort.isOpen = true;
      if (cb) cb(null);
      return Promise.resolve(undefined);
    }),
    close: jest.fn().mockImplementation((cb) => {
      mockPort.isOpen = false;
      if (listeners.close) {
        const fn = listeners.close;
        delete listeners.close;
        fn();
      }
      if (cb) cb(null);
      return Promise.resolve(undefined);
    }),
    write: jest.fn().mockImplementation((data, cb) => {
      if (cb) cb(null);
      return Promise.resolve(undefined);
    }),
    flush: jest.fn().mockImplementation((cb) => {
      if (cb) cb(null);
      return Promise.resolve(undefined);
    }),
    drain: jest.fn().mockImplementation((cb) => {
      if (cb) cb(null);
      return Promise.resolve(undefined);
    }),
    on: jest.fn((ev, fn) => { listeners[ev] = fn; }),
    once: jest.fn((ev, fn) => { listeners[ev] = fn; }),
    removeListener: jest.fn((ev) => { delete listeners[ev]; })
  };

  const SerialPortConstructor = jest.fn().mockImplementation((options) => {
    return mockPort;
  });
  
  SerialPortConstructor.list = jest.fn().mockResolvedValue([
    { path: '/dev/ttyUSB0' },
    { path: '/dev/ttyUSB1' }
  ]);

  return {
    SerialPort: SerialPortConstructor
  };
});

describe('Serial Adapter', () => {
  let adapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SerialClass();
  });

  describe('listSerial', () => {
    it('should list all available serial ports', async () => {
      const ports = await SerialClass.listSerial();
      expect(Array.isArray(ports)).toBe(true);
      expect(SerialPort.list).toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should configure serial port (LSP)', async () => {
      const result = await adapter.connect('/dev/ttyUSB0');
      expect(result).toBe(true);
      // In new industrial lifecycle, connect doesn't instantiate SerialPort yet
      expect(SerialPort).not.toHaveBeenCalled();
    });

    it('should throw error during open if port configuration is missing', async () => {
      await expect(adapter.open()).rejects.toThrow('Not connected');
    });
  });

  describe('open', () => {
    beforeEach(async () => {
      await adapter.connect('/dev/ttyUSB0');
    });

    it('should open port if closed', async () => {
      const result = await adapter.open();
      expect(result).toBe(true);
      
      expect(SerialPort).toHaveBeenCalled();
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.open).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    beforeEach(async () => {
      await adapter.connect('/dev/ttyUSB0');
      await adapter.open();
    });

    it('should write data to port', async () => {
      const testData = Buffer.from('test', 'ascii');
      const result = await adapter.write(testData);
      expect(result).toBe(true);
      
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.write).toHaveBeenCalledWith(testData, expect.any(Function));
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      await adapter.connect('/dev/ttyUSB0');
      await adapter.open();
    });

    it('should close port', async () => {
      const result = await adapter.close();
      expect(result).toBe(true);
      
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.flush).toHaveBeenCalled();
      expect(mockPort.drain).toHaveBeenCalled();
      expect(mockPort.close).toHaveBeenCalled();
    });
  });
});

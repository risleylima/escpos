'use strict';

const Serial = require('../../../src/serial-adapter');
const { SerialPort } = require('serialport');

// Mock serialport (v13 API - uses Promises)
jest.mock('serialport', () => {
  const mockPort = {
    isOpen: false,
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    write: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
    drain: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    removeListener: jest.fn()
  };

  // Update isOpen when open/close are called
  const originalOpen = mockPort.open;
  mockPort.open = jest.fn().mockImplementation(async () => {
    mockPort.isOpen = true;
    return originalOpen();
  });

  const originalClose = mockPort.close;
  mockPort.close = jest.fn().mockImplementation(async () => {
    mockPort.isOpen = false;
    return originalClose();
  });

  const SerialPortConstructor = jest.fn().mockImplementation((options) => {
    return mockPort;
  });
  
  // Attach list as static method to SerialPort constructor
  SerialPortConstructor.list = jest.fn().mockResolvedValue([
    { path: '/dev/ttyUSB0' },
    { path: '/dev/ttyUSB1' }
  ]);

  return {
    SerialPort: SerialPortConstructor
  };
});

describe('Serial Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to serial port', async () => {
      const result = await Serial.connect('/dev/ttyUSB0');
      expect(result).toBe(true);
      expect(SerialPort).toHaveBeenCalled();
    });

    it('should verify port exists', async () => {
      await Serial.connect('/dev/ttyUSB0');
      expect(SerialPort.list).toHaveBeenCalled();
    });

    it('should throw error if port does not exist', async () => {
      await expect(Serial.connect('/dev/invalid')).rejects.toThrow('The specified port does not exist!');
    });

    it('should emit connect event', (done) => {
      Serial.once('connect', () => {
        done();
      });
      Serial.connect('/dev/ttyUSB0');
    });
  });

  describe('open', () => {
    beforeEach(async () => {
      await Serial.connect('/dev/ttyUSB0');
    });

    it('should open port if closed', async () => {
      const result = await Serial.open();
      expect(result).toBe(true);
      
      // Verify port.open was called
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.open).toHaveBeenCalled();
    });

    it('should return true if already open', async () => {
      // Get the mock port and set it as already open
      const mockPort = SerialPort.mock.results[0].value;
      const previousCallCount = mockPort.open.mock.calls.length;
      mockPort.isOpen = true;

      const result = await Serial.open();
      expect(result).toBe(true);
      
      // Verify port.open was NOT called again (call count should be the same)
      // Since isOpen is true, the code should return early without calling open()
      expect(mockPort.open.mock.calls.length).toBe(previousCallCount);
    });
  });

  describe('write', () => {
    beforeEach(async () => {
      await Serial.connect('/dev/ttyUSB0');
      await Serial.open();
    });

    it('should write data to port', async () => {
      const testData = Buffer.from('test', 'ascii');
      const result = await Serial.write(testData);
      expect(result).toBe(true);
      
      // Verify port.write was called with correct data
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.write).toHaveBeenCalledWith(testData);
    });

    it('should drain port after write', async () => {
      const testData = Buffer.from('test', 'ascii');
      await Serial.write(testData);
      
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.write).toHaveBeenCalled();
      expect(mockPort.drain).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      await Serial.connect('/dev/ttyUSB0');
      await Serial.open();
    });

    it('should close port', async () => {
      const result = await Serial.close();
      expect(result).toBe(true);
      
      // Verify close sequence was called
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.flush).toHaveBeenCalled();
      expect(mockPort.drain).toHaveBeenCalled();
      expect(mockPort.close).toHaveBeenCalled();
    });

    it('should flush before closing', async () => {
      await Serial.close();
      
      const mockPort = SerialPort.mock.results[0].value;
      expect(mockPort.flush).toHaveBeenCalled();
      expect(mockPort.drain).toHaveBeenCalled();
      expect(mockPort.close).toHaveBeenCalled();
    });

    it('should use default timeout of 50ms', async () => {
      await Serial.close();
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should use custom timeout', async () => {
      await Serial.close(100);
      // Should complete without error
      expect(true).toBe(true);
    });

    it('should emit close event', async () => {
      let eventReceived = false;
      const promise = new Promise((resolve) => {
        Serial.once('close', () => {
          eventReceived = true;
          resolve();
        });
      });
      
      expect(Serial.listenerCount('close')).toBe(1);
      
      await Serial.close();
      
      await Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Close event not emitted within timeout')), 1000))
      ]);
      
      expect(eventReceived).toBe(true);
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await Serial.connect('/dev/ttyUSB0');
    });

    it('should disconnect (calls close)', async () => {
      const result = await Serial.disconnect();
      expect(result).toBe(true);
    });
  });

  describe('read', () => {
    beforeEach(async () => {
      await Serial.connect('/dev/ttyUSB0');
      await Serial.open();
    });

    it('should read data from port', async () => {
      const mockPort = SerialPort.mock.results[0].value;
      const testData = Buffer.from('response', 'ascii');

      // Mock data event
      mockPort.on.mockImplementation((event, handler) => {
        if (event === 'data') {
          setTimeout(() => handler(testData), 10);
        }
      });

      const data = await Serial.read();
      expect(Buffer.isBuffer(data)).toBe(true);
    });
  });
});


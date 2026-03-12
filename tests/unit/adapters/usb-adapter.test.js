'use strict';

const { USB: USBClass } = require('../../../dist');
const usb = require('usb');

// Mock usb module (v2 API - uses Promises)
jest.mock('usb', () => {
  const createMockDevice = () => {
    const mockEndpoint = {
      direction: 'out',
      transfer: jest.fn().mockImplementation((data, cb) => {
        if (cb) cb(null);
        return Promise.resolve(undefined);
      })
    };

    const mockInterface = {
      isKernelDriverActive: jest.fn().mockReturnValue(false),
      claim: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockImplementation((force, cb) => {
        if (cb) cb(null);
        return Promise.resolve(undefined);
      }),
      detachKernelDriver: jest.fn().mockResolvedValue(undefined),
      descriptor: {
        bInterfaceClass: 0x07, // PRINTER class
        bInterfaceNumber: 0
      },
      endpoints: [mockEndpoint]
    };

    // Link endpoint to interface (v2 API structure)
    mockEndpoint.interface = mockInterface;

    return {
      open: jest.fn().mockImplementation(() => {}),
      close: jest.fn().mockImplementation(() => {}),
      interfaces: [mockInterface],
      configDescriptor: {
        interfaces: [
          [
            {
              bInterfaceClass: 0x07 // PRINTER class
            }
          ]
        ]
      },
      deviceDescriptor: {
        iManufacturer: 1,
        iProduct: 2,
        idVendor: 0x04b8,
        idProduct: 0x0202
      },
      getStringDescriptor: jest.fn().mockImplementation((type, cb) => {
        if (cb) cb(null, 'Device String');
        return Promise.resolve('Device String');
      })
    };
  };

  const mockDeviceInstance = createMockDevice();

  return {
    usb: {
      getDeviceList: jest.fn().mockReturnValue([mockDeviceInstance]),
      findByIds: jest.fn().mockReturnValue(mockDeviceInstance),
      on: jest.fn(),
      removeListener: jest.fn()
    }
  };
});

describe('USB Adapter', () => {
  let adapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new USBClass();
  });

  describe('listUSB', () => {
    it('should list USB printer devices', async () => {
      const devices = await USBClass.listUSB();
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
    });

    it('should get device manufacturer and product strings', async () => {
      const devices = await USBClass.listUSB();
      if (devices.length > 0) {
        const device = devices[0];
        expect(device.manufacturer).toBe('Device String');
        expect(device.product).toBe('Device String');
      }
    });
  });

  describe('connect', () => {
    it('should connect to device by VID/PID', async () => {
      const result = await adapter.connect(0x04b8, 0x0202);
      expect(result).toBe(true);
      expect(usb.usb.findByIds).toHaveBeenCalledWith(0x04b8, 0x0202);
    });

    it('should connect to first available device if no VID/PID', async () => {
      const result = await adapter.connect();
      expect(result).toBe(true);
      expect(usb.usb.getDeviceList).toHaveBeenCalled();
    });

    it('should throw error if device not found', async () => {
      usb.usb.findByIds.mockReturnValueOnce(null);
      usb.usb.getDeviceList.mockReturnValueOnce([]);

      await expect(adapter.connect(9999, 9999)).rejects.toThrow('Cannot find printer!');
    });

    it('should emit connect event', async () => {
      const connectPromise = new Promise(resolve => adapter.once('connect', resolve));
      await adapter.connect(0x04b8, 0x0202);
      await connectPromise;
    });
  });

  describe('open', () => {
    beforeEach(async () => {
      await adapter.connect(0x04b8, 0x0202);
    });

    it('should open device connection', async () => {
      const result = await adapter.open();
      expect(result).toBe(true);
      
      const mockDevice = usb.usb.findByIds(0x04b8, 0x0202);
      expect(mockDevice.open).toHaveBeenCalled();
      expect(mockDevice.interfaces[0].claim).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    beforeEach(async () => {
      await adapter.connect(0x04b8, 0x0202);
      await adapter.open();
    });

    it('should write data to endpoint', async () => {
      const testData = Buffer.from('test', 'ascii');
      const result = await adapter.write(testData);
      expect(result).toBe(true);
      
      const mockDevice = usb.usb.findByIds(0x04b8, 0x0202);
      expect(mockDevice.interfaces[0].endpoints[0].transfer).toHaveBeenCalledWith(testData, expect.any(Function));
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      await adapter.connect(0x04b8, 0x0202);
      await adapter.open();
    });

    it('should close device connection', async () => {
      const result = await adapter.close();
      expect(result).toBe(true);
      
      const mockDevice = usb.usb.findByIds(0x04b8, 0x0202);
      expect(mockDevice.interfaces[0].release).toHaveBeenCalled();
      expect(mockDevice.close).toHaveBeenCalled();
    });
  });
});

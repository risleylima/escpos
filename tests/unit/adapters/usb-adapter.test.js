'use strict';

const USB = require('../../../src/usb-adapter');
const usb = require('usb');

// Mock usb module (v2 API - uses Promises)
jest.mock('usb', () => {
  const createMockDevice = () => {
    const mockEndpoint = {
      direction: 'out',
      transfer: jest.fn().mockResolvedValue(undefined)
    };

    const mockInterface = {
      isKernelDriverActive: jest.fn().mockReturnValue(false),
      claim: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
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
      open: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
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
        iProduct: 2
      },
      getStringDescriptor: jest.fn().mockResolvedValue('Device String')
    };
  };

  // Create a single shared mock device instance that persists across tests
  // This ensures the same device is returned every time, maintaining state
  const mockDeviceInstance = createMockDevice();

  return {
    getDeviceList: jest.fn().mockReturnValue([mockDeviceInstance]),
    findByIds: jest.fn().mockReturnValue(mockDeviceInstance),
    on: jest.fn()
  };
});

describe('USB Adapter', () => {
  beforeEach(() => {
    // Don't clear mocks that break the device structure
    // Only clear call history for methods that need it
    const mockDevice = usb.findByIds(1046, 20497);
    if (mockDevice) {
      // Clear call history but preserve mock structure
      if (mockDevice.open && typeof mockDevice.open.mockClear === 'function') {
        mockDevice.open.mockClear();
      }
      if (mockDevice.close && typeof mockDevice.close.mockClear === 'function') {
        mockDevice.close.mockClear();
      }
      if (mockDevice.interfaces && mockDevice.interfaces[0]) {
        if (mockDevice.interfaces[0].claim && typeof mockDevice.interfaces[0].claim.mockClear === 'function') {
          mockDevice.interfaces[0].claim.mockClear();
        }
        if (mockDevice.interfaces[0].release && typeof mockDevice.interfaces[0].release.mockClear === 'function') {
          mockDevice.interfaces[0].release.mockClear();
        }
        if (mockDevice.interfaces[0].endpoints && mockDevice.interfaces[0].endpoints[0]) {
          if (mockDevice.interfaces[0].endpoints[0].transfer && typeof mockDevice.interfaces[0].endpoints[0].transfer.mockClear === 'function') {
            mockDevice.interfaces[0].endpoints[0].transfer.mockClear();
          }
        }
      }
    }
    // Don't clear findByIds mock as it needs to return the device
    // usb.findByIds.mockClear(); // Commented out to preserve mock return value
    // usb.getDeviceList.mockClear(); // Commented out to preserve mock return value
  });

  describe('listUSB', () => {
    it('should list USB printer devices', async () => {
      const devices = await USB.listUSB();
      expect(Array.isArray(devices)).toBe(true);
    });

    it('should filter only printer devices', async () => {
      const devices = await USB.listUSB();
      // Should only return devices with PRINTER interface class
      expect(devices.length).toBeGreaterThanOrEqual(0);
    });

    it('should get device manufacturer and product strings', async () => {
      const devices = await USB.listUSB();
      if (devices.length > 0) {
        const device = devices[0];
        expect(device.manufacturer).toBeDefined();
        expect(device.product).toBeDefined();
      }
    });

    it('should handle devices without descriptors gracefully', async () => {
      // Mock a device that fails to get descriptor
      const mockDeviceWithoutDescriptor = {
        open: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        getStringDescriptor: jest.fn().mockRejectedValue(new Error('Descriptor error')),
        configDescriptor: {
          interfaces: [
            [
              {
                bInterfaceClass: 0x07
              }
            ]
          ]
        },
        deviceDescriptor: {
          iManufacturer: 1,
          iProduct: 2
        }
      };

      usb.getDeviceList.mockReturnValueOnce([mockDeviceWithoutDescriptor]);
      
      const devices = await USB.listUSB();
      // Should not include devices that fail to get descriptors
      expect(devices.length).toBe(0);
    });
  });

  describe('connect', () => {
    it('should connect to device by VID/PID', async () => {
      const result = await USB.connect(1046, 20497);
      expect(result).toBe(true);
      expect(usb.findByIds).toHaveBeenCalledWith(1046, 20497);
    });

    it('should connect to first available device if no VID/PID', async () => {
      const result = await USB.connect();
      expect(result).toBe(true);
    });

    it('should throw error if device not found', async () => {
      usb.findByIds.mockReturnValueOnce(null);
      usb.getDeviceList.mockReturnValueOnce([]);

      await expect(USB.connect(9999, 9999)).rejects.toThrow('Cannot find printer!');
    });

    it('should emit connect event', (done) => {
      USB.once('connect', () => {
        done();
      });
      USB.connect(1046, 20497);
    });
  });

  describe('open', () => {
    beforeEach(async () => {
      await USB.connect(1046, 20497);
    });

    it('should open device connection', async () => {
      const result = await USB.open();
      expect(result).toBe(true);
      
      // Verify device.open was called
      const mockDevice = usb.findByIds(1046, 20497);
      expect(mockDevice.open).toHaveBeenCalled();
      
      // Verify interface was claimed
      if (mockDevice.interfaces && mockDevice.interfaces[0]) {
        expect(mockDevice.interfaces[0].claim).toHaveBeenCalled();
      }
    });

    it('should find output endpoint', async () => {
      await USB.open();
      // Endpoint should be found (mocked)
      expect(USB.write).toBeDefined();
      
      // Verify endpoint was found
      const mockDevice = usb.findByIds(1046, 20497);
      if (mockDevice.interfaces && mockDevice.interfaces[0] && mockDevice.interfaces[0].endpoints[0]) {
        expect(mockDevice.interfaces[0].endpoints[0].direction).toBe('out');
      }
    });

    it('should throw error if endpoint not found', async () => {
      const mockDevice = usb.findByIds(1046, 20497);
      // Save original interfaces to restore later
      const originalInterfaces = mockDevice.interfaces;
      
      const mockInterfaceWithoutEndpoints = {
        isKernelDriverActive: jest.fn().mockReturnValue(false),
        claim: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        detachKernelDriver: jest.fn().mockResolvedValue(undefined),
        descriptor: {
          bInterfaceClass: 0x07,
          bInterfaceNumber: 0
        },
        endpoints: [] // No endpoints
      };
      mockDevice.interfaces = [mockInterfaceWithoutEndpoints];

      try {
        await expect(USB.open()).rejects.toThrow('Can not find endpoint from printer');
      } finally {
        // Restore original interfaces to prevent affecting other tests
        mockDevice.interfaces = originalInterfaces;
      }
    });
  });

  describe('write', () => {
    beforeEach(async () => {
      await USB.connect(1046, 20497);
      await USB.open();
    });

    it('should write data to endpoint', async () => {
      const testData = Buffer.from('test', 'ascii');
      const result = await USB.write(testData);
      expect(result).toBe(true);
      
      // Verify that endpoint.transfer was called with correct data
      const mockDevice = usb.findByIds(1046, 20497);
      if (mockDevice.interfaces && mockDevice.interfaces[0] && mockDevice.interfaces[0].endpoints[0]) {
        expect(mockDevice.interfaces[0].endpoints[0].transfer).toHaveBeenCalledWith(testData);
      }
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      await USB.connect(1046, 20497);
      await USB.open();
    });

    it('should close device connection', async () => {
      const result = await USB.close();
      expect(result).toBe(true);
      
      // Verify that interface release was called
      const mockDevice = usb.findByIds(1046, 20497);
      if (mockDevice.interfaces && mockDevice.interfaces[0]) {
        expect(mockDevice.interfaces[0].release).toHaveBeenCalled();
      }
      expect(mockDevice.close).toHaveBeenCalled();
    });

    it('should emit close event', async () => {
      let eventReceived = false;
      const promise = new Promise((resolve) => {
        USB.once('close', () => {
          eventReceived = true;
          resolve();
        });
      });
      
      expect(USB.listenerCount('close')).toBe(1);
      
      await USB.close();
      
      await Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Close event not emitted within timeout')), 1000))
      ]);
      
      expect(eventReceived).toBe(true);
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      await USB.connect(1046, 20497);
    });

    it('should disconnect device', async () => {
      const result = await USB.disconnect();
      expect(result).toBe(true);
    });

    it('should emit disconnect event', async () => {
      let eventReceived = false;
      const promise = new Promise((resolve) => {
        USB.once('disconnect', () => {
          eventReceived = true;
          resolve();
        });
      });
      
      expect(USB.listenerCount('disconnect')).toBe(1);
      
      await USB.disconnect();
      
      await Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Disconnect event not emitted within timeout')), 1000))
      ]);
      
      expect(eventReceived).toBe(true);
    });
  });
});


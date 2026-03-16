import * as os from 'os';
import { Adapter } from '../adapter';
import { usb, Device, OutEndpoint, InEndpoint } from 'usb';

const debug = require('debug')('escpos:usb-adapter') as (msg: string, ...args: unknown[]) => void;

const IFACE_CLASS = {
  AUDIO: 0x01,
  HID: 0x03,
  PRINTER: 0x07,
  HUB: 0x09,
} as const;

const NOT_CONNECTED_MSG = 'Not connected. Call connect([vid], [pid]) first.';
const CHUNK_SIZE = 4096; // 4KB chunks for USB stability
const READ_BUFFER_SIZE = 64; // bytes for status response (DLE EOT, etc.)
const RECOVER_DELAY_MS = 150;

export class USB extends Adapter {
  private device: Device | null = null;
  private endpoint: OutEndpoint | null = null;
  private inEndpoint: InEndpoint | null = null;
  private detachHandler: ((device: Device) => void) | null = null;
  private lastVid?: number;
  private lastPid?: number;

  static async listUSB(): Promise<Array<{ manufacturer?: string; product?: string; vendorId: number; productId: number }>> {
    const devices = usb.getDeviceList().filter((device: Device) => {
      try {
        const configDescriptor = device.configDescriptor;
        if (!configDescriptor || !configDescriptor.interfaces) return false;
        return configDescriptor.interfaces.some((ifaceArray) =>
          ifaceArray.some((iface) => iface.bInterfaceClass === IFACE_CLASS.PRINTER)
        );
      } catch (e) {
        debug('Error while get device info: ', e);
        return false;
      }
    });

    const getDescriptor = async (device: Device, type: number) => {
      try {
        device.open();
        const data = await new Promise<string>((resolve, reject) => {
          device.getStringDescriptor(type, (err, res) => {
            if (err) reject(err);
            else resolve(res!);
          });
        });
        device.close();
        return data;
      } catch (e) {
        debug('Error while read device description: ', e);
        try { device.close(); } catch { /* ignore */ }
        return false;
      }
    };

    const retorno: Array<{ manufacturer?: string; product?: string; vendorId: number; productId: number }> = [];
    for (const device of devices) {
      const manufacturer = await getDescriptor(device, device.deviceDescriptor.iManufacturer);
      const product = await getDescriptor(device, device.deviceDescriptor.iProduct);
      retorno.push({
        manufacturer: manufacturer ? (manufacturer as string) : undefined,
        product: product ? (product as string) : undefined,
        vendorId: device.deviceDescriptor.idVendor,
        productId: device.deviceDescriptor.idProduct,
      });
    }
    return retorno;
  }

  async connect(vid?: number, pid?: number): Promise<boolean> {
    return this.synchronized(async () => {
      this.lastVid = vid;
      this.lastPid = pid;
      this.device = null;
      this.endpoint = null;
      this.inEndpoint = null;

      if (this.detachHandler) {
        usb.removeListener('detach', this.detachHandler);
        this.detachHandler = null;
      }

      if (vid != null && pid != null) {
        this.device = usb.getDeviceList().find((d: Device) => {
          try {
            return (
              d.deviceDescriptor?.idVendor === vid &&
              d.deviceDescriptor?.idProduct === pid
            );
          } catch {
            return false;
          }
        }) ?? null;
      } else {
        const fullList = usb.getDeviceList().filter((d: Device) => {
          try {
            const cd = d.configDescriptor;
            if (!cd?.interfaces) return false;
            return cd.interfaces.some((arr) => arr.some((i) => i.bInterfaceClass === IFACE_CLASS.PRINTER));
          } catch { return false; }
        });
        if (fullList.length) this.device = fullList[0];
      }

      if (!this.device) throw new Error('Cannot find printer!');

      this.state = 'CONNECTED';
      this.emit('connect', this.device);

      this.detachHandler = (device: Device) => {
        if (device === this.device) {
          debug('Device Unplugged!');
          this.emit('detach');
          this.device = null;
          this.endpoint = null;
          this.inEndpoint = null;
          this.state = 'DISCONNECTED';
        }
      };

      usb.on('detach', this.detachHandler);
      debug('Device Connected!');
      return true;
    });
  }

  async open(): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.device) throw new Error(NOT_CONNECTED_MSG);
      if (this.endpoint) return true;

      this.state = 'OPENING';
      this.device.open();
      const interfaces = this.device.interfaces;
      if (!interfaces?.length) throw new Error('Cannot access device interfaces');

      const preferred = interfaces.filter((iface) => iface.descriptor?.bInterfaceClass === IFACE_CLASS.PRINTER);
      const candidates = preferred.length > 0 ? preferred : interfaces;

      for (const interfaceObj of candidates) {
        if (this.endpoint) break;
        try {
          if (os.platform() !== 'win32' && (interfaceObj as any).isKernelDriverActive()) {
            try {
              (interfaceObj as any).detachKernelDriver();
            } catch (e) {
              // Some devices/drivers on macOS deny detach (LIBUSB_ERROR_ACCESS),
              // but claim() can still succeed. Keep this non-fatal.
              debug('Could not detach kernel driver, continuing: %s', (e as Error).message);
            }
          }

          interfaceObj.claim();
          for (const endpoint of interfaceObj.endpoints) {
            if (endpoint.direction === 'out') {
              this.endpoint = endpoint as OutEndpoint;
            } else if (endpoint.direction === 'in') {
              this.inEndpoint = endpoint as InEndpoint;
            }
          }
          if (this.endpoint) {
            this.state = 'READY';
            this.emit('open', this.device);
            debug('Device Opened!');
            break;
          }
        } catch (e) {
          debug('Could not claim USB interface: ', e);
          try {
            interfaceObj.release(true, () => {});
          } catch {
            // ignore interface cleanup errors in fallback attempts
          }
        }
      }

      if (!this.endpoint) throw new Error('Can not find endpoint from printer');
      return true;
    });
  }

  async write(data: Buffer): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.device || !this.endpoint) throw new Error(NOT_CONNECTED_MSG);
      const writeOneWithRetry = async (chunk: Buffer): Promise<void> => {
        try {
          await this.writeChunk(chunk);
        } catch (e) {
          const msg = (e as Error).message ?? '';
          if (/STALL/i.test(msg)) {
            debug('USB endpoint stalled, attempting clearHalt + retry');
            await this.clearEndpointHalt();
            await this.writeChunk(chunk);
          } else {
            throw e;
          }
        }
      };
      return this.writeInChunks(data, CHUNK_SIZE, writeOneWithRetry);
    });
  }

  private writeChunk(chunk: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.endpoint!.transfer(chunk, (err) => {
        if (err) {
          debug('Transfer Error: ', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private clearEndpointHalt(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ep = this.endpoint as any;
      if (!ep || typeof ep.clearHalt !== 'function') {
        resolve();
        return;
      }
      ep.clearHalt((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async read(): Promise<Buffer> {
    return this.synchronized(async () => {
      if (!this.device || !this.endpoint) throw new Error(NOT_CONNECTED_MSG);
      if (!this.inEndpoint) {
        throw new Error('Read not supported: printer has no IN endpoint.');
      }
      return new Promise<Buffer>((resolve, reject) => {
        this.inEndpoint!.transfer(READ_BUFFER_SIZE, (err, data) => {
          if (err) {
            debug('USB read error: ', err);
            reject(err);
          } else {
            resolve(data && data.length > 0 ? Buffer.from(data) : Buffer.alloc(0));
          }
        });
      });
    });
  }

  async close(): Promise<boolean> {
    return this.synchronized(async () => {
      if (this.device) {
        this.state = 'CLOSING';
        try {
          const endpoint = this.endpoint as any;
          if (endpoint?.interface) {
            await new Promise<void>((resolve, reject) => {
              endpoint.interface.release(true, (err: any) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
          this.device.close();
        } catch (e) { debug('Error closing device: ', e); }
      }

      const closedDevice = this.device;
      this.endpoint = null;
      this.inEndpoint = null;
      this.device = null;
      this.state = 'DISCONNECTED';

      if (this.detachHandler) {
        usb.removeListener('detach', this.detachHandler);
        this.detachHandler = null;
      }

      this.emit('close', closedDevice);
      debug('Device Closed!');
      return true;
    });
  }

  async disconnect(): Promise<boolean> {
    return this.close();
  }

  /**
   * USB-specific recovery:
   * 1) clear endpoint halt when available
   * 2) close interface/device
   * 3) reconnect using last VID/PID (or auto) and reopen endpoint
   */
  async recover(): Promise<boolean> {
    try {
      await this.clearEndpointHalt();
    } catch (e) {
      debug('clearEndpointHalt failed during recover: ', e);
    }
    return this.recoverAfterClose(RECOVER_DELAY_MS, async () => {
      await this.connect(this.lastVid, this.lastPid);
      await this.open();
    });
  }
}

import * as os from 'os';
import { Adapter } from '../adapter';
import { usb, Device, OutEndpoint } from 'usb';

const debug = require('debug')('escpos:usb-adapter') as (msg: string, ...args: unknown[]) => void;

const IFACE_CLASS = {
  AUDIO: 0x01,
  HID: 0x03,
  PRINTER: 0x07,
  HUB: 0x09,
} as const;

const NOT_CONNECTED_MSG = 'Not connected. Call connect([vid], [pid]) first.';
const CHUNK_SIZE = 4096; // 4KB chunks for USB stability

export class USB extends Adapter {
  private device: Device | null = null;
  private endpoint: OutEndpoint | null = null;
  private detachHandler: ((device: Device) => void) | null = null;

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
      this.device = null;
      this.endpoint = null;

      if (this.detachHandler) {
        usb.removeListener('detach', this.detachHandler);
        this.detachHandler = null;
      }

      if (vid != null && pid != null) {
        this.device = (usb as any).findByIds(vid, pid);
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

      for (const interfaceObj of interfaces) {
        if (this.endpoint) break;
        const descriptor = interfaceObj.descriptor;
        if (descriptor?.bInterfaceClass !== IFACE_CLASS.PRINTER) continue;

        if (os.platform() !== 'win32' && (interfaceObj as any).isKernelDriverActive()) {
          try { (interfaceObj as any).detachKernelDriver(); } 
          catch (e) { throw new Error(`[ERROR] Could not detach kernel driver: ${(e as Error).message}`); }
        }

        interfaceObj.claim();
        for (const endpoint of interfaceObj.endpoints) {
          if (endpoint.direction === 'out') {
            this.endpoint = endpoint as OutEndpoint;
            this.state = 'READY';
            this.emit('open', this.device);
            debug('Device Opened!');
            break;
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
      
      const prevState = this.state;
      this.state = 'BUSY';

      try {
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.subarray(i, i + CHUNK_SIZE);
          await this.writeChunk(chunk);
        }
        return true;
      } finally {
        this.state = prevState === 'BUSY' ? 'READY' : prevState;
      }
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

  async read(): Promise<Buffer> {
    throw new Error('Read not supported for USB adapter yet.');
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
}

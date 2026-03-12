import { SerialPort } from 'serialport';
import { Adapter } from '../adapter';

const debug = require('debug')('escpos:serial-adapter') as (msg: string, ...args: unknown[]) => void;

const NOT_CONNECTED_MSG = 'Not connected. Call connect(port[, options]) first.';
const CHUNK_SIZE = 4096; // 4KB chunks for RS232 stability
const DEFAULT_BAUD_RATE = 9600;

export class Serial extends Adapter {
  private port: SerialPort | null = null;
  private path: string | null = null;
  private options: Record<string, unknown> | null = null;

  static async listSerial() {
    return SerialPort.list();
  }

  /**
   * Configure the serial port. Options are passed to the underlying SerialPort (e.g. baudRate).
   * If baudRate is omitted, open() will use 9600 by default (node-serialport requires baudRate).
   */
  async connect(port: string, options?: Record<string, unknown>): Promise<boolean> {
    return this.synchronized(async () => {
      this.path = port;
      this.options = options ?? {};
      this.state = 'CONNECTED';
      debug('Serial adapter configured for %s', port);
      return true;
    });
  }

  async open(): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.path) throw new Error(NOT_CONNECTED_MSG);
      if (this.port && this.port.isOpen) return true;

      this.state = 'OPENING';
      return new Promise(async (resolve, reject) => {
        try {
          const ports = await SerialPort.list();
          if (!ports.find((i) => i.path === this.path)) {
            this.state = 'DISCONNECTED';
            return reject(new Error('The specified port does not exist!'));
          }

          const opts = this.options ?? {};
          const baudRate = (opts.baudRate as number | undefined) ?? DEFAULT_BAUD_RATE;
          this.port = new SerialPort({
            ...opts,
            baudRate,
            path: this.path!,
            autoOpen: false,
          } as ConstructorParameters<typeof SerialPort>[0]);

          this.port.on('error', (err: Error) => {
            debug('Error on Serial Port: ', err);
            this.emit('error', err);
          });

          const clearPort = () => {
            this.emit('disconnect', this.port);
            this.port?.removeListener('close', clearPort);
            this.port = null;
            this.state = 'DISCONNECTED';
          };

          this.port.on('close', clearPort);

          this.port.open((err) => {
            if (err) {
              debug('Error Opening the Selected Port: ', err);
              this.port = null;
              this.state = 'DISCONNECTED';
              reject(err);
            } else {
              debug('Device Connected and Open!');
              this.state = 'READY';
              this.emit('connect', this.port);
              resolve(true);
            }
          });
        } catch (err) {
          this.state = 'DISCONNECTED';
          reject(err);
        }
      });
    });
  }

  async write(data: Buffer): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.port || !this.port.isOpen) throw new Error(NOT_CONNECTED_MSG);
      
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
      this.port!.write(chunk, (err) => {
        if (err) return reject(err);
        this.port!.drain((drainErr) => {
          if (drainErr) reject(drainErr);
          else resolve();
        });
      });
    });
  }

  async read(): Promise<Buffer> {
    return this.synchronized(async () => {
      if (!this.port || !this.port.isOpen) throw new Error(NOT_CONNECTED_MSG);
      return new Promise<Buffer>((resolve) => {
        this.port!.once('data', (data: Buffer) => {
          resolve(data);
        });
      });
    });
  }

  async close(options?: { timeout?: number }): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.port) return true;
      this.state = 'CLOSING';
      const time = options?.timeout ?? 50;

      try {
        await new Promise<void>((resolve) => {
          this.port!.flush((err) => {
            if (err) debug('Flush error: ', err);
            resolve();
          });
        });

        await new Promise<void>((resolve) => setTimeout(resolve, time));

        await new Promise<void>((resolve) => {
          this.port!.drain((err) => {
            if (err) debug('Drain error: ', err);
            resolve();
          });
        });

        await new Promise<void>((resolve, reject) => {
          this.port!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        this.emit('close');
        this.port = null;
        this.state = 'DISCONNECTED';
        return true;
      } catch (e) {
        debug('Error while closing device: ', e);
        this.emit('error', e);
        this.port = null;
        this.state = 'DISCONNECTED';
        throw e;
      }
    });
  }

  async disconnect(): Promise<boolean> {
    return this.close();
  }
}

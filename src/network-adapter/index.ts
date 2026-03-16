import * as net from 'net';
import { Adapter } from '../adapter';

const debug = require('debug')('escpos:network-adapter') as (msg: string, ...args: unknown[]) => void;

export interface NetworkConnectOptions {
  host: string;
  port: number;
  timeout?: number;
}

const NOT_CONNECTED_MSG = 'Not connected. Call connect(host, port) first.';
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;
const DEFAULT_CLOSE_TIMEOUT_MS = 2000;
const DEFAULT_IO_TIMEOUT_MS = 30000;
const CHUNK_SIZE = 8192; // 8KB chunks for industrial flow control
const RECOVER_DELAY_MS = 100;

export class Network extends Adapter {
  private socket: net.Socket | null = null;
  private options: NetworkConnectOptions | null = null;

  async connect(
    hostOrOptions: string | NetworkConnectOptions,
    portOrNothing?: number,
    options?: { timeout?: number }
  ): Promise<boolean> {
    return this.synchronized(async () => {
      const previous = this.options;
      if (typeof hostOrOptions === 'object' && hostOrOptions !== null && 'host' in hostOrOptions) {
        this.options = {
          host: hostOrOptions.host,
          port: hostOrOptions.port,
          timeout: hostOrOptions.timeout ?? DEFAULT_CONNECT_TIMEOUT_MS,
        };
      } else {
        this.options = {
          host: hostOrOptions as string,
          port: portOrNothing ?? 9100,
          timeout: options?.timeout ?? DEFAULT_CONNECT_TIMEOUT_MS,
        };
      }

      if (this.socket && !this.socket.destroyed && previous && (previous.host !== this.options.host || previous.port !== this.options.port)) {
        await this.close();
      }
      
      this.state = 'CONNECTED';
      debug('Network adapter configured for %s:%d', this.options.host, this.options.port);
      return true;
    });
  }

  async open(): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.options) throw new Error(NOT_CONNECTED_MSG);
      if (this.socket && !this.socket.destroyed) return true;

      this.state = 'OPENING';
      return new Promise((resolve, reject) => {
        let settled = false;
        const { host, port, timeout } = this.options!;

        const socket = net.createConnection({ host, port }, () => {
          if (settled) return;
          settled = true;
          socket.setTimeout(0);
          socket.removeAllListeners('error');
          socket.removeAllListeners('timeout');
          this.socket = socket;
          this.state = 'READY';
          debug('Connected to %s:%d', host, port);
          this.emit('connect', socket);
          resolve(true);
        });

        socket.setTimeout(timeout ?? DEFAULT_CONNECT_TIMEOUT_MS);

        socket.on('timeout', () => {
          if (settled) return;
          settled = true;
          this.state = 'DISCONNECTED';
          socket.destroy();
          reject(new Error('Connection timeout'));
        });

        socket.on('error', (err: Error) => {
          if (settled) return;
          settled = true;
          this.state = 'DISCONNECTED';
          socket.destroy();
          debug('Socket error: %s', err.message);
          reject(err);
        });

        socket.on('close', () => {
          if (this.socket === socket) {
            this.socket = null;
            this.state = 'DISCONNECTED';
            this.emit('close');
            this.emit('disconnect');
          }
        });
      });
    });
  }

  async write(data: Buffer): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.socket || this.socket.destroyed) throw new Error(NOT_CONNECTED_MSG);
      return this.writeInChunks(data, CHUNK_SIZE, (chunk) => this.writeChunk(chunk));
    });
  }

  private writeChunk(chunk: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = this.socket!;
      let settled = false;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        socket.removeListener('error', onError);
        socket.removeListener('drain', onDrain);
        reject(err);
      };

      const onError = (err: Error) => fail(err);
      const onDrain = () => {
        if (settled) return;
        settled = true;
        socket.removeListener('error', onError);
        resolve();
      };

      const drainTimeout = setTimeout(() => {
        fail(new Error('Write timeout: socket drain event never fired.'));
      }, DEFAULT_IO_TIMEOUT_MS);
      if (drainTimeout.unref) drainTimeout.unref();

      let success = true;
      const needsDrain = !socket.write(chunk, (err) => {
        if (err) {
          clearTimeout(drainTimeout);
          return fail(err);
        }
        if (success) {
          if (settled) return;
          settled = true;
          clearTimeout(drainTimeout);
          socket.removeListener('error', onError);
          resolve();
        }
      });
      success = !needsDrain;

      if (needsDrain) {
        socket.once('drain', onDrain);
        socket.once('error', onError);
      } else {
        socket.once('error', onError);
      }
    });
  }

  async read(): Promise<Buffer> {
    return this.synchronized(async () => {
      if (!this.socket || this.socket.destroyed) throw new Error(NOT_CONNECTED_MSG);
      return new Promise<Buffer>((resolve, reject) => {
        const socket = this.socket!;
        let settled = false;
        const done = (err?: Error, data?: Buffer) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          socket.removeListener('data', onData);
          socket.removeListener('error', onError);
          socket.removeListener('close', onClose);
          if (err) reject(err);
          else resolve(data as Buffer);
        };
        const onData = (data: Buffer) => done(undefined, data);
        const onError = (err: Error) => done(err);
        const onClose = () => done(new Error('Socket closed while waiting for data.'));
        const timer = setTimeout(() => done(new Error('Read timeout')), DEFAULT_IO_TIMEOUT_MS);
        if (timer.unref) timer.unref();
        socket.once('data', onData);
        socket.once('error', onError);
        socket.once('close', onClose);
      });
    });
  }

  async close(options?: { timeout?: number }): Promise<boolean> {
    return this.synchronized(async () => {
      if (!this.socket) return true;
      this.state = 'CLOSING';
      const socket = this.socket;
      this.socket = null;
      const timeoutMs = Math.max(0, options?.timeout ?? DEFAULT_CLOSE_TIMEOUT_MS);

      return new Promise((resolve) => {
        let completed = false;
        const done = () => {
          if (completed) return;
          completed = true;
          socket.removeAllListeners();
          this.state = 'DISCONNECTED';
          this.emit('close');
          resolve(true);
        };
        socket.once('close', done);
        socket.once('error', () => done());
        socket.end();
        const t = setTimeout(() => { if (!socket.destroyed) socket.destroy(); done(); }, timeoutMs);
        if (t.unref) t.unref();
      });
    });
  }

  async disconnect(options?: { timeout?: number }): Promise<boolean> {
    return this.close(options);
  }

  /**
   * Network-specific recovery:
   * 1) close current socket
   * 2) reopen using last configured host/port
   */
  async recover(): Promise<boolean> {
    if (!this.options) {
      this.state = 'DISCONNECTED';
      return true;
    }
    return this.recoverAfterClose(RECOVER_DELAY_MS, () => this.open());
  }
}

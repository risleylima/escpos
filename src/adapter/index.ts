import { EventEmitter } from 'events';

export type AdapterState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'OPENING' | 'READY' | 'BUSY' | 'CLOSING';

export abstract class Adapter extends EventEmitter {
  protected state: AdapterState = 'DISCONNECTED';
  private lockPromise: Promise<void> = Promise.resolve();

  /**
   * Serializes all IO operations at the adapter level to prevent data interleaving
   * and race conditions across multiple printer instances sharing the same adapter.
   */
  protected async synchronized<T>(task: () => Promise<T>): Promise<T> {
    const run = this.lockPromise.then(task, task);
    this.lockPromise = run.then(() => undefined, () => undefined);
    return run;
  }

  getState(): AdapterState {
    return this.state;
  }

  abstract connect(...args: unknown[]): Promise<boolean>;
  abstract open(): Promise<boolean>;
  abstract write(data: Buffer): Promise<boolean>;
  abstract read(): Promise<Buffer>;
  abstract close(options?: { timeout?: number }): Promise<boolean>;
  abstract disconnect(): Promise<boolean>;
}

export type AdapterLike = {
  write(data: Buffer): Promise<boolean>;
  read(): Promise<Buffer>;
  close(options?: { timeout?: number }): Promise<boolean>;
  getState?(): string;
};

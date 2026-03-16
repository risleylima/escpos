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

  /**
   * Generic transport recovery hook.
   * Concrete adapters can override with interface-specific behavior.
   */
  async recover(): Promise<boolean> {
    return this.synchronized(async () => {
      try {
        await this.close();
      } catch {
        // Best-effort close during recovery.
      }
      return true;
    });
  }

  /**
   * Helper for transport-specific recovery: close, wait, reopen.
   * Concrete adapters use this to avoid duplicating the close/delay/reopen pattern.
   */
  protected async recoverAfterClose(delayMs: number, reopen: () => Promise<unknown>): Promise<boolean> {
    try {
      await this.close();
    } catch {
      // Best-effort close during recovery.
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await reopen();
    return true;
  }

  /**
   * Helper for chunked writes: sets BUSY state, loops over chunks, restores state.
   * Concrete adapters use this to avoid duplicating the write loop pattern.
   */
  protected async writeInChunks(
    data: Buffer,
    chunkSize: number,
    writeOne: (chunk: Buffer) => Promise<void>
  ): Promise<boolean> {
    const prevState = this.state;
    this.state = 'BUSY';
    try {
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.subarray(i, i + chunkSize);
        await writeOne(chunk);
      }
      return true;
    } finally {
      this.state = prevState === 'BUSY' ? 'READY' : prevState;
    }
  }

  abstract connect(...args: unknown[]): Promise<boolean>;
  abstract open(): Promise<boolean>;
  abstract write(data: Buffer): Promise<boolean>;
  abstract read(): Promise<Buffer>;
  abstract close(options?: { timeout?: number }): Promise<boolean>;
  abstract disconnect(): Promise<boolean>;
}

/**
 * Minimal printer transport interface.
 * Network and Serial always support read(). USB implements read() when the device
 * exposes an IN endpoint; otherwise it throws. Printer.getStatus() checks for
 * read support before calling.
 */
export type AdapterLike = {
  write(data: Buffer): Promise<boolean>;
  /** Reads data from device. USB throws when no IN endpoint. Caller should check before use. */
  read(): Promise<Buffer>;
  close(options?: { timeout?: number }): Promise<boolean>;
  recover?(): Promise<boolean>;
  getState?(): string;
};

'use strict';

const { Adapter } = require('../../../dist');

describe('Adapter', () => {
  class MockAdapter extends Adapter {
    async connect() { return true; }
    async open() { return true; }
    async write() { return true; }
    async read() { return Buffer.alloc(0); }
    async close() { return true; }
    async disconnect() { return true; }
  }

  let adapter;

  beforeEach(() => {
    adapter = new MockAdapter();
  });

  it('should be an instance of EventEmitter', () => {
    const EventEmitter = require('events');
    expect(adapter).toBeInstanceOf(EventEmitter);
  });

  it('should implement basic methods', async () => {
    expect(await adapter.connect()).toBe(true);
    expect(await adapter.open()).toBe(true);
    expect(await adapter.write()).toBe(true);
    expect(await adapter.close()).toBe(true);
  });

  it('should run default recover hook', async () => {
    const closeSpy = jest.spyOn(adapter, 'close');
    await expect(adapter.recover()).resolves.toBe(true);
    expect(closeSpy).toHaveBeenCalled();
  });
});

'use strict';

const Adapter = require('../../../src/adapter');

describe('Adapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new Adapter();
  });

  it('should be an instance of EventEmitter', () => {
    const EventEmitter = require('events');
    expect(adapter).toBeInstanceOf(EventEmitter);
  });

  it('should throw NotImplementedException for connect', () => {
    expect(() => adapter.connect()).toThrow(Error);
  });

  it('should throw NotImplementedException for open', () => {
    expect(() => adapter.open()).toThrow(Error);
  });

  it('should throw NotImplementedException for write', () => {
    expect(() => adapter.write()).toThrow(Error);
  });

  it('should throw NotImplementedException for close', () => {
    expect(() => adapter.close()).toThrow(Error);
  });

  it('should throw NotImplementedException for read', () => {
    expect(() => adapter.read()).toThrow(Error);
  });

  it('should copy properties from provided adapter', () => {
    const mockAdapter = {
      connect: jest.fn(),
      write: jest.fn(),
      customProp: 'test'
    };

    const adapter = new Adapter(mockAdapter);
    expect(adapter.customProp).toBe('test');
    expect(adapter.connect).toBe(mockAdapter.connect);
  });
});


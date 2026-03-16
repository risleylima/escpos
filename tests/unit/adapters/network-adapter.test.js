'use strict';

const { Network: NetworkClass } = require('../../../dist');
const net = require('net');

// Mock net module
let mockSockets = [];
jest.mock('net', () => {
  return {
    createConnection: jest.fn().mockImplementation((options, cb) => {
      const socket = {
        write: jest.fn().mockImplementation((data, cb) => {
          if (cb) cb();
          return true;
        }),
        once: jest.fn().mockImplementation((ev, fn) => {
          if (ev === 'close' || ev === 'drain') {
            if (ev === 'close') socket._closeHandler = fn;
          }
        }),
        on: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        setTimeout: jest.fn(),
        destroy: jest.fn().mockImplementation(() => {
          socket.destroyed = true;
          if (socket._closeHandler) socket._closeHandler();
        }),
        end: jest.fn().mockImplementation(() => {
          socket.destroyed = true;
          if (socket._closeHandler) socket._closeHandler();
        }),
        destroyed: false
      };
      global.mockSockets.push({ options, socket });
      if (cb) setTimeout(cb, 0);
      return socket;
    })
  };
});

global.mockSockets = mockSockets;

describe('Network Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockSockets = [];
  });

  it('should configure endpoints on connect (LSP)', async () => {
    const adapter = new NetworkClass();
    const result = await adapter.connect('127.0.0.1', 9100);
    expect(result).toBe(true);
    expect(net.createConnection).not.toHaveBeenCalled();
  });

  it('should connect/open/write/read/close', async () => {
    const adapter = new NetworkClass();
    await adapter.connect('127.0.0.1', 9100);
    await adapter.open();
    
    expect(net.createConnection).toHaveBeenCalled();
    const active = global.mockSockets[global.mockSockets.length - 1].socket;
    
    const result = await adapter.write(Buffer.from('hello'));
    expect(result).toBe(true);
    expect(active.write).toHaveBeenCalled();

    await adapter.close();
    expect(active.end).toHaveBeenCalled();
  });

  it('should disconnect manually before reconnecting to ensure queue safety', async () => {
    const adapter = new NetworkClass();
    
    // First connection
    await adapter.connect('10.0.0.1', 9100);
    await adapter.open();
    const first = global.mockSockets[global.mockSockets.length - 1].socket;

    // Explicit close to free the synchronized queue in the test
    await adapter.close();
    expect(first.end).toHaveBeenCalled();

    // Second connection
    await adapter.connect('10.0.0.2', 9100);
    await adapter.open();
    expect(global.mockSockets.length).toBe(2);
  });

  it('should recover by closing and reopening last endpoint', async () => {
    const adapter = new NetworkClass();
    await adapter.connect('127.0.0.1', 9100);
    await adapter.open();
    const first = global.mockSockets[global.mockSockets.length - 1].socket;

    const result = await adapter.recover();
    expect(result).toBe(true);
    expect(first.end).toHaveBeenCalled();
    expect(net.createConnection).toHaveBeenCalledTimes(2);
  });

  it('should accept connect with options object { host, port, timeout }', async () => {
    const adapter = new NetworkClass();
    const result = await adapter.connect({ host: '192.168.1.1', port: 9100, timeout: 5000 });
    expect(result).toBe(true);
    await adapter.open();
    expect(net.createConnection).toHaveBeenCalledWith(
      { host: '192.168.1.1', port: 9100 },
      expect.any(Function)
    );
  });

  it('should close existing socket then allow open to new host/port after connect(different)', async () => {
    const adapter = new NetworkClass();
    await adapter.connect('127.0.0.1', 9100);
    await adapter.open();
    const firstSocket = global.mockSockets[global.mockSockets.length - 1].socket;
    await adapter.close();
    expect(firstSocket.end).toHaveBeenCalled();
    await adapter.connect('127.0.0.2', 9200);
    await adapter.open();
    expect(global.mockSockets.length).toBe(2);
    expect(net.createConnection).toHaveBeenCalledWith(
      { host: '127.0.0.2', port: 9200 },
      expect.any(Function)
    );
  });
});

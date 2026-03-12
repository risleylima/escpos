'use strict';

const crypto = require('crypto');
const { Printer } = require('../../dist');

function digestPayload(buf) {
  const hex = buf.toString('hex').toLowerCase();
  return {
    length: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    startsWith: hex.slice(0, 24),
    endsWith: hex.slice(-24),
    hasNativeQr: hex.includes('1d286b'),
    hasRaster: hex.includes('1d763000'),
    hasPdf417: hex.includes('303031') && hex.includes('1d286b0300305130'),
  };
}

describe('QR Payload Snapshots', () => {
  let mockAdapter;

  beforeEach(() => {
    mockAdapter = {
      write: jest.fn().mockResolvedValue(true),
      read: jest.fn().mockResolvedValue(Buffer.from([0x14])),
      close: jest.fn().mockResolvedValue(true),
    };
  });

  it('default profile native QR payload snapshot', async () => {
    const printer = new Printer(mockAdapter);
    printer.hardware('init').qrcode('https://example.local/order/123', {
      size: 6,
      level: 'M',
      strategy: 'native',
    });
    await printer.flush();
    const payload = mockAdapter.write.mock.calls[0][0];
    expect(digestPayload(payload)).toMatchInlineSnapshot(`
{
  "endsWith": "2f3132331d286b0300315130",
  "hasNativeQr": true,
  "hasPdf417": false,
  "hasRaster": false,
  "length": 74,
  "sha256": "e25ecca1e73a8bdca463cd9adcb82c1652d5a9a1fe27887d98cdaa507ce78065",
  "startsWith": "1b401d286b0400314102001d",
}
`);
  });

  it('default profile raster QR payload snapshot', async () => {
    const printer = new Printer(mockAdapter);
    printer.hardware('init').qrcode('https://example.local/order/123', {
      size: 6,
      level: 'M',
      strategy: 'raster',
    });
    await printer.flush();
    const payload = mockAdapter.write.mock.calls[0][0];
    expect(digestPayload(payload)).toMatchInlineSnapshot(`
{
  "endsWith": "000000000000000000000000",
  "hasNativeQr": false,
  "hasPdf417": false,
  "hasRaster": true,
  "length": 6226,
  "sha256": "c32da4cea4521be5a9c3faf22456c8c8df82ff470471f5fd8822e1433c458286",
  "startsWith": "1b401d7630001c00de000000",
}
`);
  });

  it('bematech auto strategy matches raster payload', async () => {
    const autoPrinter = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
    autoPrinter.qrcode('https://example.local/order/123', {
      size: 6,
      level: 'M',
    });
    await autoPrinter.flush();
    const autoPayload = mockAdapter.write.mock.calls[0][0];

    mockAdapter.write.mockClear();

    const rasterPrinter = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
    rasterPrinter.qrcode('https://example.local/order/123', {
      size: 6,
      level: 'M',
      strategy: 'raster',
    });
    await rasterPrinter.flush();
    const rasterPayload = mockAdapter.write.mock.calls[0][0];

    expect(autoPayload.equals(rasterPayload)).toBe(true);
    expect(digestPayload(autoPayload).hasRaster).toBe(true);
  });

  it('bematech forced native QR still emits GS ( k', async () => {
    const printer = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
    printer.qrcode('https://example.local/order/123', {
      size: 6,
      level: 'M',
      strategy: 'native',
    });
    await printer.flush();
    const payload = mockAdapter.write.mock.calls[0][0];
    const d = digestPayload(payload);
    expect(d.hasNativeQr).toBe(true);
    expect(d.hasRaster).toBe(false);
  });

  it('bematech PDF417 code2d payload snapshot', async () => {
    const printer = new Printer(mockAdapter, { profile: 'bematech-mp4200th' });
    printer.code2d('VALE|ID=123456|DT=2026-03-12T12:00:00.000Z', 'PDF417');
    await printer.flush();
    const payload = mockAdapter.write.mock.calls[0][0];
    expect(digestPayload(payload)).toMatchInlineSnapshot(`
{
  "endsWith": "3030305a1d286b0300305130",
  "hasNativeQr": true,
  "hasPdf417": false,
  "hasRaster": false,
  "length": 107,
  "sha256": "9cafe0fee064c1b0a29f691b2bba690902d203fe00a476a14ab019175fb978fb",
  "startsWith": "1d286b03003041001d286b03",
}
`);
  });
});

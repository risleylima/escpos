'use strict';

// Test real image-loader (no mock): Buffer input, data URI, decodeImageBuffer
const {
  loadImagePixels,
  decodeImageBuffer,
  loadImageBuffer,
} = require('../../../dist/printer/image-loader');

// Minimal 1x1 JPEG (base64) – decodes correctly with jpeg-js
const MINI_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
const MINI_JPEG_BUFFER = Buffer.from(MINI_JPEG_B64, 'base64');

// Minimal 1x1 GIF89a (base64) – decodes with omggif
const MINI_GIF_B64 = 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
const MINI_GIF_BUFFER = Buffer.from(MINI_GIF_B64, 'base64');

describe('image-loader', () => {
  describe('decodeImageBuffer', () => {
    it('decodes JPEG buffer with magic bytes (no type)', async () => {
      const result = await decodeImageBuffer(MINI_JPEG_BUFFER);
      expect(result.shape).toEqual([1, 1, 3]);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(3);
    });

    it('decodes JPEG buffer with type hint', async () => {
      const result = await decodeImageBuffer(MINI_JPEG_BUFFER, 'image/jpeg');
      expect(result.shape).toEqual([1, 1, 3]);
    });
  });

  describe('loadImagePixels with Buffer', () => {
    it('accepts Buffer and decodes when type given', async () => {
      const result = await loadImagePixels(MINI_JPEG_BUFFER, 'image/jpeg');
      expect(result.shape).toEqual([1, 1, 3]);
      expect(result.data).toBeInstanceOf(Uint8Array);
    });

    it('accepts Buffer and infers format from magic bytes when type omitted', async () => {
      const result = await loadImagePixels(MINI_JPEG_BUFFER);
      expect(result.shape).toEqual([1, 1, 3]);
    });
  });

  describe('loadImagePixels with data URI', () => {
    it('decodes data:image/jpeg;base64,...', async () => {
      const dataUri = `data:image/jpeg;base64,${MINI_JPEG_B64}`;
      const result = await loadImagePixels(dataUri);
      expect(result.shape).toEqual([1, 1, 3]);
      expect(result.data).toBeInstanceOf(Uint8Array);
    });

    it('throws on invalid data URI', async () => {
      await expect(loadImagePixels('data:invalid')).rejects.toThrow(/Invalid data URI/);
    });
  });

  describe('loadImageBuffer', () => {
    it('returns buffer for data URI', async () => {
      const dataUri = `data:image/jpeg;base64,${MINI_JPEG_B64}`;
      const buf = await loadImageBuffer(dataUri);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBe(MINI_JPEG_BUFFER.length);
      expect(buf.equals(MINI_JPEG_BUFFER)).toBe(true);
    });
  });

  describe('GIF (omggif)', () => {
    it('decodes GIF buffer with magic bytes', async () => {
      const result = await decodeImageBuffer(MINI_GIF_BUFFER);
      expect(result.shape).toEqual([1, 1, 4]);
      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(4);
    });

    it('decodes GIF buffer with type hint', async () => {
      const result = await decodeImageBuffer(MINI_GIF_BUFFER, 'image/gif');
      expect(result.shape).toEqual([1, 1, 4]);
    });

    it('loadImagePixels accepts GIF data URI', async () => {
      const dataUri = `data:image/gif;base64,${MINI_GIF_B64}`;
      const result = await loadImagePixels(dataUri);
      expect(result.shape).toEqual([1, 1, 4]);
    });
  });

  describe('BMP Depths (1, 4, 8 bits)', () => {
    // Constructing a minimal 8x1 1-bit BMP Buffer
    const construct1BitBmp = () => {
      const buf = Buffer.alloc(54 + 8 + 4); // header + palette (2 colors) + 1 row (padded to 4 bytes)
      buf.write('BM');
      buf.writeUInt32LE(buf.length, 2);
      buf.writeUInt32LE(54 + 8, 10); // Offset
      buf.writeUInt32LE(40, 14); // Header size
      buf.writeUInt32LE(8, 18); // Width
      buf.writeInt32LE(1, 22); // Height
      buf.writeUInt16LE(1, 26); // Planes
      buf.writeUInt16LE(1, 28); // BitCount
      // Palette: 0=Black, 1=White
      buf.writeUInt32LE(0x00000000, 54);
      buf.writeUInt32LE(0x00FFFFFF, 58);
      // Pixel Data (8 pixels): 10101010 (0xAA)
      buf[54 + 8] = 0xAA;
      return buf;
    };

    it('decodes 1-bit BMP correctly', async () => {
      const buffer = construct1BitBmp();
      const result = await decodeImageBuffer(buffer);
      expect(result.shape).toEqual([8, 1, 3]);
      // Pixel 0 (bit 7) is 1 (White)
      expect(result.data[0]).toBe(255);
      // Pixel 1 (bit 6) is 0 (Black)
      expect(result.data[3]).toBe(0);
    });

    it('decodes 8-bit BMP correctly', async () => {
      const buf = Buffer.alloc(54 + 1024 + 4); // header + palette (256 colors) + 4 pixels (padded)
      buf.write('BM');
      buf.writeUInt32LE(54 + 1024, 10); // Offset
      buf.writeUInt32LE(40, 14); // Header size (must be 40)
      buf.writeUInt32LE(4, 18); // Width
      buf.writeInt32LE(1, 22); // Height
      buf.writeUInt16LE(1, 26); // Planes (must be 1)
      buf.writeUInt16LE(8, 28); // 8 bits
      // Palette[5] = Red
      buf.writeUInt32LE(0x00FF0000, 54 + 5 * 4);
      // Pixel data: index 5
      buf[54 + 1024] = 5;
      const result = await decodeImageBuffer(buf);
      expect(result.data[0]).toBe(255); // Red
    });
  });

  describe('PNG Advanced (Indexed, Grayscale)', () => {
    it('throws error for unsupported PNG interlace', async () => {
      const pngWithInterlace = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 
                                            0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 
                                            0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 1]); // Interlace 1
      await expect(decodeImageBuffer(pngWithInterlace)).rejects.toThrow();
    });
  });

  describe('Image.load with Buffer (get-pixels parity)', () => {
    it('Image.load accepts Buffer and type (JPEG)', async () => {
      const { Image } = require('../../../dist');
      const image = await Image.load(MINI_JPEG_BUFFER, 'image/jpeg');
      expect(image).toBeDefined();
      expect(image.size.width).toBe(1);
      expect(image.size.height).toBe(1);
      expect(image.size.colors).toBe(3);
    });

    it('Image.load accepts Buffer and type (GIF)', async () => {
      const { Image } = require('../../../dist');
      const image = await Image.load(MINI_GIF_BUFFER, 'image/gif');
      expect(image).toBeDefined();
      expect(image.size.width).toBe(1);
      expect(image.size.height).toBe(1);
      expect(image.size.colors).toBe(4);
    });
  });
});

'use strict';

// Mock image-loader (used by Image.load)
const mockLoadImagePixels = jest.fn(() => {
  const data = new Uint8Array(4 * 4 * 3).fill(0);
  for (let i = 0; i < 8; i++) data[i] = 50;
  for (let i = 24; i < 48; i++) data[i] = 250;
  return Promise.resolve({ shape: [4, 4, 3], data });
});
jest.mock('../../../dist/printer/image-loader', () => ({
  loadImagePixels: (...args) => mockLoadImagePixels(...args),
}));

const { Image } = require('../../../dist');

describe('Image', () => {
  describe('load', () => {
    it('should load image from URL', async () => {
      const image = await Image.load('test.png', 'image/png');
      expect(image).toBeInstanceOf(Image);
      expect(image.size.width).toBe(4);
      expect(image.size.height).toBe(4);
      expect(image.size.colors).toBe(3);
    });

    it('should reject on error', async () => {
      mockLoadImagePixels.mockRejectedValueOnce(new Error('Load failed'));

      await expect(Image.load('invalid.png', 'image/png')).rejects.toThrow('Load failed');
    });

    it('should accept processing options as second argument', async () => {
      const image = await Image.load('test.png', { mode: 'floydSteinberg', threshold: 180 });
      expect(image).toBeInstanceOf(Image);
      expect(image.options.mode).toBe('floydSteinberg');
      expect(image.options.threshold).toBe(180);
    });

    it('should accept type and processing options together', async () => {
      const image = await Image.load('test.png', 'image/png', { threshold: 120 });
      expect(image).toBeInstanceOf(Image);
      expect(image.options.mode).toBe('threshold');
      expect(image.options.threshold).toBe(120);
    });
  });

  describe('Constructor', () => {
    it('should create image from pixels', () => {
      const mockPixels = {
        shape: [2, 2, 3],
        data: new Uint8Array([0, 0, 0, 255, 255, 255, 0, 0, 0, 255, 255, 255])
      };

      const image = new Image(mockPixels);
      expect(image.size.width).toBe(2);
      expect(image.size.height).toBe(2);
      expect(image.size.colors).toBe(3);
      expect(image.data.length).toBe(4);
    });

    it('should convert pixels to binary data', () => {
      const mockPixels = {
        shape: [2, 2, 4], // width, height, channels (RGBA)
        data: new Uint8Array([
          0, 0, 0, 255,        // Pixel 0: preto (RGB=0,0,0)
          255, 255, 255, 255,  // Pixel 1: branco (RGB=255,255,255)
          0, 0, 0, 255,        // Pixel 2: preto (RGB=0,0,0)
          255, 255, 255, 255   // Pixel 3: branco (RGB=255,255,255)
        ])
      };

      const image = new Image(mockPixels);
      expect(image.data[0]).toBe(1); // Preto = 1 (r=0, g=0, b=0, não é branco)
      expect(image.data[1]).toBe(0); // Branco = 0 (r>200, g>200, b>200)
      expect(image.data[2]).toBe(1); // Preto = 1
      expect(image.data[3]).toBe(0); // Branco = 0
    });

    it('should handle transparent pixels', () => {
      const mockPixels = {
        shape: [1, 1, 4], // RGBA
        data: new Uint8Array([255, 255, 255, 0]) // Transparente
      };

      const image = new Image(mockPixels);
      expect(image.data[0]).toBe(0); // Transparente = 0
    });

    it('should use custom threshold when provided', () => {
      const mockPixels = {
        shape: [1, 1, 4],
        data: new Uint8Array([150, 150, 150, 255])
      };
      const image = new Image(mockPixels, { threshold: 100 });
      // 150 > 100 => white
      expect(image.data[0]).toBe(0);
    });

    it('should support floyd-steinberg mode', () => {
      const mockPixels = {
        shape: [2, 2, 4],
        data: new Uint8Array([
          50, 50, 50, 255,
          120, 120, 120, 255,
          180, 180, 180, 255,
          230, 230, 230, 255
        ])
      };
      const image = new Image(mockPixels, { mode: 'floydSteinberg', threshold: 160 });
      expect(image.data.length).toBe(4);
      // Should still be binary output only
      image.data.forEach((v) => expect([0, 1]).toContain(v));
    });
  });

  describe('toBitmap', () => {
    it('should convert to bitmap format', async () => {
      const image = await Image.load('test.png', 'image/png');
      const bitmap = image.toBitmap(24);

      expect(bitmap).toHaveProperty('data');
      expect(bitmap).toHaveProperty('density');
      expect(bitmap.density).toBe(24);
      expect(Array.isArray(bitmap.data)).toBe(true);
    });

    it('should use default density of 24', async () => {
      const image = await Image.load('test.png', 'image/png');
      const bitmap = image.toBitmap();

      expect(bitmap.density).toBe(24);
    });

    it('should handle different densities', async () => {
      const image = await Image.load('test.png', 'image/png');
      const bitmap8 = image.toBitmap(8);
      const bitmap24 = image.toBitmap(24);

      expect(bitmap8.density).toBe(8);
      expect(bitmap24.density).toBe(24);
    });

    it('should generate correct bitmap structure', async () => {
      const image = await Image.load('test.png', 'image/png');
      const bitmap = image.toBitmap(8);

      expect(bitmap.data.length).toBeGreaterThan(0);
      bitmap.data.forEach(line => {
        expect(Array.isArray(line)).toBe(true);
      });
    });
  });

  describe('toRaster', () => {
    it('should convert to raster format', async () => {
      const image = await Image.load('test.png', 'image/png');
      const raster = image.toRaster();

      expect(raster).toHaveProperty('data');
      expect(raster).toHaveProperty('width');
      expect(raster).toHaveProperty('height');
      expect(Array.isArray(raster.data)).toBe(true);
    });

    it('should calculate correct raster dimensions', async () => {
      const image = await Image.load('test.png', 'image/png');
      const raster = image.toRaster();

      // Width should be rounded up to nearest 8-bit boundary
      expect(raster.width).toBeGreaterThan(0);
      expect(raster.height).toBe(image.size.height);
    });

    it('should generate correct raster data structure', async () => {
      const image = await Image.load('test.png', 'image/png');
      const raster = image.toRaster();

      expect(raster.data.length).toBe(raster.width * raster.height);
    });
  });
});


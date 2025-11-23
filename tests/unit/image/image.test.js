'use strict';

const Image = require('../../../src/printer/image');

// Mock get-pixels
jest.mock('get-pixels', () => {
  return jest.fn((url, type, callback) => {
    // Simula pixels de uma imagem 4x4 RGB
    const mockPixels = {
      shape: [4, 4, 3], // width, height, channels
      data: new Uint8Array(4 * 4 * 3).fill(0)
    };
    
    // Preenche alguns pixels como "pretos" (valores baixos)
    for (let i = 0; i < 8; i++) {
      mockPixels.data[i] = 50; // Pixel escuro
    }
    
    // Preenche outros como "brancos" (valores altos)
    for (let i = 24; i < 48; i++) {
      mockPixels.data[i] = 250; // Pixel claro
    }
    
    callback(null, mockPixels);
  });
});

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
      const getPixels = require('get-pixels');
      getPixels.mockImplementationOnce((url, type, callback) => {
        callback(new Error('Load failed'), null);
      });

      await expect(Image.load('invalid.png', 'image/png')).rejects.toThrow('Load failed');
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


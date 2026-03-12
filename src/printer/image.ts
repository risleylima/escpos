import { loadImagePixels } from './image-loader';

export interface PixelsObject {
  shape: [number, number, number];
  data: Uint8Array;
}

export interface ImageProcessingOptions {
  /**
   * Binarization mode.
   * - threshold: fixed threshold (fast, deterministic)
   * - floydSteinberg: error-diffusion dithering (better gradients/logos/photos)
   */
  mode?: 'threshold' | 'floydSteinberg';
  /** Luma threshold for black/white split (0-255). Default: 200 */
  threshold?: number;
}

export class Image {
  pixels: PixelsObject;
  data: number[];
  size: { width: number; height: number; colors: number };
  options: Required<ImageProcessingOptions>;

  constructor(pixels: PixelsObject, options?: ImageProcessingOptions) {
    if (!pixels || typeof pixels !== 'object') {
      throw new TypeError('Image(pixels): pixels must be an object { shape: [w,h,c], data: Uint8Array }');
    }
    if (!Array.isArray(pixels.shape) || pixels.shape.length < 3) {
      throw new TypeError('Image(pixels): pixels.shape must be an array [width, height, colors]');
    }
    if (!pixels.data || !(pixels.data instanceof Uint8Array)) {
      throw new TypeError('Image(pixels): pixels.data must be a Uint8Array');
    }
    this.pixels = pixels;
    this.data = [];
    this.options = {
      mode: options?.mode ?? 'threshold',
      threshold: Math.max(0, Math.min(255, Math.floor(options?.threshold ?? 200))),
    };
    this.size = {
      width: this.pixels.shape[0],
      height: this.pixels.shape[1],
      colors: this.pixels.shape[2],
    };

    const luma = this.toLumaArray();
    this.data =
      this.options.mode === 'floydSteinberg'
        ? this.binarizeWithFloydSteinberg(luma)
        : this.binarizeByThreshold(luma);
  }

  private toLumaArray(): number[] {
    const values: number[] = [];
    for (let i = 0; i < this.pixels.data.length; i += this.size.colors) {
      const r = this.pixels.data[i] ?? 0;
      const g = this.pixels.data[i + 1] ?? 0;
      const b = this.pixels.data[i + 2] ?? 0;
      const a = this.pixels.data[i + 3] ?? 255;
      if (a === 0) {
        values.push(255);
      } else {
        // Perceptual luma (BT.601).
        values.push(0.299 * r + 0.587 * g + 0.114 * b);
      }
    }
    return values;
  }

  private binarizeByThreshold(luma: number[]): number[] {
    const t = this.options.threshold;
    return luma.map((v) => (v <= t ? 1 : 0));
  }

  private binarizeWithFloydSteinberg(luma: number[]): number[] {
    const width = this.size.width;
    const height = this.size.height;
    const t = this.options.threshold;
    const work = luma.slice();
    const out = new Array<number>(work.length).fill(0);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = work[idx];
        const newVal = oldVal <= t ? 0 : 255;
        const err = oldVal - newVal;
        out[idx] = newVal === 0 ? 1 : 0;

        if (x + 1 < width) work[idx + 1] += (err * 7) / 16;
        if (y + 1 < height) {
          if (x > 0) work[idx + width - 1] += (err * 3) / 16;
          work[idx + width] += (err * 5) / 16;
          if (x + 1 < width) work[idx + width + 1] += err / 16;
        }
      }
    }
    return out;
  }

  toBitmap(density: number = 24): { data: number[][]; density: number } {
    const result: number[][] = [];
    const c = density / 8;
    const n = Math.ceil(this.size.height / density);

    for (let y = 0; y < n; y++) {
      const ld: number[] = (result[y] = []);
      for (let x = 0; x < this.size.width; x++) {
        for (let b = 0; b < density; b++) {
          const i = x * c + (b >> 3);
          if (ld[i] === undefined) ld[i] = 0;
          const l = y * density + b;
          if (l < this.size.height && this.data[l * this.size.width + x]) {
            ld[i] += 0x80 >> (b & 0x7);
          }
        }
      }
    }
    return { data: result, density };
  }

  toRaster(): { data: number[]; width: number; height: number } {
    const width = this.size.width;
    const height = this.size.height;
    const data = this.data;
    const n = Math.ceil(width / 8);
    const result: number[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < n; x++) {
        if (result[y * n + x] === undefined) result[y * n + x] = 0;
        for (let b = 0; b < 8; b++) {
          const i = x * 8 + b;
          const c = x * 8 + b;
          if (c < width && data[y * width + i]) {
            result[y * n + x] += 0x80 >> (b & 0x7);
          }
        }
      }
    }
    return { data: result, width: n, height };
  }

  /**
   * Load image from file path, URL, data URI (data:image/png;base64,...), or in-memory Buffer.
   * Supports BMP (24-bit), PNG (8-bit RGB/RGBA), JPEG, and GIF (first frame, RGBA). For Buffer input, type is required if format cannot be inferred.
   */
  static load(
    urlOrPathOrBuffer: string | Buffer,
    typeOrOptions?: string | ImageProcessingOptions,
    maybeOptions?: ImageProcessingOptions
  ): Promise<Image> {
    const type = typeof typeOrOptions === 'string' ? typeOrOptions : undefined;
    const options = typeof typeOrOptions === 'string' ? maybeOptions : typeOrOptions;
    return loadImagePixels(urlOrPathOrBuffer, type).then((pixels) => new Image(pixels, options));
  }
}

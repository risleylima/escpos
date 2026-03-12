/**
 * Image loader: BMP and PNG with Node built-ins; JPEG via jpeg-js, GIF via omggif (port of get-pixels behaviour).
 */

import * as fs from 'fs';
import * as zlib from 'zlib';
import { decode as decodeJpeg } from 'jpeg-js';
import { GifReader } from 'omggif';
import { promisify } from 'util';

const inflate = promisify(zlib.inflate);

export interface PixelsResult {
  shape: [number, number, number];
  data: Uint8Array;
}

/** Parsed data URI: data:[mime];base64,<payload> */
function parseDataUri(uri: string): { buffer: Buffer; mime: string } {
  const match = /^data:([^;,]+)(?:;base64)?,(.*)$/.exec(uri);
  if (!match) throw new Error('Invalid data URI format');
  const mime = match[1].trim().toLowerCase();
  const base64 = match[2];
  if (!base64) throw new Error('Data URI has no payload');
  return { buffer: Buffer.from(base64, 'base64'), mime };
}

function isPath(str: string): boolean {
  return !str.startsWith('http://') && !str.startsWith('https://') && !str.startsWith('data:');
}

export async function loadImageBuffer(urlOrPath: string): Promise<Buffer> {
  if (urlOrPath.startsWith('data:')) {
    return Promise.resolve(parseDataUri(urlOrPath).buffer);
  }
  if (isPath(urlOrPath)) {
    return fs.promises.readFile(urlOrPath);
  }
  const res = await fetch(urlOrPath);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Parse 24-bit uncompressed BMP. Returns RGB (shape[2]==3).
 */
async function parseBmp(buffer: Buffer): Promise<PixelsResult> {
  if (buffer.length < 54 || buffer[0] !== 0x42 || buffer[1] !== 0x4d) {
    throw new Error('Invalid BMP: expected BM signature and minimal header');
  }
  const pixelOffset = buffer.readUInt32LE(10);
  const width = buffer.readUInt32LE(18);
  const height = Math.abs(buffer.readInt32LE(22));
  const planes = buffer.readUInt16LE(26);
  const bitCount = buffer.readUInt16LE(28);
  const compression = buffer.readUInt32LE(30);

  if (planes !== 1 || compression !== 0) {
    throw new Error('BMP: only uncompressed supported');
  }

  const palette: number[] = [];
  if (bitCount <= 8) {
    const paletteSize = 1 << bitCount;
    for (let i = 0; i < paletteSize; i++) {
      const offset = 54 + i * 4;
      palette.push(buffer[offset + 2], buffer[offset + 1], buffer[offset]); // RGB
    }
  }

  const rowSize = Math.ceil((width * bitCount) / 32) * 4;
  const pixelData = buffer.subarray(pixelOffset);
  const data = new Uint8Array(width * height * 3);
  const flip = buffer.readInt32LE(22) > 0;

  for (let y = 0; y < height; y++) {
    if (y % 100 === 0) await new Promise((resolve) => setImmediate(resolve));
    const srcY = flip ? height - 1 - y : y;
    const srcRow = pixelData.subarray(srcY * rowSize, (srcY + 1) * rowSize);
    
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      let r, g, b;

      if (bitCount === 24) {
        r = srcRow[x * 3 + 2];
        g = srcRow[x * 3 + 1];
        b = srcRow[x * 3];
      } else if (bitCount === 8) {
        const idx = srcRow[x];
        r = palette[idx * 3];
        g = palette[idx * 3 + 1];
        b = palette[idx * 3 + 2];
      } else if (bitCount === 4) {
        const byte = srcRow[x >> 1];
        const idx = (x & 1) === 0 ? byte >> 4 : byte & 0x0f;
        r = palette[idx * 3];
        g = palette[idx * 3 + 1];
        b = palette[idx * 3 + 2];
      } else if (bitCount === 1) {
        const byte = srcRow[x >> 3];
        const idx = (byte >> (7 - (x & 7))) & 1;
        r = palette[idx * 3];
        g = palette[idx * 3 + 1];
        b = palette[idx * 3 + 2];
      } else {
        throw new Error(`BMP: unsupported bit count ${bitCount}`);
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return { shape: [width, height, 3], data };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function parsePng(buffer: Buffer): Promise<PixelsResult> {
  if (buffer.length < 24 || buffer.subarray(0, 8).compare(PNG_SIGNATURE) !== 0) {
    throw new Error('Invalid PNG signature');
  }
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let palette: Buffer | null = null;
  let idatChunks: Buffer[] = [];

  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const payload = buffer.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;

    if (type === 'IHDR') {
      if (len < 8) throw new Error('PNG IHDR too short');
      width = payload.readUInt32BE(0);
      height = payload.readUInt32BE(4);
      depth = payload[8];
      colorType = payload[9];
      // Allowed: 0 (Gray), 2 (RGB), 3 (Indexed), 6 (RGBA)
      if (depth !== 8) {
        throw new Error('PNG: only 8-bit depth supported');
      }
    } else if (type === 'PLTE') {
      palette = payload;
    } else if (type === 'IDAT') {
      idatChunks.push(payload);
    } else if (type === 'IEND') {
      break;
    }
  }

  const raw = await inflate(Buffer.concat(idatChunks));
  
  // Channels in the output buffer (we always normalize to RGB or RGBA)
  let channels = 3;
  if (colorType === 6) channels = 4; // RGBA
  if (colorType === 0 || colorType === 3) channels = 3; // Normalize Gray/Indexed to RGB

  const bpp = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : 4;
  const rowBytes = 1 + width * bpp;
  const data = new Uint8Array(width * height * channels);
  let prevRow = new Uint8Array(width * bpp);

  for (let y = 0; y < height; y++) {
    if (y % 100 === 0) await new Promise((resolve) => setImmediate(resolve));
    const rowStart = y * rowBytes;
    const filter = raw[rowStart];
    
    for (let x = 0; x < width; x++) {
      const inIdx = rowStart + 1 + x * bpp;
      const outIdx = (y * width + x) * channels;
      
      for (let c = 0; c < bpp; c++) {
        let v = raw[inIdx + c];
        const left = x > 0 ? raw[inIdx - bpp + c] : 0; // Simplified filter access
        const up = prevRow[x * bpp + c] ?? 0;
        const upLeft = x > 0 ? (prevRow[(x - 1) * bpp + c] ?? 0) : 0;
        
        switch (filter) {
          case 1: v = (v + left) & 0xff; break;
          case 2: v = (v + up) & 0xff; break;
          case 3: v = (v + ((left + up) >>> 1)) & 0xff; break;
          case 4: {
            const p = left + up - upLeft;
            const pa = Math.abs(p - left);
            const pb = Math.abs(p - up);
            const pc = Math.abs(p - upLeft);
            v = (v + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 0xff;
            break;
          }
        }
        
        // Map to output channels
        if (colorType === 0) { // Grayscale
          data[outIdx] = data[outIdx+1] = data[outIdx+2] = v;
        } else if (colorType === 3) { // Indexed
          if (!palette) throw new Error('PNG: Missing palette for indexed image');
          data[outIdx] = palette[v * 3];
          data[outIdx+1] = palette[v * 3 + 1];
          data[outIdx+2] = palette[v * 3 + 2];
        } else {
          data[outIdx + c] = v;
        }
      }
    }
    // Update prevRow with reconstructed values for next line
    for(let i=0; i<width*bpp; i++) prevRow[i] = data[y*width*channels + i]; // Simplified for RGB/RGBA
  }
  return { shape: [width, height, channels], data };
}

/**
 * Decode JPEG to RGB (shape[2]==3) using jpeg-js.
 */
async function parseJpeg(buffer: Buffer): Promise<PixelsResult> {
  if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('Invalid JPEG: expected SOI marker FF D8');
  }
  // jpeg-js decode is synchronous but we wrap it to maintain API consistency
  const raw = decodeJpeg(buffer, { useTArray: true, formatAsRGBA: false });
  const data = raw.data instanceof Uint8Array ? raw.data : new Uint8Array(raw.data);
  return { shape: [raw.width, raw.height, 3], data };
}

/** GIF signature: GIF87a or GIF89a */
function isGifBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  );
}

/**
 * Decode GIF to RGBA (shape[2]==4) using omggif. Returns the first frame only (static or animated).
 */
async function parseGif(buffer: Buffer): Promise<PixelsResult> {
  if (!isGifBuffer(buffer)) {
    throw new Error('Invalid GIF: expected GIF87a or GIF89a signature');
  }
  const reader = new GifReader(new Uint8Array(buffer));
  const width = reader.width;
  const height = reader.height;
  const numFrames = reader.numFrames();
  if (numFrames === 0) {
    throw new Error('GIF has no image frames');
  }
  const data = new Uint8Array(width * height * 4);
  reader.decodeAndBlitFrameRGBA(0, data);
  return { shape: [width, height, 4], data };
}

export async function decodeImageBuffer(buffer: Buffer, mimeOrExt?: string): Promise<PixelsResult> {
  const hint = (mimeOrExt ?? '').toLowerCase();
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return parseBmp(buffer);
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).compare(PNG_SIGNATURE) === 0) {
    return parsePng(buffer);
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return parseJpeg(buffer);
  }
  if (buffer.length >= 6 && isGifBuffer(buffer)) {
    return parseGif(buffer);
  }
  if (hint.includes('png') || hint.endsWith('.png')) {
    return parsePng(buffer);
  }
  if (hint.includes('bmp') || hint.endsWith('.bmp')) {
    return parseBmp(buffer);
  }
  if (hint.includes('jpeg') || hint.includes('jpg') || hint.endsWith('.jpg') || hint.endsWith('.jpeg')) {
    return parseJpeg(buffer);
  }
  if (hint.includes('gif') || hint.endsWith('.gif')) {
    return parseGif(buffer);
  }
  throw new Error(
    'Unsupported image format: use BMP, PNG, JPEG, or GIF; or pass pixels to new Image(pixels)'
  );
}

/**
 * Load pixels from URL, path, data URI, or in-memory Buffer (like get-pixels).
 * - string path / http(s) URL: type optional (inferred from extension or content).
 * - data: URI: type taken from URI (e.g. data:image/png;base64,...).
 * - Buffer: type required when format cannot be inferred from magic bytes.
 */
export async function loadImagePixels(
  urlOrPathOrBuffer: string | Buffer,
  type?: string
): Promise<PixelsResult> {
  if (Buffer.isBuffer(urlOrPathOrBuffer)) {
    return decodeImageBuffer(urlOrPathOrBuffer, type);
  }
  const str = urlOrPathOrBuffer;
  if (str.startsWith('data:')) {
    const { buffer, mime } = parseDataUri(str);
    return decodeImageBuffer(buffer, mime);
  }
  const buffer = await loadImageBuffer(str);
  return decodeImageBuffer(buffer, type);
}

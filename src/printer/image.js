'use strict';
const getPixels = require('get-pixels');

/**
 * EscPos Image Object
 * @param {[type]} pixels Pixels formatted by the Get Pixels NPM Library
 */
class Image {
  constructor(pixels) {
    this.pixels = pixels;
    this.data = [];
    this.size = {
      width: this.pixels.shape[0],
      height: this.pixels.shape[1],
      colors: this.pixels.shape[2],
    };

    const rgb = (pixel) => {
      return {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        a: pixel[3]
      };
    };

    for (let i = 0; i < this.pixels.data.length; i += this.size.colors) {
      this.data.push(rgb(new Array(this.size.colors).fill(0).map((_, b) => {
        return this.pixels.data[i + b];
      })));
    };

    this.data = this.data.map((pixel) => {
      if (pixel.a == 0)
        return 0;
      let shouldBeWhite = pixel.r > 200 && pixel.g > 200 && pixel.b > 200;
      return shouldBeWhite ? 0 : 1;
    });
  }

  toBitmap(density) {
    density = density || 24;

    let ld, result = [];
    let x, y, b, l, i;
    let c = density / 8;

    // n blocks of lines
    let n = Math.ceil(this.size.height / density);

    for (y = 0; y < n; y++) {
      // line data
      ld = result[y] = [];

      for (x = 0; x < this.size.width; x++) {

        for (b = 0; b < density; b++) {
          i = x * c + (b >> 3);

          if (ld[i] === undefined) {
            ld[i] = 0;
          }

          l = y * density + b;
          if (l < this.size.height) {
            if (this.data[l * this.size.width + x]) {
              ld[i] += (0x80 >> (b & 0x7));
            }
          }
        }
      }
    }

    return {
      data: result,
      density: density
    };
  }

  toRaster() {
    let result = [];
    let width = this.size.width;
    let height = this.size.height;
    let data = this.data;

    // n blocks of lines
    let n = Math.ceil(width / 8);
    let x, y, b, c, i;

    for (y = 0; y < height; y++) {

      for (x = 0; x < n; x++) {

        for (b = 0; b < 8; b++) {
          i = x * 8 + b;

          if (result[y * n + x] === undefined) {
            result[y * n + x] = 0;
          }

          c = x * 8 + b;
          if (c < width) {
            if (data[y * width + i]) {
              result[y * n + x] += (0x80 >> (b & 0x7));
            }
          }
        }
      }
    }
    return {
      data: result,
      width: n,
      height: height
    };
  }


  /**
   * [load description]
   * @param  {[type]}   url      [description]
   * @param  {[type]}   type     [description]
   * @param  {Function} callback [description]
   * @return {Promise<Image>} Promise containing the Image Object itself;
   */
  static load = (url, type) => {
    return new Promise((resolve, reject) => {
      getPixels(url, type, (err, pixels) => {
        if (err)
          reject(err);
        resolve(new Image(pixels));
      });
    });
  }
};



module.exports = Image;
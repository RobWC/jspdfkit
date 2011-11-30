(function() {
  var Data, PNG, fs, zlib;
  fs = require('fs');
  Data = '../data';
  zlib = require('flate');
  PNG = (function() {
    PNG.open = function(filename) {
      var contents, data;
      contents = fs.readFileSync(filename);
      data = new Data(contents);
      return new PNG(data);
    };
    function PNG(data) {
      var chunkSize, colors, i, section, short, _ref;
      this.data = data;
      data.pos = 8;
      this.palette = [];
      this.imgData = [];
      this.transparency = {};
      while (true) {
        chunkSize = data.readUInt32();
        section = data.readString(4);
        switch (section) {
          case 'IHDR':
            this.width = data.readUInt32();
            this.height = data.readUInt32();
            this.bits = data.readByte();
            this.colorType = data.readByte();
            this.compressionMethod = data.readByte();
            this.filterMethod = data.readByte();
            this.interlaceMethod = data.readByte();
            break;
          case 'PLTE':
            this.palette = data.read(chunkSize);
            break;
          case 'IDAT':
            for (i = 0; 0 <= chunkSize ? i < chunkSize : i > chunkSize; 0 <= chunkSize ? i++ : i--) {
              this.imgData.push(data.readByte());
            }
            break;
          case 'tRNS':
            this.transparency = {};
            switch (this.colorType) {
              case 3:
                this.transparency.indexed = data.read(chunkSize);
                short = 255 - this.transparency.indexed.length;
                if (short > 0) {
                  for (i = 0; 0 <= short ? i < short : i > short; 0 <= short ? i++ : i--) {
                    this.transparency.indexed.push(255);
                  }
                }
                break;
              case 0:
                this.transparency.grayscale = data.read(chunkSize)[0];
                break;
              case 2:
                this.transparency.rgb = data.read(chunkSize);
            }
            break;
          case 'IEND':
            this.colors = (function() {
              switch (this.colorType) {
                case 0:
                case 3:
                case 4:
                  return 1;
                case 2:
                case 6:
                  return 3;
              }
            }).call(this);
            this.hasAlphaChannel = (_ref = this.colorType) === 4 || _ref === 6;
            colors = this.colors + (this.hasAlphaChannel ? 1 : 0);
            this.pixelBitlength = this.bits * colors;
            this.colorSpace = (function() {
              switch (this.colors) {
                case 1:
                  return 'DeviceGray';
                case 3:
                  return 'DeviceRGB';
              }
            }).call(this);
            this.imgData = new Buffer(this.imgData);
            return;
          default:
            data.pos += chunkSize;
        }
        data.pos += 4;
      }
      return;
    }
    PNG.prototype.object = function(document) {
      var mask, obj, palette, rgb, sMask, val, x, _i, _len;
      obj = document.ref({
        Type: 'XObject',
        Subtype: 'Image',
        BitsPerComponent: this.bits,
        Width: this.width,
        Height: this.height,
        Length: this.imgData.length,
        Filter: 'FlateDecode'
      });
      if (!this.hasAlphaChannel) {
        obj.data['DecodeParms'] = {
          Predictor: 15,
          Colors: this.colors,
          BitsPerComponent: this.bits,
          Columns: this.width
        };
      }
      if (this.palette.length === 0) {
        obj.data['ColorSpace'] = this.colorSpace;
      } else {
        palette = document.ref({
          Length: this.palette.length
        });
        palette.add(new Buffer(this.palette));
        obj.data['ColorSpace'] = ['Indexed', 'DeviceRGB', (this.palette.length / 3) - 1, palette];
      }
      if (this.transparency.grayscale) {
        val = this.transparency.greyscale;
        obj.data['Mask'] = [val, val];
      } else if (this.transparency.rgb) {
        rgb = this.transparency.rgb;
        mask = [];
        for (_i = 0, _len = rgb.length; _i < _len; _i++) {
          x = rgb[_i];
          mask.push(x, x);
        }
        obj.data['Mask'] = mask;
      } else if (this.transparency.indexed) {
        this.loadIndexedAlphaChannel();
      }
      if (this.hasAlphaChannel) {
        this.splitAlphaChannel();
        obj.data['Length'] = this.imgData.length;
      }
      if (this.alphaChannel) {
        sMask = document.ref({
          Type: 'XObject',
          Subtype: 'Image',
          Height: this.height,
          Width: this.width,
          BitsPerComponent: 8,
          Length: this.alphaChannel.length,
          Filter: 'FlateDecode',
          ColorSpace: 'DeviceGray',
          Decode: [0, 1]
        });
        sMask.add(this.alphaChannel);
        obj.data['SMask'] = sMask;
      }
      obj.add(this.imgData);
      return obj;
    };
    PNG.prototype.decodePixels = function() {
      var byte, col, data, filter, i, left, length, p, pa, paeth, pb, pc, pixelBytes, pixels, pos, row, rowData, s, scanlineLength, upper, upperLeft, _ref;
      data = zlib.inflate(this.imgData);
      pixelBytes = this.pixelBitlength / 8;
      scanlineLength = pixelBytes * this.width;
      row = 0;
      pixels = [];
      length = data.length;
      pos = 0;
      while (pos < length) {
        filter = data[pos++];
        i = 0;
        rowData = [];
        switch (filter) {
          case 0:
            while (i < scanlineLength) {
              rowData[i++] = data[pos++];
            }
            break;
          case 1:
            while (i < scanlineLength) {
              byte = data[pos++];
              left = i < pixelBytes ? 0 : rowData[i - pixelBytes];
              rowData[i++] = (byte + left) % 256;
            }
            break;
          case 2:
            while (i < scanlineLength) {
              byte = data[pos++];
              col = (i - (i % pixelBytes)) / pixelBytes;
              upper = row === 0 ? 0 : pixels[row - 1][col][i % pixelBytes];
              rowData[i++] = (upper + byte) % 256;
            }
            break;
          case 3:
            while (i < scanlineLength) {
              byte = data[pos++];
              col = (i - (i % pixelBytes)) / pixelBytes;
              left = i < pixelBytes ? 0 : rowData[i - pixelBytes];
              upper = row === 0 ? 0 : pixels[row - 1][col][i % pixelBytes];
              rowData[i++] = (byte + Math.floor((left + upper) / 2)) % 256;
            }
            break;
          case 4:
            while (i < scanlineLength) {
              byte = data[pos++];
              col = (i - (i % pixelBytes)) / pixelBytes;
              left = i < pixelBytes ? 0 : rowData[i - pixelBytes];
              if (row === 0) {
                upper = upperLeft = 0;
              } else {
                upper = pixels[row - 1][col][i % pixelBytes];
                upperLeft = col === 0 ? 0 : pixels[row - 1][col - 1][i % pixelBytes];
              }
              p = left + upper - upperLeft;
              pa = Math.abs(p - left);
              pb = Math.abs(p - upper);
              pc = Math.abs(p - upperLeft);
              if (pa <= pb && pa <= pc) {
                paeth = left;
              } else if (pb <= pc) {
                paeth = upper;
              } else {
                paeth = upperLeft;
              }
              rowData[i++] = (byte + paeth) % 256;
            }
            break;
          default:
            throw new Error("Invalid filter algorithm: " + filter);
        }
        s = [];
        for (i = 0, _ref = rowData.length; 0 <= _ref ? i < _ref : i > _ref; i += pixelBytes) {
          s.push(rowData.slice(i, i + pixelBytes));
        }
        pixels.push(s);
        row += 1;
      }
      return pixels;
    };
    PNG.prototype.splitAlphaChannel = function() {
      var a, alphaByteSize, alphaChannel, colorByteSize, i, imgData, p, pixel, pixelCount, pixels, row, _i, _j, _len, _len2;
      pixels = this.decodePixels();
      colorByteSize = this.colors * this.bits / 8;
      alphaByteSize = 1;
      pixelCount = this.width * this.height;
      imgData = new Buffer(pixelCount * colorByteSize);
      alphaChannel = new Buffer(pixelCount);
      p = a = 0;
      for (_i = 0, _len = pixels.length; _i < _len; _i++) {
        row = pixels[_i];
        for (_j = 0, _len2 = row.length; _j < _len2; _j++) {
          pixel = row[_j];
          for (i = 0; 0 <= colorByteSize ? i < colorByteSize : i > colorByteSize; 0 <= colorByteSize ? i++ : i--) {
            imgData[p++] = pixel[i];
          }
          alphaChannel[a++] = pixel[colorByteSize];
        }
      }
      this.imgData = zlib.deflate(imgData);
      return this.alphaChannel = zlib.deflate(alphaChannel);
    };
    PNG.prototype.decodePalette = function() {
      var alpha, decodingMap, i, index, palette, pixel, transparency, _ref, _ref2, _ref3;
      palette = this.palette;
      transparency = (_ref = this.transparency.indexed) != null ? _ref : [];
      decodingMap = [];
      index = 0;
      for (i = 0, _ref2 = palette.length; i < _ref2; i += 3) {
        alpha = (_ref3 = transparency[index++]) != null ? _ref3 : 255;
        pixel = palette.slice(i, i + 3).concat(alpha);
        decodingMap.push(pixel);
      }
      return decodingMap;
    };
    PNG.prototype.loadIndexedAlphaChannel = function() {
      var alphaChannel, i, palette, pixel, pixelCount, pixels, row, _i, _j, _len, _len2;
      palette = this.decodePalette();
      pixels = this.decodePixels();
      pixelCount = this.width * this.height;
      alphaChannel = new Buffer(pixelCount);
      i = 0;
      for (_i = 0, _len = pixels.length; _i < _len; _i++) {
        row = pixels[_i];
        for (_j = 0, _len2 = row.length; _j < _len2; _j++) {
          pixel = row[_j];
          pixel = pixel[0];
          alphaChannel[i++] = palette[pixel][3];
        }
      }
      return this.alphaChannel = zlib.deflate(alphaChannel);
    };
    return PNG;
  })();
  module.exports = PNG;
}).call(this);

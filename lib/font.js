(function() {
  /*
  PDFFont - embeds fonts in PDF documents
  By Devon Govett
  */
  var AFMFont, PDFFont, Subset, TTFFont, zlib;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  TTFFont = require('./font/ttf');
  AFMFont = require('./font/afm');
  Subset = require('./font/subset');
  zlib = require('flate');
  PDFFont = (function() {
    var toUnicodeCmap;
    function PDFFont(document, filename, family, id) {
      var _ref;
      this.document = document;
      this.filename = filename;
      this.family = family;
      this.id = id;
      if (_ref = this.filename, __indexOf.call(this._standardFonts, _ref) >= 0) {
        this.embedStandard();
      } else if (/\.(ttf|ttc)$/i.test(this.filename)) {
        this.ttf = TTFFont.open(this.filename, this.family);
        this.subset = new Subset(this.ttf);
        this.registerTTF();
      } else if (/\.dfont$/i.test(this.filename)) {
        this.ttf = TTFFont.fromDFont(this.filename, this.family);
        this.subset = new Subset(this.ttf);
        this.registerTTF();
      } else {
        throw new Error('Not a supported font format or standard PDF font.');
      }
    }
    PDFFont.prototype.use = function(characters) {
      var _ref;
      return (_ref = this.subset) != null ? _ref.use(characters) : void 0;
    };
    PDFFont.prototype.embed = function() {
      if (!this.isAFM) {
        return this.embedTTF();
      }
    };
    PDFFont.prototype.encode = function(text) {
      var _ref;
      return ((_ref = this.subset) != null ? _ref.encodeText(text) : void 0) || text;
    };
    PDFFont.prototype.registerTTF = function() {
      var e, gid, hi, i, low, raw, _ref;
      this.scaleFactor = 1000.0 / this.ttf.head.unitsPerEm;
      this.bbox = (function() {
        var _i, _len, _ref, _results;
        _ref = this.ttf.bbox;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          _results.push(Math.round(e * this.scaleFactor));
        }
        return _results;
      }).call(this);
      this.stemV = 0;
      if (this.ttf.post.exists) {
        raw = this.ttf.post.italic_angle;
        hi = raw >> 16;
        low = raw & 0xFF;
        if (hi & 0x8000 !== 0) {
          hi = -((hi ^ 0xFFFF) + 1);
        }
        this.italicAngle = +("" + hi + "." + low);
      } else {
        this.italicAngle = 0;
      }
      this.ascender = Math.round(this.ttf.ascender * this.scaleFactor);
      this.decender = Math.round(this.ttf.decender * this.scaleFactor);
      this.lineGap = Math.round(this.ttf.lineGap * this.scaleFactor);
      this.capHeight = (this.ttf.os2.exists && this.ttf.os2.capHeight) || this.ascender;
      this.xHeight = (this.ttf.os2.exists && this.ttf.os2.xHeight) || 0;
      this.familyClass = (this.ttf.os2.exists && this.ttf.os2.familyClass || 0) >> 8;
      this.isSerif = (_ref = this.familyClass) === 1 || _ref === 2 || _ref === 3 || _ref === 4 || _ref === 5 || _ref === 7;
      this.isScript = this.familyClass === 10;
      this.flags = 0;
      if (this.ttf.post.isFixedPitch) {
        this.flags |= 1 << 0;
      }
      if (this.isSerif) {
        this.flags |= 1 << 1;
      }
      if (this.isScript) {
        this.flags |= 1 << 3;
      }
      if (this.italicAngle !== 0) {
        this.flags |= 1 << 6;
      }
      this.flags |= 1 << 5;
      this.cmap = this.ttf.cmap.unicode;
      if (!this.cmap) {
        throw new Error('No unicode cmap for font');
      }
      this.hmtx = this.ttf.hmtx;
      this.charWidths = (function() {
        var _ref2, _results;
        _ref2 = this.cmap.codeMap;
        _results = [];
        for (i in _ref2) {
          gid = _ref2[i];
          if (i >= 32) {
            _results.push(Math.round(this.hmtx.widths[gid] * this.scaleFactor));
          }
        }
        return _results;
      }).call(this);
      return this.ref = this.document.ref({
        Type: 'Font',
        Subtype: 'TrueType'
      });
    };
    PDFFont.prototype.embedTTF = function() {
      var charWidths, cmap, code, compressedData, data, firstChar, glyph, key, ref, val, _results;
      data = this.subset.encode();
      compressedData = zlib.deflate(data);
      this.fontfile = this.document.ref({
        Length: compressedData.length,
        Length1: data.length,
        Filter: 'FlateDecode'
      });
      this.fontfile.add(compressedData);
      this.descriptor = this.document.ref({
        Type: 'FontDescriptor',
        FontName: this.subset.postscriptName,
        FontFile2: this.fontfile,
        FontBBox: this.bbox,
        Flags: this.flags,
        StemV: this.stemV,
        ItalicAngle: this.italicAngle,
        Ascent: this.ascender,
        Descent: this.decender,
        CapHeight: this.capHeight,
        XHeight: this.xHeight
      });
      firstChar = +Object.keys(this.subset.cmap)[0];
      charWidths = (function() {
        var _ref, _results;
        _ref = this.subset.cmap;
        _results = [];
        for (code in _ref) {
          glyph = _ref[code];
          _results.push(Math.round(this.ttf.hmtx.forGlyph(glyph).advance * this.scaleFactor));
        }
        return _results;
      }).call(this);
      cmap = this.document.ref();
      cmap.add(toUnicodeCmap(this.subset.subset));
      cmap.finalize(true);
      ref = {
        Type: 'Font',
        BaseFont: this.subset.postscriptName,
        Subtype: 'TrueType',
        FontDescriptor: this.descriptor,
        FirstChar: firstChar,
        LastChar: firstChar + charWidths.length - 1,
        Widths: this.document.ref(charWidths),
        Encoding: 'MacRomanEncoding',
        ToUnicode: cmap
      };
      _results = [];
      for (key in ref) {
        val = ref[key];
        _results.push(this.ref.data[key] = val);
      }
      return _results;
    };
    toUnicodeCmap = function(map) {
      var code, codes, range, unicode, unicodeMap, _i, _len;
      unicodeMap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo <<\n  /Registry (Adobe)\n  /Ordering (UCS)\n  /Supplement 0\n>> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<00><ff>\nendcodespacerange';
      codes = Object.keys(map).sort(function(a, b) {
        return a - b;
      });
      range = [];
      for (_i = 0, _len = codes.length; _i < _len; _i++) {
        code = codes[_i];
        if (range.length >= 100) {
          unicodeMap += "\n" + range.length + " beginbfchar\n" + (range.join('\n')) + "\nendbfchar";
          range = [];
        }
        unicode = ('0000' + map[code].toString(16)).slice(-4);
        code = (+code).toString(16);
        range.push("<" + code + "><" + unicode + ">");
      }
      if (range.length) {
        unicodeMap += "\n" + range.length + " beginbfchar\n" + (range.join('\n')) + "\nendbfchar\n";
      }
      return unicodeMap += 'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
    };
    PDFFont.prototype.embedStandard = function() {
      var font;
      this.isAFM = true;
      font = AFMFont.open(__dirname + ("/font/data/" + this.filename + ".afm"));
      this.ascender = font.ascender, this.decender = font.decender, this.bbox = font.bbox, this.lineGap = font.lineGap, this.charWidths = font.charWidths;
      return this.ref = this.document.ref({
        Type: 'Font',
        BaseFont: this.filename,
        Subtype: 'Type1'
      });
    };
    PDFFont.prototype._standardFonts = ["Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique", "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique", "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic", "Symbol", "ZapfDingbats"];
    PDFFont.prototype.widthOfString = function(string, size) {
      var charCode, i, scale, width, _ref;
      string = '' + string;
      width = 0;
      for (i = 0, _ref = string.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        charCode = string.charCodeAt(i) - (this.isAFM ? 0 : 32);
        width += this.charWidths[charCode] || 0;
      }
      scale = size / 1000;
      return width * scale;
    };
    PDFFont.prototype.lineHeight = function(size, includeGap) {
      var gap;
      if (includeGap == null) {
        includeGap = false;
      }
      gap = includeGap ? this.lineGap : 0;
      return (this.ascender + gap - this.decender) / 1000 * size;
    };
    return PDFFont;
  })();
  module.exports = PDFFont;
}).call(this);

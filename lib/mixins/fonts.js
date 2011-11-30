(function() {
  var PDFFont;
  PDFFont = require('../font');
  module.exports = {
    initFonts: function() {
      this._fontFamilies = {};
      this._fontCount = 0;
      this._fontSize = 12;
      this._font = null;
      this._registeredFonts = {};
      return this.font('Helvetica');
    },
    font: function(filename, family, size) {
      var id, _ref;
      if (typeof family === 'number') {
        size = family;
        family = null;
      }
      if (this._registeredFonts[filename]) {
        _ref = this._registeredFonts[filename], filename = _ref.filename, family = _ref.family;
      }
      if (size != null) {
        this.fontSize(size);
      }
      if (family == null) {
        family = filename;
      }
      if (this._fontFamilies[family]) {
        this._font = this._fontFamilies[family];
        return this;
      }
      id = 'F' + (++this._fontCount);
      this._font = new PDFFont(this, filename, family, id);
      this._fontFamilies[family] = this._font;
      return this;
    },
    fontSize: function(_fontSize) {
      this._fontSize = _fontSize;
      return this;
    },
    widthOfString: function(string) {
      return this._font.widthOfString(string, this._fontSize);
    },
    currentLineHeight: function(includeGap) {
      if (includeGap == null) {
        includeGap = false;
      }
      return this._font.lineHeight(this._fontSize, includeGap);
    },
    registerFont: function(name, path, family) {
      return this._registeredFonts[name] = {
        filename: path,
        family: family
      };
    }
  };
}).call(this);

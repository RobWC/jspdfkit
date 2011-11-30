(function() {
  var PDFImage;
  PDFImage = require('../image');
  module.exports = {
    initImages: function() {
      this._imageRegistry = {};
      return this._imageCount = 0;
    },
    image: function(src, x, y, options) {
      var bh, bp, bw, h, hp, image, ip, label, obj, w, wp, _base, _ref, _ref2, _ref3, _ref4, _ref5;
      if (options == null) {
        options = {};
      }
      if (typeof x === 'object') {
        options = x;
        x = null;
      }
      x = (_ref = x != null ? x : options.x) != null ? _ref : this.x;
      y = (_ref2 = y != null ? y : options.y) != null ? _ref2 : this.y;
      if (this._imageRegistry[src]) {
        _ref3 = this._imageRegistry[src], image = _ref3[0], obj = _ref3[1], label = _ref3[2];
      } else {
        image = PDFImage.open(src);
        obj = image.object(this);
        label = "I" + (++this._imageCount);
        this._imageRegistry[src] = [image, obj, label];
      }
      w = options.width || image.width;
      h = options.height || image.height;
      if (options.width && !options.height) {
        wp = w / image.width;
        w = image.width * wp;
        h = image.height * wp;
      } else if (options.height && !options.width) {
        hp = h / image.height;
        w = image.width * hp;
        h = image.height * hp;
      } else if (options.scale) {
        w = image.width * options.scale;
        h = image.height * options.scale;
      } else if (options.fit) {
        _ref4 = options.fit, bw = _ref4[0], bh = _ref4[1];
        bp = bw / bh;
        ip = image.width / image.height;
        if (ip > bp) {
          w = bw;
          h = bw / ip;
        } else {
          h = bh;
          w = bh * ip;
        }
      }
      if (this.y === y) {
        this.y += h;
      }
      y = this.page.height - y - h;
      if ((_ref5 = (_base = this.page.xobjects)[label]) == null) {
        _base[label] = obj;
      }
      this.save();
      this.addContent("" + w + " 0 0 " + h + " " + x + " " + y + " cm");
      this.addContent("/" + label + " Do");
      this.restore();
      return this;
    }
  };
}).call(this);

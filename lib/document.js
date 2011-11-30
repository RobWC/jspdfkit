(function() {
  /*
  PDFDocument - represents an entire PDF document
  By Devon Govett
  */
  var PDFDocument, PDFObject, PDFObjectStore, PDFPage, PDFReference, fs;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  fs = require('fs');
  PDFObjectStore = require('./store');
  PDFObject = require('./object');
  PDFReference = require('./reference');
  PDFPage = require('./page');
  PDFDocument = (function() {
    var mixin;
    function PDFDocument(options) {
      var key, val, _ref;
      this.options = options != null ? options : {};
      this.version = 1.3;
      this.compress = true;
      this.store = new PDFObjectStore;
      this.pages = [];
      this.page = null;
      this.initColor();
      this.initFonts();
      this.initText();
      this.initImages();
      this._info = this.ref({
        Producer: 'PDFKit',
        Creator: 'PDFKit',
        CreationDate: new Date()
      });
      this.info = this._info.data;
      if (this.options.info) {
        _ref = this.options.info;
        for (key in _ref) {
          val = _ref[key];
          this.info[key] = val;
        }
        delete this.options.info;
      }
      this.addPage();
    }
    mixin = __bind(function(name) {
      var method, methods, _results;
      methods = require('./mixins/' + name);
      _results = [];
      for (name in methods) {
        method = methods[name];
        _results.push(this.prototype[name] = method);
      }
      return _results;
    }, PDFDocument);
    mixin('color');
    mixin('vector');
    mixin('fonts');
    mixin('text');
    mixin('images');
    mixin('annotations');
    PDFDocument.prototype.addPage = function(options) {
      if (options == null) {
        options = this.options;
      }
      this.page = new PDFPage(this, options);
      this.store.addPage(this.page);
      this.pages.push(this.page);
      this.x = this.page.margins.left;
      this.y = this.page.margins.top;
      return this;
    };
    PDFDocument.prototype.ref = function(data) {
      return this.store.ref(data);
    };
    PDFDocument.prototype.addContent = function(str) {
      this.page.content.add(str);
      return this;
    };
    PDFDocument.prototype.write = function(filename, callback) {
      return fs.writeFile(filename, this.output(), 'binary', callback);
    };
    PDFDocument.prototype.output = function() {
      var out;
      out = [];
      this.finalize();
      this.generateHeader(out);
      this.generateBody(out);
      this.generateXRef(out);
      this.generateTrailer(out);
      return out.join('\n');
    };
    PDFDocument.prototype.finalize = function() {
      var family, font, key, page, val, _i, _len, _ref, _ref2, _ref3, _results;
      _ref = this.info;
      for (key in _ref) {
        val = _ref[key];
        if (typeof val === 'string') {
          this.info[key] = PDFObject.s(val);
        }
      }
      _ref2 = this._fontFamilies;
      for (family in _ref2) {
        font = _ref2[family];
        font.embed();
      }
      _ref3 = this.pages;
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        page = _ref3[_i];
        _results.push(page.finalize());
      }
      return _results;
    };
    PDFDocument.prototype.generateHeader = function(out) {
      out.push("%PDF-" + this.version);
      out.push("%\xFF\xFF\xFF\xFF\n");
      return out;
    };
    PDFDocument.prototype.generateBody = function(out) {
      var id, object, offset, ref, _ref;
      offset = out.join('\n').length;
      _ref = this.store.objects;
      for (id in _ref) {
        ref = _ref[id];
        object = ref.object();
        ref.offset = offset;
        out.push(object);
        offset += object.length + 1;
      }
      return this.xref_offset = offset;
    };
    PDFDocument.prototype.generateXRef = function(out) {
      var id, len, offset, ref, _ref, _results;
      len = this.store.length + 1;
      out.push("xref");
      out.push("0 " + len);
      out.push("0000000000 65535 f ");
      _ref = this.store.objects;
      _results = [];
      for (id in _ref) {
        ref = _ref[id];
        offset = ('0000000000' + ref.offset).slice(-10);
        _results.push(out.push(offset + ' 00000 n '));
      }
      return _results;
    };
    PDFDocument.prototype.generateTrailer = function(out) {
      var trailer;
      trailer = PDFObject.convert({
        Size: this.store.length,
        Root: this.store.root,
        Info: this._info
      });
      out.push('trailer');
      out.push(trailer);
      out.push('startxref');
      out.push(this.xref_offset);
      return out.push('%%EOF');
    };
    PDFDocument.prototype.toString = function() {
      return "[object PDFDocument]";
    };
    return PDFDocument;
  }).call(this);
  module.exports = PDFDocument;
}).call(this);

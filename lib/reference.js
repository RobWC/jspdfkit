(function() {
  /*
  PDFReference - represents a reference to another object in the PDF object heirarchy
  By Devon Govett
  */
  var PDFObject, PDFReference, zlib;
  zlib = require('flate');
  PDFReference = (function() {
    function PDFReference(id, data) {
      this.id = id;
      this.data = data != null ? data : {};
      this.gen = 0;
      this.stream = null;
      this.finalizedStream = null;
    }
    PDFReference.prototype.object = function() {
      var out;
      if (!this.finalizedStream) {
        this.finalize();
      }
      out = ["" + this.id + " " + this.gen + " obj"];
      out.push(PDFObject.convert(this.data));
      if (this.stream) {
        out.push("stream");
        out.push(this.finalizedStream);
        out.push("endstream");
      }
      out.push("endobj");
      return out.join('\n');
    };
    PDFReference.prototype.add = function(s) {
      var _ref;
      if ((_ref = this.stream) == null) {
        this.stream = [];
      }
      return this.stream.push(Buffer.isBuffer(s) ? s.toString('binary') : s);
    };
    PDFReference.prototype.finalize = function(compress) {
      var compressedData, data, i, _base, _ref;
      if (compress == null) {
        compress = false;
      }
      if (this.stream) {
        data = this.stream.join('\n');
        if (compress) {
          data = new Buffer((function() {
            var _ref, _results;
            _results = [];
            for (i = 0, _ref = data.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              _results.push(data.charCodeAt(i));
            }
            return _results;
          })());
          compressedData = zlib.deflate(data);
          this.finalizedStream = compressedData.toString('binary');
          this.data.Filter = 'FlateDecode';
          return (_ref = (_base = this.data).Length) != null ? _ref : _base.Length = this.finalizedStream.length;
        } else {
          return this.finalizedStream = data;
        }
      } else {
        return this.finalizedStream = '';
      }
    };
    PDFReference.prototype.toString = function() {
      return "" + this.id + " " + this.gen + " R";
    };
    return PDFReference;
  })();
  module.exports = PDFReference;
  PDFObject = require('./object');
}).call(this);

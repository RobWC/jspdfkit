(function() {
  var DFont, Data, fs;
  fs = require('fs');
  Data = require('../data');
  DFont = (function() {
    DFont.open = function(filename) {
      var contents;
      contents = fs.readFileSync(filename);
      return new DFont(contents);
    };
    function DFont(contents) {
      this.contents = new Data(contents);
      this.parse(this.contents);
    }
    DFont.prototype.parse = function(data) {
      var attr, b2, b3, b4, dataLength, dataOffset, dataOfs, entry, handle, i, id, len, mapLength, mapOffset, maxIndex, maxTypeIndex, nameListOffset, nameOfs, p, pos, refListOffset, type, typeListOffset;
      dataOffset = data.readInt();
      mapOffset = data.readInt();
      dataLength = data.readInt();
      mapLength = data.readInt();
      this.map = {};
      data.pos = mapOffset + 24;
      typeListOffset = data.readShort() + mapOffset;
      nameListOffset = data.readShort() + mapOffset;
      data.pos = typeListOffset;
      maxIndex = data.readShort();
      for (i = 0; 0 <= maxIndex ? i <= maxIndex : i >= maxIndex; 0 <= maxIndex ? i++ : i--) {
        type = data.readString(4);
        maxTypeIndex = data.readShort();
        refListOffset = data.readShort();
        this.map[type] = {
          list: [],
          named: {}
        };
        pos = data.pos;
        data.pos = typeListOffset + refListOffset;
        for (i = 0; 0 <= maxTypeIndex ? i <= maxTypeIndex : i >= maxTypeIndex; 0 <= maxTypeIndex ? i++ : i--) {
          id = data.readShort();
          nameOfs = data.readShort();
          attr = data.readByte();
          b2 = data.readByte() << 16;
          b3 = data.readByte() << 8;
          b4 = data.readByte();
          dataOfs = dataOffset + (0 | b2 | b3 | b4);
          handle = data.readUInt32();
          entry = {
            id: id,
            attributes: attr,
            offset: dataOfs,
            handle: handle
          };
          if (nameListOffset + nameOfs < mapOffset + mapLength) {
            p = data.pos;
            data.pos = nameOfs + nameListOffset;
            len = data.readByte();
            entry.name = data.readString(len);
            data.pos = p;
          }
          this.map[type].list.push(entry);
          if (entry.name) {
            this.map[type].named[entry.name] = entry;
          }
        }
        data.pos = pos;
      }
    };
    DFont.prototype.getNamedFont = function(name) {
      var data, entry, length, pos, ret;
      data = this.contents;
      pos = data.pos;
      entry = this.map.sfnt.named[name];
      if (!entry) {
        throw new Error("Font " + name + " not found in DFont file.");
      }
      data.pos = entry.offset;
      length = data.readUInt32();
      ret = data.slice(data.pos, data.pos + length);
      data.pos = pos;
      return ret;
    };
    return DFont;
  })();
  module.exports = DFont;
}).call(this);

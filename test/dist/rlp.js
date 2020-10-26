"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeHex = exports.RLPList = exports.decodeElements = exports.decode = exports.encode = exports.encodeString = exports.encodeElements = exports.numberToByteArray = exports.str2bin = exports.bin2str = exports.encodeHex = exports.byteArrayToInt = exports.toU8Arr = void 0;
var OFFSET_SHORT_ITEM = 0x80;
var SIZE_THRESHOLD = 56;
var OFFSET_LONG_ITEM = 0xb7;
var OFFSET_SHORT_LIST = 0xc0;
var OFFSET_LONG_LIST = 0xf7;
var EMPTY_BYTES = new Uint8Array(0);
var EMPTY_RLP_ARRAY = new Uint8Array([0xc0]);
var NULL_RLP = new Uint8Array([0x80]);
function assert(bool, msg) {
    if (!bool)
        throw new Error(msg);
}
function isBytes(s) {
    return s instanceof Uint8Array || s instanceof ArrayBuffer;
}
function toU8Arr(data) {
    assert(isBytes(data), data + " is not uint8array or arraybuffer");
    if (data instanceof ArrayBuffer)
        return new Uint8Array(data);
    return data;
}
exports.toU8Arr = toU8Arr;
function byteArrayToInt(bytes) {
    var arr = toU8Arr(bytes);
    var ret = 0;
    for (var i = 0; i < arr.length; i++) {
        var u = arr[arr.length - i - 1];
        ret += (u << (i * 8));
    }
    return ret;
}
exports.byteArrayToInt = byteArrayToInt;
function encodeHex(buf) {
    if (typeof Buffer === 'function')
        return Buffer.from(buf).toString('hex');
    var arr = toU8Arr(buf);
    var out = "";
    for (var i = 0; i < arr.length; i++) {
        var n = arr[i].toString(16);
        if (n.length === 1)
            n = '0' + n;
        out += n;
    }
    return out;
}
exports.encodeHex = encodeHex;
function bin2str(bin) {
    if (typeof TextDecoder === 'function')
        return new TextDecoder().decode(bin);
    if (typeof Buffer === 'function')
        return Buffer.from(bin).toString('utf8');
    throw new Error('convert binary to string failed');
}
exports.bin2str = bin2str;
function str2bin(str) {
    if (typeof TextEncoder === 'function')
        return new TextEncoder().encode(str);
    if (typeof Buffer === 'function')
        return Buffer.from(str, 'utf8');
    throw new Error('convert string to binary failed');
}
exports.str2bin = str2bin;
function padPrefix(arr, prefix, size) {
    if (arr.length >= size)
        return arr;
    var ret = new Uint8Array(size);
    for (var i = 0; i < ret.length; i++) {
        ret[i + size - arr.length] = arr[i];
    }
    if (prefix === 0)
        return ret;
    for (var i = 0; i < size - arr.length; i++)
        ret[i] = prefix;
    return ret;
}
function numberToByteArray(u) {
    if (u < 0 || !Number.isInteger(u))
        throw new Error("cannot convert number " + u + " to byte array");
    var buf = new Uint8Array(8);
    for (var i = 0; i < 8; i++) {
        buf[buf.length - 1 - i] = u & 0xff;
        u = u >>> 8;
    }
    var k = 8;
    for (var i = 0; i < 8; i++) {
        if (buf[i] !== 0) {
            k = i;
            break;
        }
    }
    return buf.slice(k, buf.length);
}
exports.numberToByteArray = numberToByteArray;
function reverse(arr) {
    var ret = new Uint8Array(arr.length);
    for (var i = 0; i < arr.length; i++) {
        ret[i] = arr[arr.length - i - 1];
    }
    return ret;
}
function inverse(arr) {
    var ret = new Uint8Array(arr.length);
    for (var i = 0; i < ret.length; i++) {
        ret[i] = (~arr[i] & 0xff);
    }
    return ret;
}
function isRLPList(encoded) {
    return encoded[0] >= OFFSET_SHORT_LIST;
}
function encodeBytes(b) {
    var bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
    if (bytes.length === 0) {
        var ret_1 = new Uint8Array(1);
        ret_1[0] = OFFSET_SHORT_ITEM;
        return ret_1;
    }
    if (bytes.length === 1 && (bytes[0] & 0xFF) < OFFSET_SHORT_ITEM) {
        return bytes;
    }
    if (bytes.length < SIZE_THRESHOLD) {
        var prefix = OFFSET_SHORT_ITEM + bytes.length;
        var ret_2 = new Uint8Array(bytes.length + 1);
        for (var i = 0; i < bytes.length; i++) {
            ret_2[i + 1] = bytes[i];
        }
        ret_2[0] = prefix;
        return ret_2;
    }
    var tmpLength = bytes.length;
    var lengthOfLength = 0;
    while (tmpLength !== 0) {
        lengthOfLength = lengthOfLength + 1;
        tmpLength = tmpLength >> 8;
    }
    var ret = new Uint8Array(1 + lengthOfLength + bytes.length);
    ret[0] = OFFSET_LONG_ITEM + lengthOfLength;
    tmpLength = bytes.length;
    for (var i = lengthOfLength; i > 0; --i) {
        ret[i] = (tmpLength & 0xFF);
        tmpLength = tmpLength >> 8;
    }
    for (var i = 0; i < bytes.length; i++) {
        ret[i + 1 + lengthOfLength] = bytes[i];
    }
    return ret;
}
function encodeElements(elements) {
    var totalLength = 0;
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        totalLength += el.length;
    }
    var data;
    var copyPos;
    if (totalLength < SIZE_THRESHOLD) {
        data = new Uint8Array(1 + totalLength);
        data[0] = OFFSET_SHORT_LIST + totalLength;
        copyPos = 1;
    }
    else {
        var tmpLength = totalLength;
        var byteNum = 0;
        while (tmpLength !== 0) {
            ++byteNum;
            tmpLength = tmpLength >> 8;
        }
        tmpLength = totalLength;
        var lenBytes = new Uint8Array(byteNum);
        for (var i = 0; i < byteNum; ++i) {
            lenBytes[byteNum - 1 - i] = ((tmpLength >> (8 * i)) & 0xFF);
        }
        data = new Uint8Array(1 + lenBytes.length + totalLength);
        data[0] = OFFSET_LONG_LIST + byteNum;
        for (var i = 0; i < lenBytes.length; i++) {
            data[i + 1] = lenBytes[i];
        }
        copyPos = lenBytes.length + 1;
    }
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        for (var j = 0; j < el.length; j++) {
            data[j + copyPos] = el[j];
        }
        copyPos += el.length;
    }
    return data;
}
exports.encodeElements = encodeElements;
function concatBytes(x, y) {
    var ret = new Uint8Array(x.length + y.length);
    for (var i = 0; i < x.length; i++) {
        ret[i] = x[i];
    }
    for (var i = 0; i < y.length; i++) {
        ret[x.length + i] = y[i];
    }
    return ret;
}
function copyOfRange(bytes, from, to) {
    var ret = new Uint8Array(to - from);
    var j = 0;
    for (var i = from; i < to; i++) {
        ret[j] = bytes[i];
        j++;
    }
    return ret;
}
function estimateSize(encoded) {
    var parser = new RLPParser(encoded, 0, encoded.length);
    return parser.peekSize();
}
function validateSize(encoded) {
    assert(encoded.length === estimateSize(encoded), 'invalid rlp format');
}
function encodeString(s) {
    return encodeBytes(str2bin(s));
}
exports.encodeString = encodeString;
function encode(o) {
    if (o && (typeof o.getEncoded === 'function')) {
        return o.getEncoded();
    }
    if (o === null || o === undefined)
        return NULL_RLP;
    if (o instanceof ArrayBuffer)
        o = new Uint8Array(o);
    if (typeof o === 'string')
        return encodeString(o);
    if (typeof o === 'number') {
        assert(o >= 0 && Number.isInteger(o), o + " is not a valid non-negative integer");
        return encodeBytes(numberToByteArray(o));
    }
    if (typeof o === 'boolean')
        return o ? new Uint8Array([0x01]) : NULL_RLP;
    if (o instanceof Uint8Array)
        return encodeBytes(o);
    if (Array.isArray(o)) {
        var elements = o.map(function (x) { return encode(x); });
        return encodeElements(elements);
    }
}
exports.encode = encode;
function decode(encoded) {
    validateSize(encoded);
    if (!isRLPList(encoded)) {
        var parser_1 = new RLPParser(encoded, 0, encoded.length);
        if (encoded.length === 1 && encoded[0] === 0x80)
            return EMPTY_BYTES;
        if (parser_1.remained() > 1) {
            parser_1.skip(parser_1.prefixLength());
        }
        return parser_1.bytes(parser_1.remained());
    }
    var parser = new RLPParser(encoded, 0, encoded.length);
    parser.skip(parser.prefixLength());
    var ret = [];
    while (parser.remained() > 0) {
        ret.push(decode(parser.bytes(parser.peekSize())));
    }
    return ret;
}
exports.decode = decode;
function decodeElements(enc) {
    var encoded = enc instanceof Uint8Array ? enc : new Uint8Array(enc);
    validateSize(encoded);
    if (!isRLPList(encoded)) {
        throw new Error('not a rlp list');
    }
    var parser = new RLPParser(encoded, 0, encoded.length);
    parser.skip(parser.prefixLength());
    var ret = [];
    while (parser.remained() > 0) {
        ret.push(parser.bytes(parser.peekSize()));
    }
    return ret;
}
exports.decodeElements = decodeElements;
var RLPParser = (function () {
    function RLPParser(buf, offset, limit) {
        this.buf = buf;
        this.offset = offset;
        this.limit = limit;
    }
    RLPParser.prototype.prefixLength = function () {
        var prefix = this.buf[this.offset];
        if (prefix <= OFFSET_LONG_ITEM) {
            return 1;
        }
        if (prefix < OFFSET_SHORT_LIST) {
            return 1 + (prefix - OFFSET_LONG_ITEM);
        }
        if (prefix <= OFFSET_LONG_LIST) {
            return 1;
        }
        return 1 + (prefix - OFFSET_LONG_LIST);
    };
    RLPParser.prototype.remained = function () {
        return this.limit - this.offset;
    };
    RLPParser.prototype.skip = function (n) {
        this.offset += n;
    };
    RLPParser.prototype.peekSize = function () {
        var prefix = this.buf[this.offset];
        if (prefix < OFFSET_SHORT_ITEM) {
            return 1;
        }
        if (prefix <= OFFSET_LONG_ITEM) {
            return prefix - OFFSET_SHORT_ITEM + 1;
        }
        if (prefix < OFFSET_SHORT_LIST) {
            return byteArrayToInt(copyOfRange(this.buf, 1 + this.offset, 1 + this.offset + prefix - OFFSET_LONG_ITEM)) + 1 + prefix - OFFSET_LONG_ITEM;
        }
        if (prefix <= OFFSET_LONG_LIST) {
            return prefix - OFFSET_SHORT_LIST + 1;
        }
        return byteArrayToInt(copyOfRange(this.buf, 1 + this.offset, this.offset + 1 + prefix - OFFSET_LONG_LIST))
            + 1 + prefix - OFFSET_LONG_LIST;
    };
    RLPParser.prototype.u8 = function () {
        var ret = this.buf[this.offset];
        this.offset++;
        return ret;
    };
    RLPParser.prototype.bytes = function (n) {
        assert(this.offset + n <= this.limit, 'read overflow');
        var ret = this.buf.slice(this.offset, this.offset + n);
        this.offset += n;
        return ret;
    };
    return RLPParser;
}());
var RLPList = (function () {
    function RLPList(elements) {
        this.elements = elements;
    }
    RLPList.fromEncoded = function (encoded) {
        var els = decodeElements(encoded);
        return new RLPList(els);
    };
    RLPList.prototype.list = function (index) {
        return RLPList.fromEncoded(this.raw(index));
    };
    RLPList.prototype.length = function () {
        return this.elements.length;
    };
    RLPList.prototype.raw = function (index) {
        return this.elements[index];
    };
    RLPList.prototype.isNull = function (index) {
        return this.elements[index].byteLength == 1 && this.elements[index][0] == 0x80;
    };
    RLPList.prototype.number = function (idx) {
        return byteArrayToInt(this.bytes(idx));
    };
    RLPList.prototype.bool = function (idx) {
        return this.number(idx) != 0;
    };
    RLPList.prototype.bytes = function (idx) {
        return decode(this.elements[idx]);
    };
    RLPList.EMPTY = new RLPList([]);
    return RLPList;
}());
exports.RLPList = RLPList;
function hexToInt(x) {
    if (48 <= x && x <= 57)
        return x - 48;
    if (97 <= x && x <= 102)
        return x - 87;
    if (65 <= x && x <= 70)
        return x - 55;
    return 0;
}
function decodeHex(s) {
    if (s.startsWith('0x'))
        s = s.substr(2, s.length - 2);
    assert(s.length % 2 === 0, 'invalid char');
    if (typeof Buffer === 'function')
        return Buffer.from(s, 'hex');
    var ret = new Uint8Array(s.length / 2);
    for (var i = 0; i < s.length / 2; i++) {
        var h = s.charCodeAt(i * 2);
        var l = s.charCodeAt(i * 2 + 1);
        ret[i] = (hexToInt(h) << 4) + hexToInt(l);
    }
}
exports.decodeHex = decodeHex;
//# sourceMappingURL=rlp.js.map
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // core/src/lib/js-md5.js
  var require_js_md5 = __commonJS({
    "core/src/lib/js-md5.js"(exports, module) {
      (function() {
        "use strict";
        var INPUT_ERROR = "input is invalid type";
        var FINALIZE_ERROR = "finalize already called";
        var WINDOW = typeof window === "object";
        var root = WINDOW ? window : {};
        if (root.JS_MD5_NO_WINDOW) {
          WINDOW = false;
        }
        var WEB_WORKER = !WINDOW && typeof self === "object";
        var NODE_JS = false;
        if (NODE_JS) {
          root = global;
        } else if (WEB_WORKER) {
          root = self;
        }
        var COMMON_JS = !root.JS_MD5_NO_COMMON_JS && typeof module === "object" && module.exports;
        var AMD = typeof define === "function" && define.amd;
        var ARRAY_BUFFER = !root.JS_MD5_NO_ARRAY_BUFFER && typeof ArrayBuffer !== "undefined";
        var HEX_CHARS = "0123456789abcdef".split("");
        var EXTRA = [128, 32768, 8388608, -2147483648];
        var SHIFT = [0, 8, 16, 24];
        var OUTPUT_TYPES = ["hex", "array", "digest", "buffer", "arrayBuffer", "base64"];
        var BASE64_ENCODE_CHAR = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
        var blocks = [], buffer8;
        if (ARRAY_BUFFER) {
          var buffer = new ArrayBuffer(68);
          buffer8 = new Uint8Array(buffer);
          blocks = new Uint32Array(buffer);
        }
        var isArray = Array.isArray;
        if (root.JS_MD5_NO_NODE_JS || !isArray) {
          isArray = function(obj) {
            return Object.prototype.toString.call(obj) === "[object Array]";
          };
        }
        var isView = ArrayBuffer.isView;
        if (ARRAY_BUFFER && (root.JS_MD5_NO_ARRAY_BUFFER_IS_VIEW || !isView)) {
          isView = function(obj) {
            return typeof obj === "object" && obj.buffer && obj.buffer.constructor === ArrayBuffer;
          };
        }
        var formatMessage = function(message) {
          var type = typeof message;
          if (type === "string") {
            return [message, true];
          }
          if (type !== "object" || message === null) {
            throw new Error(INPUT_ERROR);
          }
          if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
            return [new Uint8Array(message), false];
          }
          if (!isArray(message) && !isView(message)) {
            throw new Error(INPUT_ERROR);
          }
          return [message, false];
        };
        var createOutputMethod = function(outputType) {
          return function(message) {
            return new Md5(true).update(message)[outputType]();
          };
        };
        var createMethod = function() {
          var method = createOutputMethod("hex");
          if (NODE_JS) {
            method = nodeWrap(method);
          }
          method.create = function() {
            return new Md5();
          };
          method.update = function(message) {
            return method.create().update(message);
          };
          for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
            var type = OUTPUT_TYPES[i];
            method[type] = createOutputMethod(type);
          }
          return method;
        };
        var createHmacOutputMethod = function(outputType) {
          return function(key, message) {
            return new HmacMd5(key, true).update(message)[outputType]();
          };
        };
        var createHmacMethod = function() {
          var method = createHmacOutputMethod("hex");
          method.create = function(key) {
            return new HmacMd5(key);
          };
          method.update = function(key, message) {
            return method.create(key).update(message);
          };
          for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
            var type = OUTPUT_TYPES[i];
            method[type] = createHmacOutputMethod(type);
          }
          return method;
        };
        function Md5(sharedMemory) {
          if (sharedMemory) {
            blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            this.blocks = blocks;
            this.buffer8 = buffer8;
          } else {
            if (ARRAY_BUFFER) {
              var buffer2 = new ArrayBuffer(68);
              this.buffer8 = new Uint8Array(buffer2);
              this.blocks = new Uint32Array(buffer2);
            } else {
              this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }
          }
          this.h0 = this.h1 = this.h2 = this.h3 = this.start = this.bytes = this.hBytes = 0;
          this.finalized = this.hashed = false;
          this.first = true;
        }
        Md5.prototype.update = function(message) {
          if (this.finalized) {
            throw new Error(FINALIZE_ERROR);
          }
          var result = formatMessage(message);
          message = result[0];
          var isString2 = result[1];
          var code, index = 0, i, length = message.length, blocks2 = this.blocks;
          var buffer82 = this.buffer8;
          while (index < length) {
            if (this.hashed) {
              this.hashed = false;
              blocks2[0] = blocks2[16];
              blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
            }
            if (isString2) {
              if (ARRAY_BUFFER) {
                for (i = this.start; index < length && i < 64; ++index) {
                  code = message.charCodeAt(index);
                  if (code < 128) {
                    buffer82[i++] = code;
                  } else if (code < 2048) {
                    buffer82[i++] = 192 | code >>> 6;
                    buffer82[i++] = 128 | code & 63;
                  } else if (code < 55296 || code >= 57344) {
                    buffer82[i++] = 224 | code >>> 12;
                    buffer82[i++] = 128 | code >>> 6 & 63;
                    buffer82[i++] = 128 | code & 63;
                  } else {
                    code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
                    buffer82[i++] = 240 | code >>> 18;
                    buffer82[i++] = 128 | code >>> 12 & 63;
                    buffer82[i++] = 128 | code >>> 6 & 63;
                    buffer82[i++] = 128 | code & 63;
                  }
                }
              } else {
                for (i = this.start; index < length && i < 64; ++index) {
                  code = message.charCodeAt(index);
                  if (code < 128) {
                    blocks2[i >>> 2] |= code << SHIFT[i++ & 3];
                  } else if (code < 2048) {
                    blocks2[i >>> 2] |= (192 | code >>> 6) << SHIFT[i++ & 3];
                    blocks2[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
                  } else if (code < 55296 || code >= 57344) {
                    blocks2[i >>> 2] |= (224 | code >>> 12) << SHIFT[i++ & 3];
                    blocks2[i >>> 2] |= (128 | code >>> 6 & 63) << SHIFT[i++ & 3];
                    blocks2[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
                  } else {
                    code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
                    blocks2[i >>> 2] |= (240 | code >>> 18) << SHIFT[i++ & 3];
                    blocks2[i >>> 2] |= (128 | code >>> 12 & 63) << SHIFT[i++ & 3];
                    blocks2[i >>> 2] |= (128 | code >>> 6 & 63) << SHIFT[i++ & 3];
                    blocks2[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
                  }
                }
              }
            } else {
              if (ARRAY_BUFFER) {
                for (i = this.start; index < length && i < 64; ++index) {
                  buffer82[i++] = message[index];
                }
              } else {
                for (i = this.start; index < length && i < 64; ++index) {
                  blocks2[i >>> 2] |= message[index] << SHIFT[i++ & 3];
                }
              }
            }
            this.lastByteIndex = i;
            this.bytes += i - this.start;
            if (i >= 64) {
              this.start = i - 64;
              this.hash();
              this.hashed = true;
            } else {
              this.start = i;
            }
          }
          if (this.bytes > 4294967295) {
            this.hBytes += this.bytes / 4294967296 << 0;
            this.bytes = this.bytes % 4294967296;
          }
          return this;
        };
        Md5.prototype.finalize = function() {
          if (this.finalized) {
            return;
          }
          this.finalized = true;
          var blocks2 = this.blocks, i = this.lastByteIndex;
          blocks2[i >>> 2] |= EXTRA[i & 3];
          if (i >= 56) {
            if (!this.hashed) {
              this.hash();
            }
            blocks2[0] = blocks2[16];
            blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
          }
          blocks2[14] = this.bytes << 3;
          blocks2[15] = this.hBytes << 3 | this.bytes >>> 29;
          this.hash();
        };
        Md5.prototype.hash = function() {
          var a, b, c, d, bc, da, blocks2 = this.blocks;
          if (this.first) {
            a = blocks2[0] - 680876937;
            a = (a << 7 | a >>> 25) - 271733879 << 0;
            d = (-1732584194 ^ a & 2004318071) + blocks2[1] - 117830708;
            d = (d << 12 | d >>> 20) + a << 0;
            c = (-271733879 ^ d & (a ^ -271733879)) + blocks2[2] - 1126478375;
            c = (c << 17 | c >>> 15) + d << 0;
            b = (a ^ c & (d ^ a)) + blocks2[3] - 1316259209;
            b = (b << 22 | b >>> 10) + c << 0;
          } else {
            a = this.h0;
            b = this.h1;
            c = this.h2;
            d = this.h3;
            a += (d ^ b & (c ^ d)) + blocks2[0] - 680876936;
            a = (a << 7 | a >>> 25) + b << 0;
            d += (c ^ a & (b ^ c)) + blocks2[1] - 389564586;
            d = (d << 12 | d >>> 20) + a << 0;
            c += (b ^ d & (a ^ b)) + blocks2[2] + 606105819;
            c = (c << 17 | c >>> 15) + d << 0;
            b += (a ^ c & (d ^ a)) + blocks2[3] - 1044525330;
            b = (b << 22 | b >>> 10) + c << 0;
          }
          a += (d ^ b & (c ^ d)) + blocks2[4] - 176418897;
          a = (a << 7 | a >>> 25) + b << 0;
          d += (c ^ a & (b ^ c)) + blocks2[5] + 1200080426;
          d = (d << 12 | d >>> 20) + a << 0;
          c += (b ^ d & (a ^ b)) + blocks2[6] - 1473231341;
          c = (c << 17 | c >>> 15) + d << 0;
          b += (a ^ c & (d ^ a)) + blocks2[7] - 45705983;
          b = (b << 22 | b >>> 10) + c << 0;
          a += (d ^ b & (c ^ d)) + blocks2[8] + 1770035416;
          a = (a << 7 | a >>> 25) + b << 0;
          d += (c ^ a & (b ^ c)) + blocks2[9] - 1958414417;
          d = (d << 12 | d >>> 20) + a << 0;
          c += (b ^ d & (a ^ b)) + blocks2[10] - 42063;
          c = (c << 17 | c >>> 15) + d << 0;
          b += (a ^ c & (d ^ a)) + blocks2[11] - 1990404162;
          b = (b << 22 | b >>> 10) + c << 0;
          a += (d ^ b & (c ^ d)) + blocks2[12] + 1804603682;
          a = (a << 7 | a >>> 25) + b << 0;
          d += (c ^ a & (b ^ c)) + blocks2[13] - 40341101;
          d = (d << 12 | d >>> 20) + a << 0;
          c += (b ^ d & (a ^ b)) + blocks2[14] - 1502002290;
          c = (c << 17 | c >>> 15) + d << 0;
          b += (a ^ c & (d ^ a)) + blocks2[15] + 1236535329;
          b = (b << 22 | b >>> 10) + c << 0;
          a += (c ^ d & (b ^ c)) + blocks2[1] - 165796510;
          a = (a << 5 | a >>> 27) + b << 0;
          d += (b ^ c & (a ^ b)) + blocks2[6] - 1069501632;
          d = (d << 9 | d >>> 23) + a << 0;
          c += (a ^ b & (d ^ a)) + blocks2[11] + 643717713;
          c = (c << 14 | c >>> 18) + d << 0;
          b += (d ^ a & (c ^ d)) + blocks2[0] - 373897302;
          b = (b << 20 | b >>> 12) + c << 0;
          a += (c ^ d & (b ^ c)) + blocks2[5] - 701558691;
          a = (a << 5 | a >>> 27) + b << 0;
          d += (b ^ c & (a ^ b)) + blocks2[10] + 38016083;
          d = (d << 9 | d >>> 23) + a << 0;
          c += (a ^ b & (d ^ a)) + blocks2[15] - 660478335;
          c = (c << 14 | c >>> 18) + d << 0;
          b += (d ^ a & (c ^ d)) + blocks2[4] - 405537848;
          b = (b << 20 | b >>> 12) + c << 0;
          a += (c ^ d & (b ^ c)) + blocks2[9] + 568446438;
          a = (a << 5 | a >>> 27) + b << 0;
          d += (b ^ c & (a ^ b)) + blocks2[14] - 1019803690;
          d = (d << 9 | d >>> 23) + a << 0;
          c += (a ^ b & (d ^ a)) + blocks2[3] - 187363961;
          c = (c << 14 | c >>> 18) + d << 0;
          b += (d ^ a & (c ^ d)) + blocks2[8] + 1163531501;
          b = (b << 20 | b >>> 12) + c << 0;
          a += (c ^ d & (b ^ c)) + blocks2[13] - 1444681467;
          a = (a << 5 | a >>> 27) + b << 0;
          d += (b ^ c & (a ^ b)) + blocks2[2] - 51403784;
          d = (d << 9 | d >>> 23) + a << 0;
          c += (a ^ b & (d ^ a)) + blocks2[7] + 1735328473;
          c = (c << 14 | c >>> 18) + d << 0;
          b += (d ^ a & (c ^ d)) + blocks2[12] - 1926607734;
          b = (b << 20 | b >>> 12) + c << 0;
          bc = b ^ c;
          a += (bc ^ d) + blocks2[5] - 378558;
          a = (a << 4 | a >>> 28) + b << 0;
          d += (bc ^ a) + blocks2[8] - 2022574463;
          d = (d << 11 | d >>> 21) + a << 0;
          da = d ^ a;
          c += (da ^ b) + blocks2[11] + 1839030562;
          c = (c << 16 | c >>> 16) + d << 0;
          b += (da ^ c) + blocks2[14] - 35309556;
          b = (b << 23 | b >>> 9) + c << 0;
          bc = b ^ c;
          a += (bc ^ d) + blocks2[1] - 1530992060;
          a = (a << 4 | a >>> 28) + b << 0;
          d += (bc ^ a) + blocks2[4] + 1272893353;
          d = (d << 11 | d >>> 21) + a << 0;
          da = d ^ a;
          c += (da ^ b) + blocks2[7] - 155497632;
          c = (c << 16 | c >>> 16) + d << 0;
          b += (da ^ c) + blocks2[10] - 1094730640;
          b = (b << 23 | b >>> 9) + c << 0;
          bc = b ^ c;
          a += (bc ^ d) + blocks2[13] + 681279174;
          a = (a << 4 | a >>> 28) + b << 0;
          d += (bc ^ a) + blocks2[0] - 358537222;
          d = (d << 11 | d >>> 21) + a << 0;
          da = d ^ a;
          c += (da ^ b) + blocks2[3] - 722521979;
          c = (c << 16 | c >>> 16) + d << 0;
          b += (da ^ c) + blocks2[6] + 76029189;
          b = (b << 23 | b >>> 9) + c << 0;
          bc = b ^ c;
          a += (bc ^ d) + blocks2[9] - 640364487;
          a = (a << 4 | a >>> 28) + b << 0;
          d += (bc ^ a) + blocks2[12] - 421815835;
          d = (d << 11 | d >>> 21) + a << 0;
          da = d ^ a;
          c += (da ^ b) + blocks2[15] + 530742520;
          c = (c << 16 | c >>> 16) + d << 0;
          b += (da ^ c) + blocks2[2] - 995338651;
          b = (b << 23 | b >>> 9) + c << 0;
          a += (c ^ (b | ~d)) + blocks2[0] - 198630844;
          a = (a << 6 | a >>> 26) + b << 0;
          d += (b ^ (a | ~c)) + blocks2[7] + 1126891415;
          d = (d << 10 | d >>> 22) + a << 0;
          c += (a ^ (d | ~b)) + blocks2[14] - 1416354905;
          c = (c << 15 | c >>> 17) + d << 0;
          b += (d ^ (c | ~a)) + blocks2[5] - 57434055;
          b = (b << 21 | b >>> 11) + c << 0;
          a += (c ^ (b | ~d)) + blocks2[12] + 1700485571;
          a = (a << 6 | a >>> 26) + b << 0;
          d += (b ^ (a | ~c)) + blocks2[3] - 1894986606;
          d = (d << 10 | d >>> 22) + a << 0;
          c += (a ^ (d | ~b)) + blocks2[10] - 1051523;
          c = (c << 15 | c >>> 17) + d << 0;
          b += (d ^ (c | ~a)) + blocks2[1] - 2054922799;
          b = (b << 21 | b >>> 11) + c << 0;
          a += (c ^ (b | ~d)) + blocks2[8] + 1873313359;
          a = (a << 6 | a >>> 26) + b << 0;
          d += (b ^ (a | ~c)) + blocks2[15] - 30611744;
          d = (d << 10 | d >>> 22) + a << 0;
          c += (a ^ (d | ~b)) + blocks2[6] - 1560198380;
          c = (c << 15 | c >>> 17) + d << 0;
          b += (d ^ (c | ~a)) + blocks2[13] + 1309151649;
          b = (b << 21 | b >>> 11) + c << 0;
          a += (c ^ (b | ~d)) + blocks2[4] - 145523070;
          a = (a << 6 | a >>> 26) + b << 0;
          d += (b ^ (a | ~c)) + blocks2[11] - 1120210379;
          d = (d << 10 | d >>> 22) + a << 0;
          c += (a ^ (d | ~b)) + blocks2[2] + 718787259;
          c = (c << 15 | c >>> 17) + d << 0;
          b += (d ^ (c | ~a)) + blocks2[9] - 343485551;
          b = (b << 21 | b >>> 11) + c << 0;
          if (this.first) {
            this.h0 = a + 1732584193 << 0;
            this.h1 = b - 271733879 << 0;
            this.h2 = c - 1732584194 << 0;
            this.h3 = d + 271733878 << 0;
            this.first = false;
          } else {
            this.h0 = this.h0 + a << 0;
            this.h1 = this.h1 + b << 0;
            this.h2 = this.h2 + c << 0;
            this.h3 = this.h3 + d << 0;
          }
        };
        Md5.prototype.hex = function() {
          this.finalize();
          var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3;
          return HEX_CHARS[h0 >>> 4 & 15] + HEX_CHARS[h0 & 15] + HEX_CHARS[h0 >>> 12 & 15] + HEX_CHARS[h0 >>> 8 & 15] + HEX_CHARS[h0 >>> 20 & 15] + HEX_CHARS[h0 >>> 16 & 15] + HEX_CHARS[h0 >>> 28 & 15] + HEX_CHARS[h0 >>> 24 & 15] + HEX_CHARS[h1 >>> 4 & 15] + HEX_CHARS[h1 & 15] + HEX_CHARS[h1 >>> 12 & 15] + HEX_CHARS[h1 >>> 8 & 15] + HEX_CHARS[h1 >>> 20 & 15] + HEX_CHARS[h1 >>> 16 & 15] + HEX_CHARS[h1 >>> 28 & 15] + HEX_CHARS[h1 >>> 24 & 15] + HEX_CHARS[h2 >>> 4 & 15] + HEX_CHARS[h2 & 15] + HEX_CHARS[h2 >>> 12 & 15] + HEX_CHARS[h2 >>> 8 & 15] + HEX_CHARS[h2 >>> 20 & 15] + HEX_CHARS[h2 >>> 16 & 15] + HEX_CHARS[h2 >>> 28 & 15] + HEX_CHARS[h2 >>> 24 & 15] + HEX_CHARS[h3 >>> 4 & 15] + HEX_CHARS[h3 & 15] + HEX_CHARS[h3 >>> 12 & 15] + HEX_CHARS[h3 >>> 8 & 15] + HEX_CHARS[h3 >>> 20 & 15] + HEX_CHARS[h3 >>> 16 & 15] + HEX_CHARS[h3 >>> 28 & 15] + HEX_CHARS[h3 >>> 24 & 15];
        };
        Md5.prototype.toString = Md5.prototype.hex;
        Md5.prototype.digest = function() {
          this.finalize();
          var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3;
          return [
            h0 & 255,
            h0 >>> 8 & 255,
            h0 >>> 16 & 255,
            h0 >>> 24 & 255,
            h1 & 255,
            h1 >>> 8 & 255,
            h1 >>> 16 & 255,
            h1 >>> 24 & 255,
            h2 & 255,
            h2 >>> 8 & 255,
            h2 >>> 16 & 255,
            h2 >>> 24 & 255,
            h3 & 255,
            h3 >>> 8 & 255,
            h3 >>> 16 & 255,
            h3 >>> 24 & 255
          ];
        };
        Md5.prototype.array = Md5.prototype.digest;
        Md5.prototype.arrayBuffer = function() {
          this.finalize();
          var buffer2 = new ArrayBuffer(16);
          var blocks2 = new Uint32Array(buffer2);
          blocks2[0] = this.h0;
          blocks2[1] = this.h1;
          blocks2[2] = this.h2;
          blocks2[3] = this.h3;
          return buffer2;
        };
        Md5.prototype.buffer = Md5.prototype.arrayBuffer;
        Md5.prototype.base64 = function() {
          var v1, v2, v3, base64Str = "", bytes = this.array();
          for (var i = 0; i < 15; ) {
            v1 = bytes[i++];
            v2 = bytes[i++];
            v3 = bytes[i++];
            base64Str += BASE64_ENCODE_CHAR[v1 >>> 2] + BASE64_ENCODE_CHAR[(v1 << 4 | v2 >>> 4) & 63] + BASE64_ENCODE_CHAR[(v2 << 2 | v3 >>> 6) & 63] + BASE64_ENCODE_CHAR[v3 & 63];
          }
          v1 = bytes[i];
          base64Str += BASE64_ENCODE_CHAR[v1 >>> 2] + BASE64_ENCODE_CHAR[v1 << 4 & 63] + "==";
          return base64Str;
        };
        function HmacMd5(key, sharedMemory) {
          var i, result = formatMessage(key);
          key = result[0];
          if (result[1]) {
            var bytes = [], length = key.length, index = 0, code;
            for (i = 0; i < length; ++i) {
              code = key.charCodeAt(i);
              if (code < 128) {
                bytes[index++] = code;
              } else if (code < 2048) {
                bytes[index++] = 192 | code >>> 6;
                bytes[index++] = 128 | code & 63;
              } else if (code < 55296 || code >= 57344) {
                bytes[index++] = 224 | code >>> 12;
                bytes[index++] = 128 | code >>> 6 & 63;
                bytes[index++] = 128 | code & 63;
              } else {
                code = 65536 + ((code & 1023) << 10 | key.charCodeAt(++i) & 1023);
                bytes[index++] = 240 | code >>> 18;
                bytes[index++] = 128 | code >>> 12 & 63;
                bytes[index++] = 128 | code >>> 6 & 63;
                bytes[index++] = 128 | code & 63;
              }
            }
            key = bytes;
          }
          if (key.length > 64) {
            key = new Md5(true).update(key).array();
          }
          var oKeyPad = [], iKeyPad = [];
          for (i = 0; i < 64; ++i) {
            var b = key[i] || 0;
            oKeyPad[i] = 92 ^ b;
            iKeyPad[i] = 54 ^ b;
          }
          Md5.call(this, sharedMemory);
          this.update(iKeyPad);
          this.oKeyPad = oKeyPad;
          this.inner = true;
          this.sharedMemory = sharedMemory;
        }
        HmacMd5.prototype = new Md5();
        HmacMd5.prototype.finalize = function() {
          Md5.prototype.finalize.call(this);
          if (this.inner) {
            this.inner = false;
            var innerHash = this.array();
            Md5.call(this, this.sharedMemory);
            this.update(this.oKeyPad);
            this.update(innerHash);
            Md5.prototype.finalize.call(this);
          }
        };
        var exports2 = createMethod();
        exports2.md5 = exports2;
        exports2.md5.hmac = createHmacMethod();
        if (COMMON_JS) {
          module.exports = exports2;
        } else {
          root.md5 = exports2;
          if (AMD) {
            define(function() {
              return exports2;
            });
          }
        }
      })();
    }
  });

  // core/src/Events.ts
  var EventHandle = class {
    constructor(event, callback, owner, priorityName = 2 /* NORMAL */) {
      this.event = event;
      this.callback = callback;
      this.owner = owner;
      this.priorityName = priorityName;
    }
    keyName;
    key(name) {
      this.keyName = name;
      return this;
    }
    getKey() {
      return this.keyName;
    }
    priority(priority) {
      this.priorityName = priority;
      return this;
    }
    getPriority() {
      return this.priorityName;
    }
    remove() {
      this.owner["_removeHandle"](this);
    }
  };
  var Events = class {
    customListeners = {};
    on(evt, callback, priority = 2 /* NORMAL */) {
      const handle = new EventHandle(evt, callback, this, priority);
      let arr = this.customListeners[evt];
      if (!arr) {
        arr = [];
        this.customListeners[evt] = arr;
      }
      let i = arr.findIndex((h) => h.getPriority() > priority);
      if (i === -1) {
        arr.push(handle);
      } else {
        arr.splice(i, 0, handle);
      }
      return handle;
    }
    once(evt, callback, priority = 2 /* NORMAL */) {
      const wrapper = ((...args) => {
        callback(...args);
        this.off(evt, wrapper);
      });
      return this.on(evt, wrapper, priority);
    }
    off(evt, callback) {
      const arr = this.customListeners[evt];
      if (!arr) return false;
      const before = arr.length;
      this.customListeners[evt] = arr.filter((h) => h.callback !== callback);
      return arr.length < before;
    }
    async call(evt, event = void 0) {
      const arr = this.customListeners[evt];
      if (!arr) return event;
      for (const h of arr) {
        const r = h.callback(event);
        if (r instanceof Promise) await r;
      }
      return event;
    }
    emit(evt, ...args) {
      const arr = this.customListeners[evt];
      if (!arr) return false;
      for (const h of arr) {
        h.callback(...args);
      }
      return arr.length > 0;
    }
    async emitR(evt, ...args) {
      const arr = this.customListeners[evt];
      if (!arr) return [];
      const results = [];
      for (const h of arr) {
        const r = h.callback(...args);
        results.push(r instanceof Promise ? await r : r);
      }
      return results;
    }
    async wait(type, timeout = 1e7) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.off(type, func);
        }, timeout);
        const func = (...args) => {
          clearTimeout(timer);
          this.off("message", func);
          resolve(args);
        };
        this.on(type, func);
      });
    }
    removeByKey(key) {
      let removed = false;
      for (const evt in this.customListeners) {
        const arr = this.customListeners[evt];
        if (!arr) continue;
        const before = arr.length;
        this.customListeners[evt] = arr.filter((h) => h.getKey() !== key);
        if (this.customListeners[evt].length < before) removed = true;
      }
      return removed;
    }
    _removeHandle(handle) {
      const arr = this.customListeners[handle.event];
      if (!arr) return;
      this.customListeners[handle.event] = arr.filter((h) => h !== handle);
    }
    removeAllEvents() {
      this.customListeners = {};
    }
  };

  // core/src/utils/utils.ts
  var global2 = window;
  function isMacOS() {
    return /Macintosh/i.test(navigator.userAgent);
  }
  function getZoom() {
    const style = global2.getComputedStyle(document.body);
    const transform = style.transform;
    const zoom = global2.parseFloat(style.zoom || "1");
    if (transform && transform != "none") {
      const match = transform.match(/matrix\(([\d.]+),/);
      if (match) return global2.parseFloat(match[1]);
    }
    return global2.isNaN(zoom) ? 1 : zoom;
  }
  function wait(timeout = 0) {
    return new Promise((res) => setTimeout(res, timeout));
  }
  function gKey(obj) {
    let sttxt = "";
    for (let i in obj) {
      let key = i.replace(/[A-Z]{1}/g, (m) => "-" + m.toLowerCase());
      if (key == "this") key = "&";
      if (typeof obj[i] == "object") {
        if (global2.Array.isArray(obj[i])) {
          for (let j of obj[i]) sttxt += `${key}:${j};`;
        } else sttxt += `${key}{${gKey(obj[i])}}`;
      } else sttxt += `${key}:${obj[i]};`;
    }
    return sttxt;
  }
  function getCSS(cssObject) {
    let sttxt = "";
    for (let sel in cssObject) {
      let obj = cssObject[sel];
      sttxt += sel + "{" + gKey(obj) + "}";
    }
    return sttxt;
  }
  function noXSS(input) {
    const div = document.createElement("div");
    div.textContent = input;
    return div.innerHTML;
  }

  // game/src/screen/Screen.ts
  var Screen = class extends Events {
    constructor(name = "Screen") {
      super();
      this.name = name;
      this.element = document.createElement("div");
      this.element.tabIndex = 1;
      this.element.style.width = "100%";
      this.element.style.height = "100%";
      wait(50).then(() => {
        App_default.on("resize", (e) => this.emit("resize", e)).key(`screen_${name}`);
        App_default.on("keydown", (e) => this.emit("keydown", e)).key(`screen_${name}`);
        App_default.on("keyup", (e) => this.emit("keyup", e)).key(`screen_${name}`);
        App_default.on("click", (e) => this.emit("click", e)).key(`screen_${name}`);
        App_default.server.on("message", (data) => this.emit("message", data)).key(`screen_${name}`);
        this.element.focus();
      });
      this.on("preBack", () => {
        if (App_default.boxs.length > 0)
          App_default.boxs[0].close();
        else
          this.emit("back");
      });
      this.on("keydown", (e) => {
        if (e.key == "Escape") {
          this.emit("preBack");
        }
      });
    }
    element;
    intervals = /* @__PURE__ */ new Map();
    timeouts = /* @__PURE__ */ new Map();
    reconnect() {
    }
    setInterval(name, handler, timeout) {
      this.intervals.set(name, setInterval(handler, timeout));
    }
    removeInterval(name) {
      return this.intervals.delete(name);
    }
    setTimeout(name, handler, timeout) {
      this.timeouts.set(name, setTimeout(handler, timeout));
    }
    removeTimeout(name) {
      return this.timeouts.delete(name);
    }
    tick(dt) {
      this.emit("tick", dt);
    }
    destroy() {
      this.removeAllEvents();
      this.intervals.forEach((e) => clearInterval(e));
      this.timeouts.forEach((e) => clearTimeout(e));
      App_default.removeByKey(`screen_${this.name}`);
      App_default.server.removeByKey(`screen_${this.name}`);
      App_default.element.removeChild(this.element);
      this.element.remove();
    }
  };

  // core/src/utils/TypeScript.ts
  var WhenBuilder = class {
    constructor(value) {
      this.value = value;
    }
    matched = false;
    case(condition, callback) {
      if (!this.matched && this.value === condition) {
        callback();
        this.matched = true;
      }
      return this;
    }
    else(defaultResult) {
      return typeof defaultResult === "function" ? defaultResult() : defaultResult;
    }
  };
  function when(value) {
    return new WhenBuilder(value);
  }
  function wrap(obj, prop, onSet, onGet) {
    let val = obj[prop];
    Object.defineProperty(obj, prop, {
      get: () => onGet ? onGet() : val,
      set: (v) => {
        onSet?.(v);
        val = v;
      },
      enumerable: true
    });
  }

  // core/src/fs/indexeddb.ts
  var IndexedDB = class {
    constructor(dbName = "Macintosh HD") {
      this.dbName = dbName;
    }
    db;
    objectStore = "Storage";
    logDebug = false;
    log(...args) {
      if (this.logDebug) {
        console.log(...args);
      }
    }
    init() {
      return new Promise((res, rej) => {
        const request = indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore(this.objectStore);
        };
        request.onsuccess = () => {
          this.db = request.result;
          res();
        };
        request.onerror = () => rej(request.error);
      });
    }
    transaction() {
      return this.db.transaction([this.objectStore], "readwrite").objectStore(this.objectStore);
    }
    getPath(path) {
      path = String(path);
      if (!path.startsWith("/")) path = "/" + path;
      return path;
    }
    async createFile(path) {
      path = this.getPath(path);
      await this.writeFile(path, "");
    }
    async writeFile(path, data) {
      path = this.getPath(path);
      return new Promise((res, rej) => {
        const content = data instanceof Blob ? data : new Blob([data instanceof Uint8Array ? data : String(data)]);
        const readStore = this.db.transaction([this.objectStore], "readonly").objectStore(this.objectStore);
        const getReq = readStore.get(path);
        getReq.onsuccess = () => {
          const existing = getReq.result;
          const createdAt = existing && existing.type === "file" && existing.createdAt ? existing.createdAt : Date.now();
          const entry = { type: "file", content, createdAt, modifiedAt: Date.now() };
          const computeHashThenPut = async () => {
            try {
              if (typeof crypto !== "undefined" && crypto.subtle) {
                const buf = await content.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest("SHA-1", buf);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                entry.sha1 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
              } else {
                entry.sha1 = Math.random().toString();
              }
              const writeStore = this.db.transaction([this.objectStore], "readwrite").objectStore(this.objectStore);
              const putReq = writeStore.put(entry, path);
              putReq.onsuccess = () => {
                this.log(`Writed file [${path}] = ${data instanceof Uint8Array ? `${data.length} length of uint8array` : data instanceof Blob ? `${data.size} length of blob` : typeof data == "object" ? "" : `${data.length} length of string`}`);
                res();
              };
              putReq.onerror = () => {
                this.log(`Can't write file [${path}]`);
                rej(putReq.error);
              };
            } catch (e) {
              rej(e);
            }
          };
          computeHashThenPut();
        };
        getReq.onerror = () => rej(getReq.error);
      });
    }
    async readFile(path) {
      path = this.getPath(path);
      const bytes = await this.readFileBytes(path);
      return new TextDecoder().decode(bytes);
    }
    async readFileBytes(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res, rej) => {
        const request = store.get(path);
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.type == "file") {
            if (result.content instanceof Blob) {
              result.content.arrayBuffer().then((buf) => res(new Uint8Array(buf)));
            } else {
              rej(new Error("Unsupported file content type"));
            }
          } else {
            rej("File not found or not a file " + path);
          }
        };
        request.onerror = () => rej(request.error);
      });
    }
    async readFileB64(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res, rej) => {
        const request = store.get(path);
        request.onsuccess = () => {
          const result = request.result;
          if (result?.type === "file") {
            result.content.arrayBuffer().then((buf) => {
              const bytes = new Uint8Array(buf);
              let binary = "";
              bytes.forEach((byte) => binary += String.fromCharCode(byte));
              res(`data:${result.content.type || "application/octet-stream"};base64,${btoa(binary)}`);
            });
          } else {
            rej("File not found or not a file");
          }
        };
        request.onerror = () => rej(request.error);
      });
    }
    async createDir(path) {
      path = this.getPath(path);
      if (await this.existsDir(path)) return;
      const store = this.transaction();
      return new Promise((res, rej) => {
        const entry = { type: "dir" };
        const request = store.put(entry, path);
        request.onsuccess = () => {
          this.log(`Created directory ${path}`);
          res();
        };
        request.onerror = () => {
          this.log(`Can't create directory`);
          rej(request.error);
        };
      });
    }
    async existsDir(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res) => {
        const request = store.get(path);
        request.onsuccess = () => res(request.result !== void 0 && request.result.type == "dir");
        request.onerror = () => res(false);
      });
    }
    async existsFile(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res) => {
        const request = store.get(path);
        request.onsuccess = () => res(request.result !== void 0 && request.result.type == "file");
        request.onerror = () => res(false);
      });
    }
    async exists(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res) => {
        const request = store.get(path);
        request.onsuccess = () => res(request.result !== void 0);
        request.onerror = () => res(false);
      });
    }
    async isFile(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res) => {
        const request = store.get(path);
        request.onsuccess = () => res(request.result?.type === "file");
        request.onerror = () => res(false);
      });
    }
    async isDirectory(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res) => {
        const request = store.get(path);
        request.onsuccess = () => res(request.result?.type === "dir");
        request.onerror = () => res(false);
      });
    }
    async deleteFile(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res) => {
        const req = store.delete(path);
        req.onsuccess = () => {
          this.log(`Deleted file ${path}`);
          res(true);
        };
        req.onerror = () => {
          this.log(`Can't delete file ${path}`);
          res(false);
        };
      });
    }
    async deleteDirectory(path, recursive = false) {
      path = this.getPath(path);
      const store = this.transaction();
      const dirPath = path.endsWith("/") ? path : path + "/";
      const keysToDelete = [];
      return new Promise((res) => {
        const request = store.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            const tx = this.transaction();
            tx.delete(path);
            if (recursive) {
              for (const key2 of keysToDelete) {
                tx.delete(key2);
              }
            }
            this.log(`Deleted directory ${path} - ${recursive}`);
            res(true);
            return;
          }
          const key = cursor.key;
          if (recursive && key.startsWith(dirPath)) {
            keysToDelete.push(key);
          }
          cursor.continue();
        };
        request.onerror = () => {
          this.log(`Can't delete directory ${path} - ${recursive}`);
          res(false);
        };
      });
    }
    async listDir(path) {
      path = this.getPath(path);
      const store = this.db.transaction([this.objectStore], "readonly").objectStore(this.objectStore);
      const entries = /* @__PURE__ */ new Set();
      const prefix = path.endsWith("/") ? path : path + "/";
      return new Promise((res, rej) => {
        const request = store.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return res([...entries]);
          const key = cursor.key;
          if (key.startsWith(prefix)) {
            const relative = key.slice(prefix.length).split("/")[0];
            entries.add(relative);
          }
          cursor.continue();
        };
        request.onerror = () => rej(request.error);
      });
    }
    async rename(oldPath, newPath) {
      oldPath = this.getPath(oldPath);
      newPath = this.getPath(newPath);
      const content = await this.readFileBytes(oldPath);
      await this.writeFile(newPath, content);
      this.log(`Rename ${oldPath} - ${newPath}`);
      return this.deleteFile(oldPath);
    }
    async copyFile(fromPath, toPath) {
      fromPath = this.getPath(fromPath);
      toPath = this.getPath(toPath);
      const content = await this.readFileBytes(fromPath);
      await this.writeFile(toPath, content);
      this.log(`Copy ${fromPath} - ${toPath}`);
      return true;
    }
    async move(fromPath, toPath) {
      fromPath = this.getPath(fromPath);
      toPath = this.getPath(toPath);
      const success = await this.copyFile(fromPath, toPath);
      if (success) {
        this.log(`Move ${fromPath} - ${toPath}`);
        return this.deleteFile(fromPath);
      }
      this.log(`Can't move ${fromPath} - ${toPath}`);
      return false;
    }
    async loadImage(path) {
      path = this.getPath(path);
      const data = await this.readFileBytes(path);
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          res(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          rej("Image load failed");
        };
        img.src = url;
      });
    }
    cacheImagesAsDataURL = {};
    async loadImageAsDataURL(path) {
      path = this.getPath(path);
      const sha1 = await this.getSHA1(path);
      if (this.cacheImagesAsDataURL[path] && this.cacheImagesAsDataURL[path].sha1 == sha1) {
        return this.cacheImagesAsDataURL[path].result;
      }
      const data = await this.readFileBytes(path);
      const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
      const mimeType = fs_default.getMimeType(path);
      const result = `data:${mimeType};base64,${base64}`;
      this.cacheImagesAsDataURL[path] = { sha1, result };
      return result;
    }
    async erase() {
      return new Promise((res, rej) => {
        const request = indexedDB.open(this.db.name);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(db.objectStoreNames, "readwrite");
          for (let storeName of db.objectStoreNames) {
            transaction.objectStore(storeName).clear();
          }
          transaction.oncomplete = () => {
            db.close();
            res(true);
          };
          transaction.onerror = () => {
            rej(transaction.error);
          };
        };
        request.onerror = (event) => {
          rej(request.error);
        };
      });
    }
    async getSHA1(path) {
      path = this.getPath(path);
      const store = this.transaction();
      return new Promise((res, rej) => {
        const req = store.get(path);
        req.onsuccess = async () => {
          const result = req.result;
          if (result && result.type === "file") {
            const fileEntry = result;
            if (fileEntry.sha1) return res(fileEntry.sha1);
            try {
              const buf = await fileEntry.content.arrayBuffer();
              if (typeof crypto === "undefined" || !crypto.subtle) {
                const fallback = Math.random().toString();
                fileEntry.sha1 = fallback;
                const writeStore2 = this.db.transaction([this.objectStore], "readwrite").objectStore(this.objectStore);
                writeStore2.put(fileEntry, path);
                return res(fallback);
              }
              const hashBuffer = await crypto.subtle.digest("SHA-1", buf);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
              fileEntry.sha1 = hex;
              fileEntry.modifiedAt = fileEntry.modifiedAt || Date.now();
              const writeStore = this.db.transaction([this.objectStore], "readwrite").objectStore(this.objectStore);
              writeStore.put(fileEntry, path);
              return res(hex);
            } catch (e) {
              return rej(e);
            }
          }
          rej(new Error("File not found or not a file"));
        };
        req.onerror = () => rej(req.error);
      });
    }
    async readFileMeta(path) {
      path = this.getPath(path);
      const store = this.db.transaction([this.objectStore], "readonly").objectStore(this.objectStore);
      return new Promise((res, rej) => {
        const req = store.get(path);
        req.onsuccess = () => {
          const result = req.result;
          if (result && result.type === "file") {
            const f = result;
            res({ createdAt: f.createdAt, modifiedAt: f.modifiedAt, sha1: f.sha1 });
          } else {
            rej(new Error("File not found or not a file"));
          }
        };
        req.onerror = () => rej(req.error);
      });
    }
  };

  // core/src/fs/opfs.ts
  var OPFS = class {
    constructor(root) {
      this.root = root;
    }
    type = "OPFS";
    logDebug = false;
    log(...args) {
      if (this.logDebug) {
        console.log(...args);
      }
    }
    getPath(path) {
      if (!path.startsWith("/")) path = "/" + path;
      return path;
    }
    async getPathParts(path) {
      return path.replace(/^\/+/, "").split("/").filter(global.Boolean);
    }
    async getParentDirHandle(path, create = false) {
      path = this.getPath(path);
      const parts = await this.getPathParts(path);
      parts.pop();
      let dir = this.root;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create });
      }
      return dir;
    }
    async getFileHandle(path, create = false) {
      path = this.getPath(path);
      const parts = await this.getPathParts(path);
      const name = parts.pop();
      const parent = await this.getParentDirHandle(path, create);
      return parent.getFileHandle(name, { create });
    }
    async getDirectoryHandle(path, create = false) {
      path = this.getPath(path);
      const parts = await this.getPathParts(path);
      let dir = this.root;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create });
      }
      return dir;
    }
    async createFile(path) {
      path = this.getPath(path);
      await this.getFileHandle(path, true);
      this.log(`Created file [${path}]`);
    }
    async writeFile(path, data) {
      path = this.getPath(path);
      const fileHandle = await this.getFileHandle(path, true);
      const writable = await fileHandle.createWritable();
      if (data instanceof global.Uint8Array) await writable.write(new global.Blob([data]));
      else await writable.write(data);
      await writable.close();
      this.log(`Writed file [${path}] = ${data instanceof global.Uint8Array ? `${data.length} length of uint8array` : data instanceof global.Blob ? "" : `${data.length} length of string`}`);
    }
    async readFile(path) {
      path = this.getPath(path);
      try {
        const fileHandle = await this.getFileHandle(path);
        const file = await fileHandle.getFile();
        return await file.text();
      } catch (e) {
        throw error(`Can't read file [${path}]`);
      }
    }
    async readFileBytes(path) {
      path = this.getPath(path);
      try {
        const fileHandle = await this.getFileHandle(path);
        const file = await fileHandle.getFile();
        const buffer = await file.arrayBuffer();
        return new global.Uint8Array(buffer);
      } catch (e) {
        throw error(`Can't read file [${path}]`);
      }
    }
    async readFileB64(path) {
      path = this.getPath(path);
      try {
        let binary = "";
        const fileHandle = await this.getFileHandle(path);
        const file = await fileHandle.getFile();
        const buffer = await file.arrayBuffer();
        const bytes = new global.Uint8Array(buffer);
        bytes.forEach((byte) => binary += global.String.fromCharCode(byte));
        return `data:${file.type || "application/octet-stream"};base64,${global.btoa(binary)}`;
      } catch (e) {
        throw error(`Can't read file [${path}]`);
      }
    }
    async loadImage(path) {
      path = this.getPath(path);
      const fileData = await this.readFileBytes(path);
      const blob = new global.Blob([fileData]);
      const imageUrl = global.URL.createObjectURL(blob);
      return new Promise((res, rej) => {
        const img = new global.Image();
        img.onload = () => {
          global.URL.revokeObjectURL(imageUrl);
          res(img);
        };
        img.onerror = (err) => {
          global.URL.revokeObjectURL(imageUrl);
          rej(`Failed to load image: ${err}`);
        };
        img.src = imageUrl;
      });
    }
    async loadImageAsDataURL(path) {
      path = this.getPath(path);
      const data = await this.readFileBytes(path);
      const base64 = global.btoa(global.String.fromCharCode(...new global.Uint8Array(data)));
      const mimeType = fs_default.getMimeType(path);
      return `data:${mimeType};base64,${base64}`;
    }
    async createDir(path) {
      path = this.getPath(path);
      if (await this.existsDir(path)) return;
      await this.getDirectoryHandle(path, true);
      this.log(`Created directory [${path}]`);
    }
    async exists(path) {
      path = this.getPath(path);
      let file = false;
      let directory = false;
      try {
        await this.getFileHandle(path);
        file = true;
      } catch {
      }
      try {
        await this.getDirectoryHandle(path);
        directory = true;
      } catch {
      }
      return file || directory;
    }
    async existsFile(path) {
      path = this.getPath(path);
      try {
        await this.getFileHandle(path);
        return true;
      } catch {
      }
      return false;
    }
    async existsDir(path) {
      path = this.getPath(path);
      try {
        await this.getDirectoryHandle(path);
        return true;
      } catch {
      }
      return false;
    }
    async isFile(path) {
      path = this.getPath(path);
      try {
        await this.getFileHandle(path);
        return true;
      } catch {
        return false;
      }
    }
    async isDirectory(path) {
      path = this.getPath(path);
      try {
        await this.getDirectoryHandle(path);
        return true;
      } catch {
        return false;
      }
    }
    async deleteFile(path) {
      path = this.getPath(path);
      if (!await this.existsFile(path)) {
        this.log(`Can't delete file [${path}] - not exists`);
        return false;
      }
      try {
        const parts = await this.getPathParts(path);
        const name = parts.pop();
        const parent = await this.getParentDirHandle(path);
        await parent.removeEntry(name);
        this.log(`Deleted file [${path}]`);
        return true;
      } catch (e) {
        this.log(`Can't delete file [${path}] - ${e}`);
        return false;
      }
    }
    async deleteDirectory(path, recursive = false) {
      path = this.getPath(path);
      if (!await this.existsDir(path)) {
        this.log(`Can't delete directory [${path}] - not exists`);
        return false;
      }
      try {
        const parts = await this.getPathParts(path);
        const name = parts.pop();
        const parent = await this.getParentDirHandle(path);
        await parent.removeEntry(name, { recursive });
        this.log(`Deleted directory [${path}]`);
        return true;
      } catch (e) {
        this.log(`Can't delete directory [${path}] - ${e}`);
        return false;
      }
    }
    async listDir(path) {
      path = this.getPath(path);
      try {
        const dir = await this.getDirectoryHandle(path);
        const result = [];
        for await (const [name] of dir.entries()) result.unshift(name);
        return result;
      } catch {
        return [];
      }
    }
    async rename(oldPath, newPath) {
      oldPath = this.getPath(oldPath);
      newPath = this.getPath(newPath);
      try {
        const file = await this.readFileBytes(oldPath);
        await this.writeFile(newPath, file);
        const success = await this.deleteFile(oldPath);
        if (success) this.log(`Renamed file ${oldPath} - ${newPath}`);
        else this.log(`Failed to delete original file during rename`);
        return success;
      } catch {
        this.log(`Can't rename file ${oldPath} - ${newPath}`);
        return false;
      }
    }
    async copyFile(fromPath, toPath) {
      fromPath = this.getPath(fromPath);
      toPath = this.getPath(toPath);
      try {
        const data = await this.readFileBytes(fromPath);
        await this.writeFile(toPath, data);
        this.log(`Copy ${fromPath} - ${toPath}`);
        return true;
      } catch {
        this.log(`Can't copy ${fromPath} - ${toPath}`);
        return false;
      }
    }
    async move(fromPath, toPath) {
      fromPath = this.getPath(fromPath);
      toPath = this.getPath(toPath);
      if (await this.copyFile(fromPath, toPath)) {
        this.log(`Move ${fromPath} - ${toPath}`);
        return await this.deleteFile(fromPath);
      }
      this.log(`Can't move ${fromPath} - ${toPath}`);
      return false;
    }
    async erase() {
      async function deleteAllEntries(dirHandle) {
        for await (const [name, handle] of dirHandle.entries()) {
          if (handle.kind == "file") {
            await dirHandle.removeEntry(name);
          } else if (handle.kind == "directory") {
            await deleteAllEntries(handle);
            await dirHandle.removeEntry(name, { recursive: true });
          }
        }
      }
      await deleteAllEntries(this.root);
      return true;
    }
    async getSHA1(path) {
      path = this.getPath(path);
      const bytes = await this.readFileBytes(path);
      const hashBuffer = await global.crypto.subtle.digest("SHA-1", bytes);
      const hashArray = global.Array.from(new global.Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  };

  // core/src/fs/inmemory.ts
  var InMemoryFS = class {
    type = "InMemory";
    logDebug = false;
    data = {};
    log(...args) {
      if (this.logDebug) {
        console.log(...args);
      }
    }
    getPath(path) {
      if (!path.startsWith("/")) path = "/" + path;
      return path;
    }
    async createFile(path) {
      this.data[this.getPath(path)] = { content: new Uint8Array(), isDir: false };
      this.log(`Created file [${path}]`);
    }
    async writeFile(path, data) {
      path = this.getPath(path);
      let buffer;
      if (typeof data == "string") {
        buffer = new TextEncoder().encode(data);
      } else if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        buffer = new Uint8Array(arrayBuffer);
      } else if (data instanceof Uint8Array) {
        buffer = data;
      } else if (typeof data == "object") {
        buffer = new TextEncoder().encode(JSON.stringify(data));
      } else {
        throw error("Unsupported data type");
      }
      this.data[path] = { content: buffer, isDir: false };
      this.log(`Wrote to file [${path}]`);
    }
    async readFile(path) {
      path = this.getPath(path);
      const entry = this.data[path];
      if (!entry || entry.isDir) {
        throw error(`File not found: ${path}`);
      }
      return new global.TextDecoder().decode(entry.content);
    }
    async readFileBytes(path) {
      path = this.getPath(path);
      const entry = this.data[path];
      if (!entry || entry.isDir) {
        throw error(`File not found: ${path}`);
      }
      return entry.content;
    }
    async readFileB64(path) {
      path = this.getPath(path);
      const bytes = await this.readFileBytes(path);
      return global.btoa(global.String.fromCharCode.apply(null, bytes));
    }
    async loadImage(path) {
      path = this.getPath(path);
      const fileData = await this.readFileBytes(path);
      const blob = new global.Blob([fileData]);
      const imageUrl = global.URL.createObjectURL(blob);
      return new Promise((res, rej) => {
        const img = new global.Image();
        img.onload = () => {
          global.URL.revokeObjectURL(imageUrl);
          res(img);
        };
        img.onerror = (err) => {
          global.URL.revokeObjectURL(imageUrl);
          rej(`Failed to load image: ${err}`);
        };
        img.src = imageUrl;
      });
    }
    async loadImageAsDataURL(path) {
      path = this.getPath(path);
      const data = await this.readFileBytes(path);
      const base64 = global.btoa(global.String.fromCharCode(...new global.Uint8Array(data)));
      const mimeType = fs_default.getMimeType(path);
      return `data:${mimeType};base64,${base64}`;
    }
    async createDir(path) {
      path = this.getPath(path);
      if (await this.existsDir(path)) return;
      this.data[path] = { content: new Uint8Array(0), isDir: true };
      this.log(`Created directory [${path}]`);
    }
    async exists(path) {
      path = this.getPath(path);
      return !!this.data[path];
    }
    async existsFile(path) {
      path = this.getPath(path);
      const entry = this.data[path];
      return !!(entry && !entry.isDir);
    }
    async existsDir(path) {
      path = this.getPath(path);
      const entry = this.data[path];
      return !!(entry && entry.isDir);
    }
    async isFile(path) {
      path = this.getPath(path);
      const entry = this.data[path];
      return !!(entry && !entry.isDir);
    }
    async isDirectory(path) {
      path = this.getPath(path);
      const entry = this.data[path];
      return !!(entry && entry.isDir);
    }
    async deleteFile(path) {
      path = this.getPath(path);
      if (!await this.existsFile(path)) {
        this.log(`Can't delete file [${path}] - not exists`);
        return false;
      }
      delete this.data[path];
      this.log(`Deleted file [${path}]`);
      return true;
    }
    async deleteDirectory(path, recursive = false) {
      path = this.getPath(path);
      if (!await this.existsDir(path)) {
        this.log(`Can't delete directory [${path}] - not exists`);
        return false;
      }
      if (!recursive) {
        for (const key in this.data) {
          if (key != path && key.startsWith(path + "/")) {
            this.log(`Directory not empty: ${path}`);
            return false;
          }
        }
      }
      const keysToDelete = Object.keys(this.data).filter(
        (key) => key == path || key.startsWith(path + "/")
      );
      for (const key of keysToDelete) {
        delete this.data[key];
      }
      this.log(`Deleted directory [${path}]`);
      return true;
    }
    async listDir(path) {
      path = this.getPath(path);
      if (!await this.existsDir(path)) {
        throw error(`Directory not found: ${path}`);
      }
      const result = /* @__PURE__ */ new Set();
      for (const key in this.data) {
        if (key == path) continue;
        if (key.startsWith(path + "/")) {
          const subPath = key.substring(path.length + 1);
          const slashIndex = subPath.indexOf("/");
          const name = slashIndex == -1 ? subPath : subPath.substring(0, slashIndex);
          result.add(name);
        }
      }
      return Array.from(result);
    }
    async rename(oldPath, newPath) {
      oldPath = this.getPath(oldPath);
      newPath = this.getPath(newPath);
      if (!await this.exists(oldPath)) {
        this.log(`Rename failed: source [${oldPath}] does not exist`);
        return false;
      }
      if (await this.exists(newPath)) {
        this.log(`Rename failed: target [${newPath}] already exists`);
        return false;
      }
      const isDir = await this.isDirectory(oldPath);
      const oldContent = this.data[oldPath];
      if (isDir) {
        const entries = Object.keys(this.data).filter(
          (k) => k.startsWith(oldPath + "/")
        );
        for (const key of entries) {
          const suffix = key.substring(oldPath.length);
          this.data[newPath + suffix] = this.data[key];
          delete this.data[key];
        }
      } else {
        this.data[newPath] = oldContent;
        delete this.data[oldPath];
      }
      this.log(`Renamed [${oldPath}] \u2192 [${newPath}]`);
      return true;
    }
    async copyFile(fromPath, toPath) {
      fromPath = this.getPath(fromPath);
      toPath = this.getPath(toPath);
      if (!await this.existsFile(fromPath)) {
        this.log(`Copy failed: source file [${fromPath}] does not exist`);
        return false;
      }
      if (await this.exists(toPath)) {
        this.log(`Copy failed: target file [${toPath}] already exists`);
        return false;
      }
      const content = this.data[fromPath].content;
      this.data[toPath] = { content, isDir: false };
      this.log(`Copied [${fromPath}] \u2192 [${toPath}]`);
      return true;
    }
    async move(fromPath, toPath) {
      fromPath = this.getPath(fromPath);
      toPath = this.getPath(toPath);
      if (await this.copyFile(fromPath, toPath)) {
        this.log(`Move ${fromPath} - ${toPath}`);
        return await this.deleteFile(fromPath);
      }
      this.log(`Can't move ${fromPath} - ${toPath}`);
      return false;
    }
    async erase() {
      this.data = {};
      return true;
    }
    async getSHA1(path) {
      path = this.getPath(path);
      const bytes = await this.readFileBytes(path);
      const hashBuffer = await global.crypto.subtle.digest("SHA-1", bytes);
      const hashArray = global.Array.from(new global.Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  };

  // core/src/fs/fs.ts
  var FS = class _FS {
    logDebug = false;
    backend;
    type = "OPFS";
    async init(type = "auto", root) {
      if (type == "auto") {
        type = "InMemory";
        if ("Indexeddb" in window) type = "Indexeddb";
        if (typeof navigator.storage != "undefined") type = "OPFS";
      }
      this.type = type;
      await this.changeBackend(type, root, true);
      console.log("Filesystem initialized");
    }
    async changeBackend(type = "InMemory", root, force = false) {
      const t = type.toLowerCase();
      if (this.type == type && !force) return;
      if (t == "opfs") {
        if (location.protocol == "file:") throw new Error(`OPFS doesn't work on protocol file://`);
        if (!root || !(root instanceof FileSystemDirectoryHandle)) root = await navigator.storage.getDirectory();
        this.backend = new OPFS(root);
      } else if (t == "indexeddb") {
        const backend = new IndexedDB(typeof root == "string" ? root : "BafiaOnline");
        await backend.init();
        this.backend = backend;
      } else if (t == "inmemory") {
        this.backend = new InMemoryFS();
      } else {
        throw new Error("No backend");
      }
      this.type = type;
      console.log("FS Type: " + type);
      this.backend.logDebug = false;
    }
    static async get(type = "InMemory", root) {
      return await new _FS().init(type, root);
    }
    getMimeType(path) {
      const extension = path.toLowerCase().split(".").pop() || "";
      const mimeTypes = {
        // Images
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "bmp": "image/bmp",
        "webp": "image/webp",
        "svg": "image/svg+xml",
        "ico": "image/x-icon",
        // Audio
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        // Video
        "mp4": "video/mp4",
        "webm": "video/webm",
        "mov": "video/quicktime",
        // Documents
        "txt": "text/plain",
        "html": "text/html",
        "htm": "text/html",
        "css": "text/css",
        "js": "application/javascript",
        "json": "application/json",
        "xml": "application/xml",
        "pdf": "application/pdf",
        // Archives
        "zip": "application/zip",
        "rar": "application/x-rar-compressed",
        "7z": "application/x-7z-compressed",
        "tar": "application/x-tar",
        "gz": "application/gzip",
        // Other
        "bin": "application/octet-stream",
        "exe": "application/octet-stream",
        "dll": "application/octet-stream"
      };
      return mimeTypes[extension] || "application/octet-stream";
    }
    createFile(path) {
      return this.backend.createFile(path);
    }
    writeFile(path, data) {
      return this.backend.writeFile(path, data);
    }
    readFile(path) {
      return this.backend.readFile(path);
    }
    readFileBytes(path) {
      return this.backend.readFileBytes(path);
    }
    readFileB64(path) {
      return this.backend.readFileB64(path);
    }
    readFileMeta(path) {
      return this.backend.readFileMeta(path);
    }
    createDir(path) {
      return this.backend.createDir(path);
    }
    existsDir(path) {
      return this.backend.existsDir(path);
    }
    existsFile(path) {
      return this.backend.existsFile(path);
    }
    exists(path) {
      return this.backend.exists(path);
    }
    isFile(path) {
      return this.backend.isFile(path);
    }
    isDirectory(path) {
      return this.backend.isDirectory(path);
    }
    deleteFile(path) {
      return this.backend.deleteFile(path);
    }
    deleteDirectory(path, recursive) {
      return this.backend.deleteDirectory(path, recursive);
    }
    listDir(path) {
      return this.backend.listDir(path);
    }
    rename(oldPath, newPath) {
      return this.backend.rename(oldPath, newPath);
    }
    copyFile(fromPath, toPath) {
      return this.backend.copyFile(fromPath, toPath);
    }
    move(fromPath, toPath) {
      return this.backend.move(fromPath, toPath);
    }
    loadImage(path) {
      return this.backend.loadImage(path);
    }
    loadImageAsDataURL(path) {
      return this.backend.loadImageAsDataURL(path);
    }
    erase() {
      return this.backend.erase();
    }
    getSHA1(path) {
      return this.backend.getSHA1(path);
    }
  };
  var fs_default = new FS();

  // core/src/PacketDataKeys.ts
  var PacketDataKeys = {
    ACCEPTED: "a",
    ACCEPT_MESSAGES: "ac",
    ACTIVE: "ac",
    ACTIVITY: "ac",
    ADD_CLIENT_TO_CHAT: "acc",
    ADD_CLIENT_TO_DASHBOARD: "acd",
    ADD_CLIENT_TO_FRIENDSHIP_LIST: "acfl",
    ADD_CLIENT_TO_PRIVATE_CHAT: "acpc",
    ADD_CLIENT_TO_ROOMS_LIST: "acrl",
    ADD_FRIEND: "af",
    ADD: "add",
    ADD_PLAYER: "ap",
    ADMIN_BLOCK_USER: "abu",
    ADMIN_CONTROL_USER: "acu",
    ADMIN: "adm",
    ADMIN_KICK_USER: "aku",
    ADMIN_UNBLOCK_USER: "auu",
    AFFECTED_BY_ROLES: "abr",
    ALIVE: "a",
    APP_LANGUAGE: "alc",
    ASPIRIN: "a",
    BACKPACK: "bp",
    BILLING_APP_PACKAGE: "bapckg",
    BILLING_PRODUCT_ID: "bpid",
    BILLING_PURCHASE_PENDING: "bppndng",
    BILLING_PURCHASE_TOKEN: "bptkn",
    BLOCKED_USERS: "bus",
    BLOCK_DEVICE: "bdv",
    BLOCK_IP: "bi",
    BONUSES_ENABLED: "bns",
    BONUS_PRICE: "bp",
    BRIBE: "b",
    BUY_BILLING_MARKET_ITEM: "mrktgg",
    BUY_BILLING_MARKET_SUCCESS_ITEM: "bbmrktis",
    BUY_MARKET_ITEM: "bmrkti",
    BUY_MARKET_ITEM_SUCCESS: "bmrktis",
    CHAT_MESSAGE_CREATE: "cmc",
    CHECK_PLAYER_IS_IN_ROOM: "cpir",
    CIVILIAN_ALIVE: "c",
    CIVILIAN_ALL: "ca",
    CLEAN_VOTES_HISTORY: "cv",
    CLOUD_MESSAGING_TOKEN_IS_SAVED: "cmts",
    COMPLAINTS: "cmps",
    COMPLAINT: "cmp",
    CONDOM: "cm",
    CONFESSION: "cn",
    CONNECTION_CHECKER_PERIOD: "ccp",
    CONNECTION_INACTIVE_TIMEOUT: "cit",
    CREATED: "c",
    CREATE_PLAYER: "cp",
    CREATOR_BLOCKED: "crb",
    DATA: "data",
    DAYTIME: "d",
    DESCRIPTION: "dsc",
    DEVICE_ID: "d",
    EMAIL: "e",
    EMAIL_NOT_VERIFIED: "env",
    EMAIL_NOT_VERIFIED_MESSAGE_CREATE_TIMEOUT: "envmct",
    ERROR_FLOOD_DETECTED: "erfd",
    ERROR: "e",
    ERROR_OCCUR: "ero",
    EXPERIENCE: "ex",
    FILE: "f",
    FIRST_AID_KIT: "f",
    FIRST_NAME: "fn",
    FRIENDSHIP_FLAG: "fpf",
    FRIENDSHIP: "fp",
    FRIENDSHIP_LIST: "frl",
    FRIENDSHIP_LIST_LIMIT: "fll",
    FRIENDSHIP_LIST_LIMIT_FOR_VIP: "fllfv",
    FRIENDSHIP_REQUESTS: "fr",
    FRIENDS_IN_INVITE_LIST: "fiil",
    FRIEND_IN_ROOM: "fir",
    FRIEND_IS_INVITED: "fiinvtd",
    FRIEND: "ff",
    FRIEND_USER_OBJECT_ID: "f",
    GAME_DAYTIME: "gd",
    GAME_FINISHED: "gf",
    GAME_STARTED: "gsd",
    GAME_STATUS_IN_ROOMS_LIST: "gsrl",
    GAME_STATUS: "gs",
    GET_BLOCKED_USERS: "gbus",
    GET_COMPLAINTS: "gcmps",
    GET_FRIENDS_IN_INVITE_LIST: "gfiil",
    GET_PLAYERS: "gp",
    GET_RATING: "gr",
    GET_SENT_FRIEND_REQUESTS_LIST: "gsfrl",
    GET_USER_PROFILE: "gup",
    GET_MATCH_MAKING_USERS_IN_QUEUE_INTERVAL: "mmguiabk",
    GIVE_UP: "agu",
    GIFT_MARKET_ITEMS: "gmrkti",
    GOLD: "g",
    GOOGLE_SIGN_IN: "gsin",
    GOOGLE_TOKEN: "gt",
    GOOGLE_USER_ID: "gui",
    HIS_FRIENDSHIP_LIST_FULL: "hflf",
    INFO_MESSAGE: "imsg",
    INVITATION_SENDER_USERNAME: "isun",
    IP_ADDRESS: "ip",
    IS_BILLING_ITEM: "ibi",
    IS_DAY_ACTION_USED: "idau",
    IS_INVITED: "iinvtd",
    IS_NIGHT_ACTION_ALTERNATIVE: "inaa",
    IS_NIGHT_ACTION_USED: "inau",
    IS_ONLINE: "on",
    ITEM_PRICE_TEXT: "iprct",
    KICK_TIMER: "kt",
    KICK_USER_AUTHORITY_LESS_THAN_USER: "kualtu",
    KICK_USER_GAME_STARTED: "kugs",
    KICK_USER: "ku",
    KICK_USER_NOT_IN_ROOM: "kunir",
    KICK_USER_OBJECT_ID: "k",
    KICK_USER_PRICE: "kup",
    KICK_USER_RANK: "kur",
    KICK_USER_STARTED: "kus",
    KICK_USER_VOTE: "kuv",
    LAST_NAME: "ln",
    LEVEL: "l",
    LIE_DETECTOR: "l",
    MAFIA_ALIVE: "m",
    MAFIA_ALL: "ma",
    MAKE_COMPLAINT: "mc",
    MATCH_MAKING_MATCH_STATUS: "mmms",
    MATCH_MAKING_BASE_PLAYERS_AMOUNT: "mmbpa",
    MATCH_MAKING_GET_STATUS: "mmgsk",
    MATH_MAKING_ADD_USER: "mmauk",
    MARKET_ITEMS: "mrkti",
    MAXIMUM_PLAYERS: "mxmp",
    MAX_PLAYERS: "mxp",
    MESSAGES: "ms",
    MESSAGE: "m",
    MESSAGE_STYLE: "mstl",
    MESSAGE_TYPE: "t",
    MESSAGE_STICKER: "mstk",
    MIN_LEVEL: "mnl",
    MIN_PLAYERS: "mnp",
    MONEY: "mo",
    NEW_CLOUD_MESSAGING_TOKEN: "ncmt",
    NEW_MESSAGES: "nm",
    NEXT_LEVEL_EXPERIENCE: "nle",
    NOT_ENOUGH_AUTHORITY_ERROR: "neae",
    NO_CHANGES: "noch",
    NUM: "n",
    NUM_MAFIA: "m",
    NUM_PLAYERS: "p",
    OBJECT_ID: "o",
    PASSWORD: "pw",
    PHOTO: "ph",
    PLAYED_GAMES: "pg",
    PLAYERS_IN_ROOM: "pin",
    PLAYERS: "pls",
    PLAYERS_NUM: "pn",
    PLAYERS_STAT: "ps",
    PLAYER: "p",
    PLAYER_ROLE_STATISTICS: "prst",
    PREVIOUS_LEVEL_EXPERIENCE: "ple",
    PRICE_USERNAME_SET: "pus",
    PRIVATE_CHAT_MESSAGE_CREATE: "pmc",
    RANKS: "r",
    RATING: "rtg",
    RATING_MODE: "rmd",
    RATING_TYPE: "rt",
    RATING_USERS_LIST: "rul",
    RATING_VALUE: "rv",
    REASON: "r",
    REMOVE_COMPLAINT: "rcmp",
    REMOVE_FRIEND: "rf",
    REMOVE_INVITATION_TO_ROOM: "ritr",
    REMOVE: "rm",
    REMOVE_MESSAGES: "rmm",
    REMOVE_PHOTO: "rph",
    REMOVE_PLAYER: "rp",
    REMOVE_USER: "rmu",
    ROLES: "roles",
    ROLE_ACTION: "ra",
    ROLE: "r",
    ROOMS: "rs",
    ROOM_CREATED: "rcd",
    ROOM_CREATE: "rc",
    ROOM_ENTER: "re",
    ROOM_MODEL_TYPE: "rmt",
    ROOM_STATISTICS: "rst",
    ROOM_IN_LOBBY_STATE: "rils",
    ROOM: "rr",
    ROOM_MESSAGE_CREATE: "rmc",
    ROOM_OBJECT_ID: "ro",
    ROOM_PASSWORD_IS_WRONG_ERROR: "rpiw",
    ROOM_PASS: "psw",
    ROOM_STATUS: "rs",
    SCORE: "sc",
    SCREENSHOT: "sc",
    SEARCH_TEXT: "st",
    SEARCH_USER: "su",
    SELECTED_ROLES: "sr",
    SEND_FRIEND_INVITE_TO_ROOM: "sfitr",
    SERVER_CONFIG: "scfg",
    SERVER_LANGUAGE_CHANGE_TIME: "slct",
    SERVER_LANGUAGE: "slc",
    SERVER_ROOM_TITLE_MINIMAL_LEVEL: "srtml",
    SERVER_ROOM_PASSWORD_MINIMAL_LEVEL: "srpml",
    SET_ROOM_PASSWORD_MIN_AUTHORITY: "srpma",
    SET_PROFILE_PHOTO_MINIMAL_LEVEL: "sppml",
    SET_SERVER_LANGUAGE_TIME_ERROR: "sslte",
    SEX: "s",
    SHOW_PASSWORD_ROOM_INFO_BUTTON: "sprib",
    SIGN_IN_ERROR: "siner",
    SIGN_IN: "sin",
    SIGN_OUT_USER: "soutu",
    STATUS: "s",
    TEAM: "t",
    TEXT: "tx",
    TIMER: "t",
    TIME: "t",
    TIME_SEC_REMAINING: "tsr",
    TIME_UNTIL: "tu",
    TITLE: "tt",
    TOKEN: "t",
    TYPE_ERROR: "err",
    TYPE: "ty",
    UPDATED: "up",
    UPLOAD_PHOTO: "upp",
    UPLOAD_SCREENSHOT: "ups",
    USED_LAST_MESSAGE: "um",
    USERNAME_HAS_WRONG_SYMBOLS: "unws",
    USERNAME_IS_EMPTY: "unie",
    USERNAME_IS_EXISTS: "unex",
    USERNAME_IS_OUT_OF_BOUNDS: "unob",
    USERNAME: "u",
    USERNAME_SET: "uns",
    USERNAME_TRANSLIT: "ut",
    USERS: "u",
    USER_BLOCKED: "ublk",
    USER_CHANGE_SEX: "ucs",
    USER_DASHBOARD: "uud",
    USER_DATA: "ud",
    USER_INACTIVE_BLOCKED: "uib",
    USER_IN_ANOTHER_ROOM: "uiar",
    USER_IN_A_ROOM: "uir",
    USER_IS_NOT_VIP: "uinv",
    USER_IS_NOT_VIP_TO_INVITE_FRIENDS_IN_ROOM: "uinvtifr",
    USER: "uu",
    USER_KICKED: "ukd",
    USER_LEVEL_NOT_ENOUGH: "ulne",
    USER_NOT_IN_A_ROOM: "unir",
    USER_OBJECT_ID: "uo",
    USER_PROFILE: "uup",
    USER_RANK_FOR_KICK: "ur",
    USER_RANK: "r",
    USER_RECEIVER: "ur",
    USER_ROLE_ERROR: "ure",
    USER_SENDER: "us",
    USER_SENDER_OBJECT_ID: "uso",
    USER_SET_SERVER_LANGUAGE: "usls",
    USER_SET_USERNAME_ERROR: "ueue",
    USER_ENERGY: "ue",
    USER_SIGN_IN: "usi",
    USER_USING_DOUBLE_ACCOUNT: "uuda",
    VEST: "v",
    VIP_ENABLED: "venb",
    VIP: "v",
    VIP_ACCOUNT: "vip_account",
    VIP_UPDATED: "vupd",
    VOTES: "v",
    VOTE: "v",
    WHO_WON: "w",
    WINS_AS_KILLER: "wik",
    WINS_AS_MAFIA: "wim",
    WINS_AS_PEACEFUL: "wip",
    WRONG_FILE_SIZE: "wfs",
    WRONG_FILE_TYPE: "wft",
    YOUR_FRIENDSHIP_LIST_FULL: "yflf",
    ID: "i",
    MATCH_MAKING_SCORE: "mmscr",
    MATCH_MAKING_ADD_USER: "mmauk",
    MATCH_MAKING_REMOVE_USER: "mmruk",
    MATCH_MAKING_LIST_KEY: "mmblk",
    MATCH_MAKING_USER_IN_ROOM: "mmuir",
    MATCH_MAKING_BUCKET_RESPONSE_PLAYERS_AMOUNT: "mmbpa",
    VOTE_PLAYER_LIST: "vpl",
    PRIVATE_CHAT_LIST_MESSAGES: "pclms",
    PROFILE_USER_DATA: "pud",
    USER_ACCOUNT_COINS: "uac",
    SILVER_COINS: "scns",
    GOLD_COINS: "gcns",
    DECORATIONS: "dcrs",
    SAME_ROOM: "isr",
    BLOCKED_USER_INFO: "bui",
    DECORATION_ID: "did",
    DECORATION_TYPE: "dt",
    DECORAION_PARARAMETER: "dp",
    USER_CURRENET_ENERGY_AMOUNT: "ucea",
    USER_MAX_FREE_ENERGY_AMOUNT: "umfea",
    USER_ENERGY_AMOUNT_FIRST_TIMER: "ueaft",
    USER_ENERGY_AMOUNT_NEXT_TIMERS: "ueant",
    CREATOR_OBJECT_ID: "rco",
    VIP_REMANING_MILLISECONDS: "vrms",
    DASHBOARD_USER: "du",
    BACKPACK_SIZE: "bps",
    BACKPACK_VIP_SIZE: "bpsv",
    AVAILABLE_DECORATIONS: "bids",
    ACTIVATED_DECORATIONS: "aids",
    BACKPACK_ITEM_ID: "bio",
    WHO_BLOCKED_USER_ID: "wbuo",
    IS_USER_ID_MATCHED: "iuoim",
    IS_DEVICE_ID_MATHED: "idim",
    IS_IP_ADDRESS_MATCHED: "iipam",
    ACTIVATED_ITEM_OBJECT_ID: "aio",
    ITEM_EXPIRE_AFTER: "iea",
    MARKET_PRODUCT_ID: "mpid",
    MARKET_OFFER_COIN_TYPE: "moct",
    MARKET_OFFER_PRICE: "mop",
    MARKET_OFFER_DURATION: "mod",
    MARKET_COINS_AMOUNT: "mca",
    MARKET_COIN_TYPE: "mct",
    PAYMENT_URL: "puk",
    ITEM_PRISE_TESXT: "iprct",
    BILLING_PURCHASE_ACCOUNT_ID: "bpaid",
    MARKET_ITEM_DECORATION: "mid",
    MARKET_ITEM_OFFERS: "mio",
    PHOTO_FILENAME: "ph",
    MARKET_ITEM_DECORATIONS: "mids",
    MARKET_BILLING_ITEM: "mbi",
    MARKET_VIP_ITEMS: "mivs",
    MARKET_SILVER_COIN_ITEMS: "misc",
    MARKET_OFFER_ID: "moid",
    SELECTED_PARAMETERS_IDS: "dp",
    CACHE_KEY: "cchk",
    USER_DEFAULT_PHOTOS_IDS: "usdphi",
    IS_MATCH_MAKING_ENABLED: "is_match_making_enabled",
    IS_BACKPACK_ENABLED: "is_backpack_enabled",
    MATCH_MAKING_MINIMUM_LEVEL: "match_making_minimum_level",
    PUBLIC_CHAT_MINIMUM_LEVEL: "public_chat_minimum_level",
    PLAYERS_DATA: "data",
    VERSION_CODE: "vc",
    MATCH_MAKING_FINDED_USERS_NUMBER: "mmfun",
    PRIVATE_CHAT_LAST_MESSAGE: "pclm",
    USER_GET_DEFAULT_PHOTOS: "usgdph",
    USER_DEFAULT_PHOTOS: "usdph",
    DASHBOARD: "db",
    BACKPACK_GET: "bpg",
    MARKET_BILLING_TYPE: "mbt",
    MARKET_GET: "mrktg",
    MARKET: "mr",
    BUY_BILLING_VIP_ITEM: "bbvi",
    BUY_SILVER_COINS_ITEM: "bsci",
    BUY_DECORATION: "bd",
    BUY_DECORATION_REQUEST: "bdr",
    MATCH_MAKING_ADD_GAME: "mmag",
    MATCH_MAKING_USER_ADD_GAME: "mmcuag",
    MATCH_MAKING_USER_SELECT_ROLE: "mmusr",
    MATCH_MAKING_COUNT_USER_SELECTED_ROLES: "mmcusr",
    MATCH_MAKING_ROOM: "mmrr",
    MATCH_MAKING_ROLES_COUNT: "mmrc",
    NEED_MINIMUM_LEVEL_CHAT: "nelfpc",
    NEED_MINIMUM_LEVEL_MM: "nelfmm",
    USER_CHANGE_EMAIL: "uche",
    USER_RESET_PASSWORD: "usrp",
    USER_RESET_PASSWORD_SENDED: "usrps",
    USER_WITH_EMAIL_NOT_EXISTS: "uwene",
    USTMR: "ustmr",
    USRSFR: "usrsfr",
    USER_ID: "usid",
    PLAYER_USER: "pu",
    PLAYER_OBJECT_ID: "puo",
    PLAYER_ROLES: "pls"
  };
  var PacketDataKeys_default = PacketDataKeys;

  // game/src/utils/Resources.ts
  var activeRequests = 0;
  var imageQueue = [];
  var MAX_CONCURRENT_REQUESTS = 5;
  var pendingPromises = /* @__PURE__ */ new Map();
  function processQueue() {
    if (imageQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) return;
    const { url, resolve } = imageQueue.shift();
    activeRequests++;
    const img = new Image();
    let finished = false;
    let timeoutId;
    img.onload = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      activeRequests--;
      resolve(url);
      processQueue();
    };
    img.onerror = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      activeRequests--;
      resolve(null);
      processQueue();
    };
    img.src = url;
    timeoutId = window.setTimeout(() => {
      if (!finished) {
        finished = true;
        activeRequests--;
        resolve(null);
        processQueue();
      }
    }, 5e3);
  }
  function loadImageWithQueue(url, cacheKey) {
    if (App_default.resources[cacheKey]) {
      return Promise.resolve(App_default.resources[cacheKey]);
    }
    const promiseKey = `url_${url}`;
    if (pendingPromises.has(promiseKey)) {
      return pendingPromises.get(promiseKey);
    }
    const promise = new Promise((resolve) => {
      imageQueue.push({
        url,
        resolve(result) {
          pendingPromises.delete(promiseKey);
          if (result) {
            App_default.resources[cacheKey] = result;
          }
          resolve(result);
        }
      });
      processQueue();
    });
    pendingPromises.set(promiseKey, promise);
    return promise;
  }
  async function getAvatarImg(user) {
    if (user == "\u0411\u0430\u0440\u043C\u0435\u043D") return App_default.resources["barmanChat"];
    if (user == "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440") return App_default.resources["unknownChat"];
    if (user == "\u041C\u0430\u0444\u0438\u044F") return App_default.resources["mafiaChat"];
    if (!user || typeof user == "string") return App_default.resources["unknownChat"];
    const ph = user[PacketDataKeys_default.PHOTO] ?? user.photo;
    const uo = user[PacketDataKeys_default.OBJECT_ID] ?? user[PacketDataKeys_default.PLAYER_OBJECT_ID] ?? user.playerObjectId;
    const cacheKey = `avatars_${ph}`;
    if (App_default.resources[cacheKey]) {
      return App_default.resources[cacheKey];
    }
    const pendingKey = `avatar_${ph}`;
    if (pendingPromises.has(pendingKey)) {
      return pendingPromises.get(pendingKey);
    }
    const defaultImage = async () => {
      const avatar = await getDefaultAvatar(ph);
      App_default.resources[cacheKey] = avatar;
      return avatar;
    };
    const avatarPromise = (async () => {
      const photoUrl = `https://dottap.com/mafia/profile_photo/${ph}`;
      const byPhoto = await loadImageWithQueue(photoUrl, cacheKey);
      if (byPhoto) {
        pendingPromises.delete(pendingKey);
        return byPhoto;
      }
      const objectIdUrl = `https://dottap.com/mafia/profile_photo/${uo}?v=${Math.random()}`;
      const byObjectId = await loadImageWithQueue(objectIdUrl, cacheKey);
      if (byObjectId) {
        pendingPromises.delete(pendingKey);
        return byObjectId;
      }
      const defaultImg = await defaultImage();
      pendingPromises.delete(pendingKey);
      return defaultImg;
    })();
    pendingPromises.set(pendingKey, avatarPromise);
    return avatarPromise;
  }
  async function getDefaultAvatar(ph = "") {
    if (App_default.resources[`defaultAvatars_${ph}`]) return App_default.resources[`defaultAvatars_${ph}`];
    App_default.resources[`defaultAvatars_${ph}`] = await fs_default.loadImageAsDataURL(`${App_default.config.path}/assets/textures/logo/avatar.jpg`);
    return App_default.resources[`defaultAvatars_${ph}`];
  }
  async function getRoleImg(role) {
    if (App_default.resources[`role_${role}`]) return App_default.resources[`role_${role}`];
    App_default.resources[`role_${role}`] = await fs_default.loadImageAsDataURL(`${App_default.config.path}/assets/textures/roles/${role}.png`);
    return App_default.resources[`role_${role}`];
  }
  async function getBackgroundImg(bg) {
    if (App_default.resources[`background_${bg}`]) return App_default.resources[`background_${bg}`];
    App_default.resources[`background_${bg}`] = await fs_default.loadImageAsDataURL(`${App_default.config.path}/assets/textures/backgrounds/${bg}.png`);
    return App_default.resources[`background_${bg}`];
  }
  async function getTexture(path) {
    if (App_default.resources[`assets/textures/` + path]) return App_default.resources[`assets/textures/` + path];
    App_default.resources[`assets/textures/` + path] = await fs_default.loadImageAsDataURL(`${App_default.config.path}/assets/textures/${path}`);
    return App_default.resources[`assets/textures/` + path];
  }

  // core/src/utils/DOM.ts
  function insertAtCaret(element, text) {
    if (document.selection) {
      element.focus();
      const sel = document.selection.createRange();
      sel.text = text;
      element.focus();
    } else if (element.selectionStart || element.selectionStart === 0) {
      const startPos = element.selectionStart;
      const endPos = element.selectionEnd;
      const scrollTop = element.scrollTop;
      element.value = element.value.substring(0, startPos) + text + element.value.substring(endPos, element.value.length);
      element.focus();
      element.selectionStart = startPos + text.length;
      element.selectionEnd = startPos + text.length;
      element.scrollTop = scrollTop;
    } else {
      element.value += text;
      element.focus();
    }
  }
  function processEmojis(element, html, size = 20) {
    element.innerHTML = "";
    const temp = document.createElement("div");
    temp.innerHTML = html;
    function processNode(node) {
      if (node.nodeType == Node.TEXT_NODE) {
        const text = node.textContent || "";
        const parts = text.split(/(:sm[1-6]:)/g);
        for (const part of parts) {
          if (part.match(/:sm[1-6]:/)) {
            const emojiName = part.slice(1, -1);
            const img = document.createElement("img");
            img.width = img.height = size;
            img.style.verticalAlign = "middle";
            img.style.margin = "0 2px";
            getTexture(`emoji/${emojiName}.png`).then((src) => img.src = src);
            element.appendChild(img);
          } else if (part) {
            element.appendChild(document.createTextNode(part));
          }
        }
      } else if (node.nodeType == Node.ELEMENT_NODE) {
        const el = document.createElement(node.nodeName);
        for (const attr of node.attributes) {
          el.setAttribute(attr.name, attr.value);
        }
        const tempElement = document.createElement("div");
        Array.from(node.childNodes).forEach((child) => {
          const savedElement = element;
          element = tempElement;
          processNode(child);
          element = savedElement;
        });
        el.innerHTML = tempElement.innerHTML;
        element.appendChild(el);
      }
    }
    Array.from(temp.childNodes).forEach(processNode);
  }
  function createElement(tagName, options, callback = () => {
  }) {
    const elem = document.createElement(tagName);
    if (options.className) elem.className = options.className;
    if (options.id) elem.id = options.id;
    if (options.text) elem.textContent = options.text;
    if (options.html) elem.innerHTML = options.html;
    if (options.hide) elem.style.display = "none";
    if (options.type) elem.type = options.type;
    if (options.checked) elem.checked = options.checked;
    if (options.value) elem.value = options.value;
    if (options.placeholder) elem.placeholder = options.placeholder;
    if (options.width) elem.width = options.width;
    if (options.height) elem.height = options.height;
    if (options.src) elem.src = options.src;
    if (options.css) {
      for (const key in options.css) {
        elem.style[key] = options.css[key];
      }
    }
    if (options.attr) {
      for (const e of options.attr) {
        elem.setAttribute(e[0], e[1]);
      }
    }
    callback(elem);
    if (options.appendTo) options.appendTo.appendChild(elem);
    return elem;
  }

  // game/src/screen/Loading.ts
  var Loading = class extends Screen {
    constructor(title) {
      super("Loading");
      this.title = title;
      App_default.title = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const logo = document.createElement("label");
      logo.innerHTML = "\u0411\u0430\u0444\u0438\u044F \u043E\u043D\u043B\u0430\u0439\u043D";
      header.appendChild(logo);
      const div = createElement("div", {
        css: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }
      });
      this.element.appendChild(div);
      const text = document.createElement("p");
      text.innerHTML = title;
      div.appendChild(text);
      this.loadingElem = createElement("img", {
        width: 100,
        height: 100
      });
      getTexture(`loading/2f.png`).then((e) => this.loadingElem.src = e);
      div.appendChild(this.loadingElem);
      this.reconnectBtn = createElement("button", {
        text: "\u041F\u0435\u0440\u0435\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F",
        css: {
          opacity: "0",
          display: "none",
          transition: "opacity .5s"
        }
      });
      this.reconnectBtn.onclick = () => {
        this.reconnectBtn.style.opacity = "0";
        App_default.server.connect();
      };
      div.appendChild(this.reconnectBtn);
      wrap(this, "title", (v) => text.innerHTML = v);
      this.on("back", () => App_default.destroy());
    }
    loadingElem;
    reconnectBtn;
    rotation = 0;
    tick(dt) {
      if (dt % 2 < 1) return;
      if (this.loadingElem) this.loadingElem.style.transform = `rotateZ(${this.rotation % 360}deg)`;
      this.rotation += 30;
      if (this.rotation % 1e3 == 970) {
        this.reconnectBtn.style.display = "block";
        this.reconnectBtn.style.opacity = "1";
      }
    }
  };

  // game/src/enums.ts
  var Roles = {
    CIVILIAN: 1,
    DOCTOR: 2,
    SHERIFF: 3,
    MAFIA: 4,
    LOVER: 5,
    TERRORIST: 6,
    JOURNALIST: 7,
    BODYGUARD: 8,
    BARMAN: 9,
    SPY: 10,
    INFORMER: 11
  };
  var RuRoles = [`\u041E\u0432\u043E\u0449`, `\u0414\u043E\u043A\u0442\u043E\u0440`, `\u0428\u0435\u0440\u0438\u0444`, `\u041C\u0430\u0444\u0438\u044F`, `\u041B\u044E\u0431\u043E\u0432\u043D\u0438\u0446\u0430`, `\u0422\u0435\u0440\u0440\u043E\u0440\u0438\u0441\u0442`, `\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442`, `\u0422\u0435\u043B\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435\u043B\u044C`, `\u0411\u0430\u0440\u043C\u0435\u043D`, `\u0428\u043F\u0438\u043E\u043D`, `\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440`];

  // game/src/server/User.ts
  var User = class {
    username = "User";
    objectId = "";
    playerObjectId = "";
    token = "";
    bToken = "";
    serverLanguage = "";
    status = 0;
    level = 0;
    experience = 0;
    nextLevelExperience = 0;
    previousLevelExperience = 0;
    isOnline = true;
    matchMakingScore = 0;
    photo = "";
    playedGames = 0;
    playerRoleStatistics = {
      [Roles.CIVILIAN]: 0,
      [Roles.DOCTOR]: 0,
      [Roles.SHERIFF]: 0,
      [Roles.MAFIA]: 0,
      [Roles.LOVER]: 0,
      [Roles.TERRORIST]: 0,
      [Roles.JOURNALIST]: 0,
      [Roles.BODYGUARD]: 0,
      [Roles.BARMAN]: 0,
      [Roles.SPY]: 0,
      [Roles.INFORMER]: 0
    };
    updated = 0;
    userRank = 0;
    vipUpdated = 0;
    vip = false;
    winsAsKiller = 0;
    winsAsMafia = 0;
    winsAsPeaceful = 0;
    goldCoins = 0;
    sliverCoins = 0;
    update(user) {
      this.playerObjectId = user[PacketDataKeys_default.PLAYER_OBJECT_ID];
      this.username = user[PacketDataKeys_default.USERNAME];
      this.photo = user[PacketDataKeys_default.PHOTO];
      this.status = user[PacketDataKeys_default.STATUS];
      this.experience = user[PacketDataKeys_default.EXPERIENCE];
      this.nextLevelExperience = user[PacketDataKeys_default.NEXT_LEVEL_EXPERIENCE];
      this.previousLevelExperience = user[PacketDataKeys_default.PREVIOUS_LEVEL_EXPERIENCE];
      this.level = user[PacketDataKeys_default.LEVEL];
      this.userRank = user[PacketDataKeys_default.USER_RANK];
      this.playedGames = user[PacketDataKeys_default.PLAYED_GAMES];
      this.playerRoleStatistics = user[PacketDataKeys_default.PLAYER_ROLE_STATISTICS];
      this.serverLanguage = user[PacketDataKeys_default.SERVER_LANGUAGE];
      this.updated = user[PacketDataKeys_default.UPDATED];
      this.vip = !!user[PacketDataKeys_default.VIP];
      this.winsAsKiller = user[PacketDataKeys_default.WINS_AS_KILLER];
      this.winsAsMafia = user[PacketDataKeys_default.WINS_AS_MAFIA];
      this.winsAsPeaceful = user[PacketDataKeys_default.WINS_AS_PEACEFUL];
    }
  };

  // core/src/utils/mobile.ts
  function isMobile() {
    return window.navigator.maxTouchPoints || "ontouchstart" in document;
  }
  function isIOS() {
    return [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod"
    ].includes(navigator.platform) || navigator.userAgent.includes("Mac") && "ontouchend" in document;
  }

  // game/src/dialog/Box.ts
  var Box = class extends Events {
    constructor(options = {}, element = document.createElement("div")) {
      super();
      this.element = element;
      const self2 = this;
      this.id = App_default.boxs.length;
      App_default.boxs.push(this);
      App_default.screen.element.style.pointerEvents = "none";
      const width = options.width ?? 300;
      const height = options.height ?? 150;
      const zoom = getZoom();
      this.element.style.width = width + "px";
      this.element.style.height = height + "px";
      this.element.style.position = "absolute";
      this.element.style.animation = "0.3s cubic-bezier(0.11, 0.05, 0.22, 0.81) open";
      this.mainElem = document.createElement("div");
      this.mainElem.style.position = "absolute";
      this.mainElem.style.display = "flex";
      this.mainElem.style.justifyContent = "center";
      this.mainElem.style.alignItems = "center";
      this.mainElem.style.width = "100%";
      this.mainElem.style.height = "100%";
      this.mainElem.style.left = "0";
      this.mainElem.style.top = "0";
      App_default.element.appendChild(this.mainElem);
      this.background = document.createElement("div");
      this.background.style.background = "black";
      this.background.style.position = "absolute";
      this.background.style.transition = "opacity .5s";
      this.background.style.display = "flex";
      this.background.style.justifyContent = "center";
      this.background.style.alignItems = "center";
      this.background.style.opacity = "0";
      this.background.style.width = "100%";
      this.background.style.height = "100%";
      this.background.style.left = "0";
      this.background.style.top = "0";
      this.mainElem.appendChild(this.background);
      const div = document.createElement("div");
      div.style.background = "#d03a41";
      div.style.width = "100%";
      div.style.borderRadius = "10px";
      this.element.appendChild(div);
      const titleBar = document.createElement("div");
      titleBar.style.width = "100%";
      titleBar.style.height = "35px";
      titleBar.style.display = "flex";
      titleBar.style.justifyContent = "center";
      titleBar.style.alignItems = "center";
      titleBar.textContent = options.title ?? "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F";
      div.appendChild(titleBar);
      const contentBackground = document.createElement("div");
      contentBackground.style.width = "100%";
      contentBackground.style.height = "100%";
      contentBackground.style.display = "flex";
      contentBackground.style.justifyContent = "center";
      div.appendChild(contentBackground);
      this.content = document.createElement("div");
      this.content.style.background = "#B4AEAC";
      this.content.style.margin = "0 5px 5px 5px";
      this.content.style.width = "100%";
      this.content.style.height = height - 40 + "px";
      this.content.style.borderRadius = "10px";
      contentBackground.appendChild(this.content);
      this.mainElem.appendChild(this.element);
      if (options.canCloseAnywhere) {
        this.background.addEventListener("click", (e) => {
          self2.close();
        });
      }
      wait(50).then(() => {
        this.background.style.opacity = ".6";
      });
      this.loop = App_default.on("tick", (dt) => this.emit("tick", dt));
    }
    mainElem;
    content;
    background;
    loop;
    id = -1;
    async close() {
      const e = await this.call("close", { isCancelled: false });
      if (e.isCancelled) return;
      this.background.style.opacity = "0";
      this.element.style.opacity = "0";
      this.element.style.animation = "0.2s cubic-bezier(0.11, 0.05, 0.22, 0.81) close";
      wait(300).then(() => this.destroy());
    }
    destroy() {
      this.emit("destroy");
      App_default.boxs.splice(this.id, 1);
      if (App_default.boxs.length == 0) App_default.screen.element.style.pointerEvents = "all";
      this.element.remove();
      this.background.remove();
      this.mainElem.remove();
    }
  };

  // game/src/dialog/MessageBox.ts
  async function MessageBox_default(message, options = {}) {
    const box = new Box({ title: options.title, height: options.height });
    const messageElem = document.createElement("div");
    messageElem.innerHTML = message.replaceAll(`
`, "<br/>");
    messageElem.style.color = "black";
    messageElem.style.textAlign = "center";
    messageElem.style.padding = "15px 5px";
    box.content.appendChild(messageElem);
    if (options.element) {
      messageElem.appendChild(options.element);
    }
    const footer = document.createElement("div");
    footer.style.width = "100%";
    footer.style.position = "absolute";
    footer.style.bottom = "15px";
    footer.style.display = "flex";
    footer.style.justifyContent = "center";
    footer.style.left = "0";
    box.content.appendChild(footer);
    const btnOk = document.createElement("button");
    btnOk.textContent = options.btnText ?? "OK";
    btnOk.style.width = "80%";
    btnOk.addEventListener("click", () => box.close());
    footer.appendChild(btnOk);
    return await box.wait("destroy");
  }

  // game/src/dialog/PromptBox.ts
  async function PromptBox_default(message, options = {}) {
    const box = new Box({ title: options.title, height: options.height ?? 175 });
    const messageElem = document.createElement("div");
    messageElem.innerHTML = message.replaceAll(`
`, "<br/>");
    messageElem.style.color = "black";
    messageElem.style.textAlign = "center";
    messageElem.style.padding = "15px 5px";
    box.content.appendChild(messageElem);
    const footer = document.createElement("div");
    footer.style.width = "100%";
    footer.style.position = "absolute";
    footer.style.bottom = "15px";
    footer.style.display = "flex";
    footer.style.justifyContent = "column";
    footer.style.flexDirection = "column";
    footer.style.alignItems = "center";
    footer.style.left = "0";
    box.content.appendChild(footer);
    const input = document.createElement("input");
    input.style.width = "80%";
    input.style.marginBottom = "10px";
    input.placeholder = options.placeholder ?? "";
    footer.appendChild(input);
    const btnOk = document.createElement("button");
    btnOk.textContent = options.btnText ?? "OK";
    btnOk.style.width = "80%";
    btnOk.addEventListener("click", () => box.close());
    footer.appendChild(btnOk);
    input.focus();
    await box.wait("destroy");
    return input.value;
  }

  // game/src/screen/Authorization.ts
  var Authorization = class extends Screen {
    constructor() {
      super("Auth");
      App_default.title = "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const logo = document.createElement("label");
      logo.textContent = "\u0411\u0430\u0444\u0438\u044F \u043E\u043D\u043B\u0430\u0439\u043D";
      header.appendChild(logo);
      const div = document.createElement("div");
      div.style.textAlign = "center";
      div.style.padding = "10px";
      this.element.appendChild(div);
      const title = document.createElement("h3");
      title.textContent = `\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F`;
      div.appendChild(title);
      const email = document.createElement("input");
      email.placeholder = "e-mail \u0438\u043B\u0438 \u043D\u0438\u043A";
      div.appendChild(email);
      div.appendChild(document.createElement("br"));
      const password = document.createElement("input");
      password.placeholder = "\u041F\u0430\u0440\u043E\u043B\u044C";
      password.type = "password";
      password.autocomplete = "off";
      password.readOnly = true;
      password.style.marginTop = "5px";
      password.onfocus = () => password.readOnly = false;
      div.appendChild(password);
      div.appendChild(document.createElement("br"));
      const forgetPass = createElement("div", {
        css: {
          margin: "3px",
          textAlign: "center",
          fontSize: "15px",
          color: "#8888f8",
          textDecoration: "underline",
          cursor: "pointer",
          userSelect: "none"
        },
        html: "\u0417\u0430\u0431\u044B\u043B \u043F\u0430\u0440\u043E\u043B\u044C?"
      });
      forgetPass.onclick = async () => {
        const email2 = await PromptBox_default(`\u0414\u043B\u044F \u0441\u0431\u0440\u043E\u0441\u0430 \u043F\u0430\u0440\u043E\u043B\u044F, \u043F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0432 \u0438\u0433\u0440\u0435 email`, { height: 200 });
        App_default.server.send(PacketDataKeys_default.USER_RESET_PASSWORD, {
          [PacketDataKeys_default.EMAIL]: email2,
          [PacketDataKeys_default.APP_LANGUAGE]: "RUS"
        });
      };
      div.appendChild(forgetPass);
      const btnLogin = document.createElement("button");
      btnLogin.textContent = "\u0412\u043E\u0439\u0442\u0438";
      btnLogin.onclick = async () => {
        await App_default.server.auth.auth({ email: email.value, password: password.value });
      };
      div.appendChild(btnLogin);
      const btnReg = document.createElement("button");
      btnReg.textContent = "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F";
      btnReg.onclick = async () => {
        await App_default.server.auth.signUp({ email: email.value, password: password.value });
      };
      div.appendChild(btnReg);
      const text = document.createElement("p");
      text.innerHTML = `
\u041C\u044B \u043D\u0435 \u0441\u043E\u0431\u0438\u0440\u0430\u0435\u043C \u0434\u0430\u043D\u043D\u044B\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u043E\u0432.<br/>
\u041D\u0430\u0448 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u043A\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0442 <a href="https://github.com/lumik0/bafiaonline">Github</a><br/>
<br/>
`;
      div.appendChild(text);
      if (isMobile()) {
        const btnCloseGame = document.createElement("button");
        btnCloseGame.textContent = "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0438\u0433\u0440\u0443";
        btnCloseGame.addEventListener("click", () => App_default.win.close());
        div.appendChild(btnCloseGame);
      }
      this.on("message", (json) => {
        if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_RESET_PASSWORD_SENDED) {
          MessageBox_default(`\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u043F\u0438\u0441\u044C\u043C\u043E \u043D\u0430 \u0441\u0431\u0440\u043E\u0441 \u043F\u0430\u0440\u043E\u043B\u044F`);
        } else if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_WITH_EMAIL_NOT_EXISTS) {
          MessageBox_default(`\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u0441 \u0442\u0430\u043A\u0438\u043C email \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0432\u044B \u0437\u0430\u0431\u044B\u043B\u0438 \u0441\u0432\u043E\u0439 email?`);
        } else if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USTMR) {
          MessageBox_default(`\u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0441\u0431\u0440\u043E\u0441 \u043F\u0430\u0440\u043E\u043B\u044F \u043F\u043E\u0441\u043B\u0435 ${json[PacketDataKeys_default.USRSFR]} \u0441\u0435\u043A\u0443\u043D\u0434`);
        }
      });
    }
  };

  // game/src/dialog/ConfirmBox.ts
  async function ConfirmBox_default(message, options = {}) {
    let result = null;
    const box = new Box({ title: options.title ?? "\u041F\u041E\u0414\u0422\u0412\u0415\u0420\u0416\u0414\u0415\u041D\u0418\u0415", height: options.height, canCloseAnywhere: false });
    const messageElem = document.createElement("div");
    messageElem.innerHTML = message.replaceAll(`
`, "<br/>");
    messageElem.style.color = "black";
    messageElem.style.textAlign = "center";
    messageElem.style.padding = "15px 5px";
    box.content.appendChild(messageElem);
    const footer = document.createElement("div");
    footer.style.width = "100%";
    footer.style.position = "absolute";
    footer.style.bottom = "15px";
    footer.style.display = "flex";
    footer.style.justifyContent = "center";
    footer.style.left = "0";
    box.content.appendChild(footer);
    const btnYes = document.createElement("button");
    btnYes.textContent = options.btnYes ?? "\u0414\u0410";
    btnYes.style.width = "45%";
    btnYes.style.marginRight = "2px";
    btnYes.addEventListener("click", () => {
      result = true;
      box.close();
    });
    footer.appendChild(btnYes);
    const btnNo = document.createElement("button");
    btnNo.textContent = options.btnNo ?? "\u041D\u0415\u0422";
    btnNo.style.width = "45%";
    btnYes.style.marginLeft = "2px";
    btnNo.addEventListener("click", () => {
      result = false;
      box.close();
    });
    footer.appendChild(btnNo);
    await box.wait("destroy");
    return result;
  }

  // core/src/utils/md5.ts
  var import_js_md5 = __toESM(require_js_md5());
  function md5salt(string, salt = "azxsw", iterations = 5) {
    let result = string;
    for (let i = 0; i < iterations; i++) {
      result = (0, import_js_md5.default)(result + salt);
    }
    return result;
  }

  // game/src/component/Component.ts
  function generateSafeUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    const pattern = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return pattern.replace(/[xy]/g, (c) => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  var Component = class extends Events {
    constructor(uuid = generateSafeUUID()) {
      super();
      this.uuid = uuid;
      this.id = App_default.components.length;
      App_default.components.push(this);
      this.elem = document.createElement("div");
      App_default.element.appendChild(this.elem);
      wait(50).then(() => {
        App_default.on("resize", (e) => this.emit("resize", e)).key(`component_${uuid}`);
        App_default.on("keydown", (e) => this.emit("keydown", e)).key(`component_${uuid}`);
        App_default.on("keyup", (e) => this.emit("keyup", e)).key(`component_${uuid}`);
        App_default.on("click", (e) => this.emit("click", e)).key(`component_${uuid}`);
        App_default.on("contextmenu", (e) => this.emit("contextmenu", e)).key(`component_${uuid}`);
        App_default.server.on("message", (data) => this.emit("message", data)).key(`component_${uuid}`);
      });
    }
    id;
    elem;
    destroy() {
      this.emit("destroy");
      this.removeAllEvents();
      App_default.removeByKey(`component_${this.uuid}`);
      App_default.server.removeByKey(`component_${this.uuid}`);
      App_default.components.splice(this.id, 1);
      App_default.element.removeChild(this.elem);
      this.elem.remove();
    }
  };

  // game/src/component/ContextMenu.ts
  var ContextMenu = class extends Component {
    constructor(menu = [], event) {
      super();
      this.menu = menu;
      this.event = event;
      event.preventDefault();
      const zoom = getZoom();
      const winZoom = App_default.zoom;
      const elem = document.createElement("div");
      elem.style.position = "fixed";
      elem.style.display = "flex";
      elem.style.flexDirection = "column";
      elem.style.visibility = "hidden";
      elem.style.left = "0px";
      elem.style.top = "0px";
      for (let i = 0; i < menu.length; i++) {
        const btn = menu[i];
        const e = document.createElement("button");
        e.style.borderRadius = i == 0 && menu.length > 1 ? "7px 7px 0 0" : i > 0 && i == menu.length - 1 ? "0 0 7px 7px" : menu.length == 1 ? "7px" : "0";
        e.textContent = btn;
        e.onclick = () => this.result = btn;
        e.oncontextmenu = (e2) => e2.preventDefault();
        elem.appendChild(e);
      }
      this.elem.appendChild(elem);
      const rect = elem.getBoundingClientRect();
      const menuW = rect.width / zoom;
      const menuH = rect.height / zoom;
      let x = event.pageX / winZoom / zoom;
      let y = event.pageY / winZoom / zoom;
      const screenW = window.innerWidth / winZoom / zoom;
      const screenH = window.innerHeight / winZoom / zoom;
      if (x + menuW > screenW) x -= menuW;
      if (y + menuH > screenH) y -= menuH;
      elem.style.left = x + "px";
      elem.style.top = y + "px";
      elem.style.visibility = "visible";
      this.on("click", async () => {
        await wait(0);
        this.destroy();
      });
      this.on("contextmenu", async () => {
        await wait(0);
        this.destroy();
      });
    }
    result;
    waitForResult() {
      return new Promise(async (res, rej) => {
        await this.wait("destroy");
        res(this.result);
      });
    }
  };

  // core/users.json
  var users_default = {
    user_62c9b5ac181e3eda808psq: "dev"
  };

  // game/src/screen/History.ts
  var History = class extends Screen {
    constructor() {
      super("History");
      App_default.title = "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0433\u0440";
      this.element.style.overflow = "hidden";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const titleElem = document.createElement("label");
      titleElem.textContent = "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0433\u0440";
      header.appendChild(titleElem);
      this.on("back", () => {
        App_default.screen = new Dashboard();
      });
      this.init();
    }
    async init() {
      if (!await fs_default.existsFile(`${App_default.config.path}/history.json`))
        await fs_default.writeFile(`${App_default.config.path}/history.json`, JSON.stringify({ rooms: [] }));
      const history2 = JSON.parse(await fs_default.readFile(`${App_default.config.path}/history.json`));
      const div = document.createElement("div");
      div.style.textAlign = "center";
      div.style.overflowY = "overlay";
      div.style.height = App_default.height - 100 + "px";
      this.element.appendChild(div);
      for (let i = 0; i < history2.rooms.length; i++) {
        const room = history2.rooms[i];
        try {
          let status = 2, statusText = "";
          const myRole = room.playersData[App_default.user.playerObjectId].role;
          const mafia = room.playersStat.m;
          const mir = room.playersStat.c;
          if (i == history2.rooms.length - 1) {
            console.log(room);
            console.log(mafia, mir, myRole);
          }
          if (mafia > mir) {
            status = isMafia(myRole) ? 0 : 1;
          } else if (mir > mafia) {
            status = isMafia(myRole) ? 1 : 0;
          } else {
            statusText = "\u041D\u0438\u0447\u044C\u044F";
          }
          const elem = Rooms.getRoomElement({
            isHistory: true,
            created: room.createdAt,
            data: room,
            status,
            statusText,
            [PacketDataKeys_default.OBJECT_ID]: `${i}`,
            [PacketDataKeys_default.TITLE]: room.title,
            [PacketDataKeys_default.MAX_PLAYERS]: room.maxPlayers,
            [PacketDataKeys_default.MIN_PLAYERS]: room.minPlayers,
            [PacketDataKeys_default.MIN_LEVEL]: room.minLevel,
            [PacketDataKeys_default.PLAYERS_NUM]: Object.keys(room.playersData).length,
            [PacketDataKeys_default.ROOM_STATUS]: 2,
            [PacketDataKeys_default.SELECTED_ROLES]: room.selectedRoles
          });
          div.appendChild(elem.elem);
        } catch {
        }
      }
    }
  };

  // game/src/command/CommandManager.ts
  var CommandManager = class {
    commands = /* @__PURE__ */ new Set();
    register(command) {
      this.commands.add(command);
    }
    unregister(command) {
      return this.commands.delete(command);
    }
    executeCommand(input) {
      input = input.substring(input.startsWith("/") ? 1 : 0);
      const args = input.split(" ");
      if (this.hasCommand(args[0])) {
        this.run(input);
        return true;
      } else {
        return false;
      }
    }
    hasCommand(name) {
      for (const cmd of this.commands) {
        if (cmd.aliases.includes(name)) return true;
      }
      return false;
    }
    getCommand(name) {
      for (const cmd of this.commands) {
        if (cmd.aliases.includes(name)) return cmd;
      }
      return null;
    }
    run(input) {
      input = input.substring(input.startsWith("/") ? 1 : 0);
      const args = input.split(" ");
      return this.getCommand(args[0])?.run(args.slice(1));
    }
    async runAsync(input) {
      input = input.substring(input.startsWith("/") ? 1 : 0);
      const args = input.split(" ");
      for (const cmd of this.commands) {
        if (cmd.aliases.includes(args[0])) {
          return await cmd.run(args.slice(1));
        }
      }
    }
  };
  var CommandManager_default = new CommandManager();

  // game/src/screen/Room.ts
  function isMafia(role) {
    return [4 /* MAFIA */, 9 /* BARMAN */, 6 /* TERRORIST */, 11 /* INFORMER */].includes(role);
  }
  var Room = class extends Screen {
    constructor(roomObjectId, options = {}) {
      super("Room");
      this.roomObjectId = roomObjectId;
      this.options = options;
      if (typeof options.sendRoomEnter != "boolean") options.sendRoomEnter = true;
      if (options.isHistory) {
        this.isHistory = true;
        this.status = 3;
        this.title = options.data.title;
        this.playersData = options.data.playersData;
        this.playersStat = options.data.playersStat;
        this.selectedRoles = options.data.selectedRoles;
        this.localFirstMessages = options.data.messages;
      }
      App_default.title = "\u041A\u043E\u043C\u043D\u0430\u0442\u0430";
      if (options.isMM) {
        this.title = "\u0421\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C";
        App_default.title = "\u0421\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C";
        this.maxPlayers = 12;
        this.modelType = 1;
      }
      if (options.selectedRoles) {
        this.selectedRoles = options.selectedRoles;
      }
      this.oldAppSettingsData = JSON.parse(JSON.stringify(App_default.settings.data));
      (async () => {
        this.element.style.transition = "background 1s";
        this.element.style.background = `url(${await getBackgroundImg("day3")}) 0% 0% / cover`;
        this.clearMessages = App_default.settings.data.game.clearMessages;
      })();
      this.headerElem = document.createElement("div");
      this.headerElem.className = "header";
      this.element.appendChild(this.headerElem);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      this.headerElem.appendChild(back);
      this.titleElem = document.createElement("label");
      this.titleElem.textContent = ``;
      this.titleElem.style.width = "300px";
      this.titleElem.style.userSelect = "text";
      this.headerElem.appendChild(this.titleElem);
      this.loadingDivElem = document.createElement("div");
      this.loadingDivElem.style.display = "flex";
      this.loadingDivElem.style.justifyContent = "center";
      this.loadingDivElem.style.margin = "15px";
      this.element.appendChild(this.loadingDivElem);
      this.loadingElem = document.createElement("img");
      this.loadingElem.style.textAlign = "center";
      getTexture(`loading/2f.png`).then((e) => this.loadingElem.src = e);
      this.loadingDivElem.appendChild(this.loadingElem);
      this.on("back", () => {
        App_default.screen = this.options.isMM ? new Dashboard() : this.isHistory ? new History() : new Rooms();
      });
      this.init();
    }
    headerElem;
    loadingDivElem;
    loadingElem;
    rotation = 0;
    titleElem;
    gameInfoElem;
    playersListElem;
    rangeZoomElem;
    gamePlayersListElem;
    resizablePLElem;
    messagesElem;
    infoElem;
    emojiPanel;
    input;
    rolesElem;
    meElem;
    yourRoleElem;
    deadImgElem;
    myVoteElem;
    affectedByRolesElem;
    localFirstMessages = [];
    localAffectedByRoles = [];
    clearMessages = true;
    isInitialized = false;
    preInitCallback = () => {
    };
    modelType = 0;
    title = "\u041A\u043E\u043C\u043D\u0430\u0442\u0430";
    maxPlayers = 8;
    minPlayers = 1;
    minLevel = 1;
    isVipEnabled = false;
    selectedRoles = [];
    playerRoles = {};
    status = 0;
    // 0 - регистрация, 2 - подготовка, 3 - игра, 4 - конец игры
    get isGame() {
      return this.status == 3;
    }
    gameDayTime = 0;
    timer = 0;
    playersStat;
    isHistory = false;
    oldAppSettingsData;
    kicks = {};
    usersWaiting = [];
    playersData = {};
    players = [];
    messages = [];
    joinLeaveMessages = {};
    lastMessage;
    tick(dt) {
      if (dt % 2 < 1) return;
      if (this.loadingElem)
        this.loadingElem.style.transform = `rotateZ(${this.rotation % 360}deg)`;
      this.rotation += 30;
    }
    async reconnect() {
      super.reconnect();
      if (this.isHistory) return;
      const self2 = this;
      if (this.options.sendRoomEnter) App_default.server.send(PacketDataKeys_default.ROOM_ENTER, {
        [PacketDataKeys_default.ROOM_PASS]: this.options.password ? md5salt(this.options.password) : "",
        [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId
      });
      let stats;
      if (!this.options.dontWaitForAnswer) {
        const rData = await App_default.server.awaitPacket([PacketDataKeys_default.ROOM_ENTER, PacketDataKeys_default.ROOM_PASSWORD_IS_WRONG_ERROR, PacketDataKeys_default.GAME_STARTED, PacketDataKeys_default.USER_IN_ANOTHER_ROOM, PacketDataKeys_default.USER_USING_DOUBLE_ACCOUNT, PacketDataKeys_default.USER_LEVEL_NOT_ENOUGH, PacketDataKeys_default.USER_KICKED, PacketDataKeys_default.ROOM_CREATED, PacketDataKeys_default.MAXIMUM_PLAYERS], 2e3);
        if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROOM_PASSWORD_IS_WRONG_ERROR) {
          App_default.screen = new Rooms();
          MessageBox_default("\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C!");
          return;
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.GAME_STARTED) {
          App_default.screen = new Rooms();
          MessageBox_default("\u0418\u0433\u0440\u0430 \u0443\u0436\u0435 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C");
          return;
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_IN_ANOTHER_ROOM) {
          App_default.screen = new Rooms();
          MessageBox_default("\u041D\u0435\u043B\u044C\u0437\u044F \u0437\u0430\u0439\u0442\u0438");
          return;
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_LEVEL_NOT_ENOUGH) {
          App_default.screen = new Rooms();
          MessageBox_default("\u0412\u0430\u0448 \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u0438\u0439");
          return;
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_KICKED) {
          App_default.screen = new Rooms();
          MessageBox_default("\u0412\u0430\u0441 \u0432\u044B\u0433\u043D\u0430\u043B\u0438");
          return;
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.MAXIMUM_PLAYERS) {
          App_default.screen = new Rooms();
          MessageBox_default("\u041A\u043E\u043C\u043D\u0430\u0442\u0430 \u043F\u0435\u0440\u0435\u043F\u043E\u043B\u043D\u0435\u043D\u0430");
          return;
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_IS_NOT_VIP) {
          App_default.screen = new Rooms();
          MessageBox_default("\u0422\u043E\u043B\u044C\u043A\u043E VIP \u0438\u0433\u0440\u043E\u043A\u0438 \u043C\u043E\u0433\u0443\u0442 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u0442\u044C\u0441\u044F \u043A VIP \u043A\u043E\u043C\u043D\u0430\u0442\u0435");
          return;
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROOM_CREATED) {
        } else if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROOM_STATISTICS) {
          stats = rData;
        } else if (rData[PacketDataKeys_default.TYPE] != PacketDataKeys_default.ROOM_ENTER) {
          App_default.screen = new Rooms();
          MessageBox_default("\u041E\u0448\u0438\u0431\u043A\u0430.. " + JSON.stringify(rData));
          return;
        }
        const roomData = rData[PacketDataKeys_default.ROOM];
        if (roomData && roomData[PacketDataKeys_default.OBJECT_ID] && typeof roomData[PacketDataKeys_default.ROOM_MODEL_TYPE] == "number") {
          this.roomObjectId = roomData[PacketDataKeys_default.OBJECT_ID];
          this.modelType = roomData[PacketDataKeys_default.ROOM_MODEL_TYPE];
          this.title = roomData[PacketDataKeys_default.TITLE];
          this.maxPlayers = roomData[PacketDataKeys_default.MAX_PLAYERS];
          this.minPlayers = roomData[PacketDataKeys_default.MIN_PLAYERS];
          this.minLevel = roomData[PacketDataKeys_default.MIN_LEVEL];
          this.isVipEnabled = roomData[PacketDataKeys_default.VIP_ENABLED];
          this.selectedRoles = roomData[PacketDataKeys_default.SELECTED_ROLES];
          this.status = roomData[PacketDataKeys_default.STATUS];
          this.gameDayTime = roomData[PacketDataKeys_default.DAYTIME];
        }
      }
      App_default.server.send(PacketDataKeys_default.CREATE_PLAYER, {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token,
        [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId,
        [PacketDataKeys_default.ROOM_MODEL_TYPE]: this.modelType
      });
      if (!stats) stats = await App_default.server.awaitPacket(PacketDataKeys_default.ROOM_STATISTICS);
      function preInit() {
        const rs = stats[PacketDataKeys_default.ROOM_STATISTICS];
        if (self2.messagesElem) {
          self2.messages = [];
          self2.messagesElem.innerHTML = "";
          for (const m of rs[PacketDataKeys_default.MESSAGES])
            wait(50).then(() => self2.addMessage(m, false));
        } else {
          self2.localFirstMessages = rs[PacketDataKeys_default.MESSAGES];
        }
        self2.players = rs[PacketDataKeys_default.PLAYERS];
        self2.titleElem.textContent = `${self2.title} (${self2.players.length}/${self2.maxPlayers})`;
        if (rs[PacketDataKeys_default.GAME_STATUS]) {
          self2.status = rs[PacketDataKeys_default.GAME_STATUS][PacketDataKeys_default.STATUS];
          self2.gameDayTime = rs[PacketDataKeys_default.GAME_STATUS][PacketDataKeys_default.DAYTIME];
          self2.timer = rs[PacketDataKeys_default.GAME_STATUS][PacketDataKeys_default.TIMER];
        }
        if (self2.status == 3) {
          if (rs[PacketDataKeys_default.PLAYERS]) {
            let i = 0;
            for (const pl of rs[PacketDataKeys_default.PLAYERS]) {
              const u = pl[PacketDataKeys_default.PLAYER_USER];
              const uo = u[PacketDataKeys_default.PLAYER_OBJECT_ID];
              const username = u[PacketDataKeys_default.USERNAME];
              if (!self2.playersData[uo]) self2.playersData[uo] = {};
              self2.playersData[uo].index = i;
              self2.playersData[uo].username = username;
              i++;
            }
          }
          if (rs[PacketDataKeys_default.PLAYERS_DATA]) {
            let i = 0;
            for (const pl of rs[PacketDataKeys_default.PLAYERS_DATA]) {
              const uo = pl[PacketDataKeys_default.PLAYER_OBJECT_ID];
              const index = self2.playersData[uo] ? self2.playersData[uo].index : i;
              const username = self2.playersData[uo] ? self2.playersData[uo].username : "no nickname";
              self2.playersData[uo] = {
                index,
                username,
                alive: pl[PacketDataKeys_default.ALIVE] ?? true,
                affectedByRoles: pl[PacketDataKeys_default.AFFECTED_BY_ROLES] ?? [],
                isDayActionUsed: pl[PacketDataKeys_default.IS_DAY_ACTION_USED],
                isNightActionAlternative: pl[PacketDataKeys_default.IS_NIGHT_ACTION_ALTERNATIVE],
                isNightActionUsed: pl[PacketDataKeys_default.IS_NIGHT_ACTION_USED],
                userObjectId: uo,
                playerObjectId: uo,
                role: pl[PacketDataKeys_default.ROLE],
                vote: pl[PacketDataKeys_default.VOTE] ?? 0
              };
              i++;
            }
          }
        } else {
          self2.infoElem.innerHTML = `\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F`;
          self2.updatePlayersWaiting(rs[PacketDataKeys_default.PLAYERS]);
        }
      }
      if (this.isInitialized) preInit();
      else this.preInitCallback = preInit;
    }
    getPlayerDataFromPUO(puo) {
      for (const uo in this.playersData) {
        const pl = this.playersData[uo];
        if (pl.playerObjectId == puo)
          return pl;
      }
      return null;
    }
    me() {
      return this.playersData[App_default.user.playerObjectId];
    }
    async init() {
      const rData = await this.reconnect();
      this.loadingDivElem.remove();
      if (!this.isHistory) this.on("message", async (data) => {
        if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_USING_DOUBLE_ACCOUNT) {
          App_default.screen = new Rooms();
          MessageBox_default(`\u0412 \u0434\u0430\u043D\u043D\u043E\u0439 \u043A\u043E\u043C\u043D\u0430\u0442\u0435 \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u0438\u0433\u0440\u043E\u043A, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D \u043A \u0442\u043E\u043C\u0443 \u0436\u0435 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044E, \u0447\u0442\u043E \u0438 \u0432\u044B

  \u0412\u0435\u0440\u043E\u044F\u0442\u043D\u043E \u0432\u044B \u0438 \u044D\u0442\u043E\u0442 \u0438\u0433\u0440\u043E\u043A \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0435 \u043E\u0431\u0449\u0443\u044E \u0442\u043E\u0447\u043A\u0443 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0441\u0435\u0442\u0438 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442

  \u0415\u0441\u043B\u0438 \u0432\u044B \u0445\u043E\u0442\u0438\u0442\u0435 \u0438\u0433\u0440\u0430\u0442\u044C \u0441 \u0434\u0430\u043D\u043D\u044B\u043C \u0438\u0433\u0440\u043E\u043A\u043E\u043C \u0432 \u043E\u0434\u043D\u043E\u0439 \u043A\u043E\u043C\u043D\u0430\u0442\u0435 - \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u0443 \u0441 \u043F\u0430\u0440\u043E\u043B\u0435\u043C \u0438\u043B\u0438 \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432\u044B \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u043A\u0430\u0436\u0434\u044B\u0439 \u043A \u0441\u0432\u043E\u0435\u0439 \u0442\u043E\u0447\u043A\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u0438\u043B\u0438 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u043C \u0434\u0430\u043D\u043D\u044B\u043C`, { height: 360 });
          return;
        }
        if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.MESSAGE) {
          this.addMessage(data[PacketDataKeys_default.MESSAGE]);
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USERS && !this.isGame) {
          this.updatePlayersWaiting(data[PacketDataKeys_default.USERS]);
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ADD_PLAYER && !this.isGame) {
          this.players.push(data[PacketDataKeys_default.PLAYER]);
          this.updatePlayersWaiting(this.players);
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.REMOVE_PLAYER && !this.isGame) {
          this.players = this.players.filter((e) => e[PacketDataKeys_default.PLAYER_USER][PacketDataKeys_default.PLAYER_OBJECT_ID] !== data[PacketDataKeys_default.PLAYER_OBJECT_ID]);
          this.updatePlayersWaiting(this.players);
        } else if (typeof data[PacketDataKeys_default.TIMER] == "number" && typeof data[PacketDataKeys_default.TYPE] == "undefined" && !this.isGame) {
          if (this.status == 2) {
            this.infoElem.textContent = noXSS(`\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 ${data[PacketDataKeys_default.TIMER]}`);
          } else {
            this.infoElem.textContent = noXSS(`\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u043D\u0451\u0442\u0441\u044F \u0447\u0435\u0440\u0435\u0437 ${data[PacketDataKeys_default.TIMER]}`);
          }
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.PLAYERS_STAT) {
          this.playersStat = data;
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.GAME_STATUS) {
          this.status = data[PacketDataKeys_default.GAME_STATUS][PacketDataKeys_default.STATUS];
          this.timer = data[PacketDataKeys_default.GAME_STATUS][PacketDataKeys_default.TIMER];
          if (this.status == 0) {
            this.infoElem.textContent = noXSS(`\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F`);
          }
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROOM_STATISTICS) {
          if (data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.GAME_STATUS]) {
            this.status = data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.GAME_STATUS][PacketDataKeys_default.STATUS];
            this.timer = data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.GAME_STATUS][PacketDataKeys_default.TIMER];
          }
          if (data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.PLAYER_ROLES]) {
            this.playerRoles = data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.PLAYER_ROLES];
          }
          if (this.status == 3) {
            if (data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.PLAYERS]) {
              let i = 0;
              for (const pl of data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.PLAYERS]) {
                const u = pl[PacketDataKeys_default.PLAYER_USER];
                const uo = pl[PacketDataKeys_default.OBJECT_ID];
                const puo = u[PacketDataKeys_default.PLAYER_OBJECT_ID];
                const username = u[PacketDataKeys_default.USERNAME];
                if (!this.playersData[puo]) this.playersData[puo] = {};
                this.playersData[puo].index = i;
                this.playersData[puo].username = username;
                this.playersData[puo].playerObjectId = puo;
                i++;
              }
            }
            if (data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.PLAYERS_DATA]) {
              for (const pl of data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.PLAYERS_DATA]) {
                const puo = pl[PacketDataKeys_default.PLAYER_OBJECT_ID];
                const pu = this.getPlayerDataFromPUO(puo);
                if (pu) {
                  pu.affectedByRoles = pl[PacketDataKeys_default.AFFECTED_BY_ROLES];
                  if (typeof pl[PacketDataKeys_default.ALIVE] == "boolean") pu.alive = pl[PacketDataKeys_default.ALIVE];
                  pu.isDayActionUsed = pl[PacketDataKeys_default.IS_DAY_ACTION_USED];
                  pu.isNightActionAlternative = pl[PacketDataKeys_default.IS_NIGHT_ACTION_ALTERNATIVE];
                  pu.isNightActionUsed = pl[PacketDataKeys_default.IS_NIGHT_ACTION_USED];
                  if (typeof pl[PacketDataKeys_default.ROLE] == "number") pu.role = pl[PacketDataKeys_default.ROLE];
                  if (typeof pl[PacketDataKeys_default.VOTE] == "number") pu.vote = pl[PacketDataKeys_default.VOTE];
                }
              }
              this.updatePlayersGame();
            }
          }
          if (this.isGame) {
            if (this.clearMessages) {
              this.messages = [];
              this.lastMessage = {};
              this.messagesElem.innerHTML = "";
            }
            for (const m of data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.MESSAGES]) this.addMessage(m, false);
            this.initGame();
            if (this.status == 3)
              this.updatePlayersGame();
          } else {
            this.updatePlayersWaiting(data[PacketDataKeys_default.ROOM_STATISTICS][PacketDataKeys_default.PLAYERS]);
          }
          if (this.status == 4) {
            if (App_default.settings.data.game.saveHistory) {
              if (!await fs_default.existsFile(`${App_default.config.path}/history.json`))
                await fs_default.writeFile(`${App_default.config.path}/history.json`, JSON.stringify({ rooms: [] }));
              const history2 = JSON.parse(await fs_default.readFile(`${App_default.config.path}/history.json`));
              history2.rooms.unshift({
                messages: this.messages,
                playersStat: this.playersStat,
                playersData: this.playersData,
                modelType: this.modelType,
                title: this.title,
                maxPlayers: this.maxPlayers,
                minPlayers: this.minPlayers,
                minLevel: this.minLevel,
                isVipEnabled: this.isVipEnabled,
                selectedRoles: this.selectedRoles,
                gameDayTime: this.gameDayTime,
                isMM: this.options.isMM,
                createdAt: Date.now()
              });
              await fs_default.writeFile(`${App_default.config.path}/history.json`, JSON.stringify(history2));
              App_default.logger.info(`Saved`);
            }
          }
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROLES) {
          for (const pl of data[PacketDataKeys_default.ROLES]) {
            const uo = pl[PacketDataKeys_default.USER_OBJECT_ID];
            const role = pl[PacketDataKeys_default.ROLE];
            if (this.playersData[uo])
              this.playersData[uo].role = role;
            else
              this.playersData[uo] = { role };
          }
          this.updatePlayersGame();
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.GAME_FINISHED) {
          this.status = 3;
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.PLAYER_ROLES) {
          for (const pl of data[PacketDataKeys_default.PLAYER_ROLES]) {
            const puo = pl[PacketDataKeys_default.PLAYER_OBJECT_ID];
            const role = pl[PacketDataKeys_default.ROLE];
            if (this.playersData[puo])
              this.playersData[puo].role = role;
          }
        } else if (data[PacketDataKeys_default.TYPE] == data[PacketDataKeys_default.KICK_USER]) {
          const kicker = data[PacketDataKeys_default.KICK_USER_OBJECT_ID];
          const puo = data[PacketDataKeys_default.PLAYER_OBJECT_ID];
          const timer = data[PacketDataKeys_default.TIMER];
          this.kicks[puo] = timer;
        }
      });
      this.rolesElem = document.createElement("div");
      this.rolesElem.style.display = "flex";
      this.rolesElem.style.width = "100%";
      this.rolesElem.style.marginRight = "10px";
      this.rolesElem.style.flexDirection = "row-reverse";
      this.rolesElem.style.alignItems = "center";
      for (const r of this.selectedRoles) {
        const img = document.createElement("img");
        getRoleImg(r).then((e) => img.src = e);
        img.width = 25;
        img.height = 35;
        img.onmousedown = (e) => e.preventDefault();
        this.rolesElem.appendChild(img);
      }
      this.headerElem.appendChild(this.rolesElem);
      App_default.title = `\u041A\u043E\u043C\u043D\u0430\u0442\u0430: ${this.title}`;
      this.titleElem.innerHTML = noXSS(this.title);
      this.infoElem = document.createElement("div");
      this.infoElem.className = "black";
      this.infoElem.style.textAlign = "center";
      this.infoElem.style.margin = "5px 0";
      this.infoElem.innerHTML = `\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F`;
      this.element.appendChild(this.infoElem);
      this.playersListElem = document.createElement("div");
      this.playersListElem.style.overflow = "overlay";
      this.playersListElem.style.margin = "5px 1px";
      this.playersListElem.style.outline = "2px solid #c0c0c0";
      this.playersListElem.style.borderRadius = "3px";
      this.playersListElem.style.background = "rgba(255,255,255,.5)";
      this.element.appendChild(this.playersListElem);
      const miniSettingsPLElem = document.createElement("div");
      miniSettingsPLElem.style.width = "100%";
      let isDown = false;
      this.rangeZoomElem = document.createElement("input");
      this.rangeZoomElem.style.display = "none";
      this.rangeZoomElem.style.width = "100%";
      this.rangeZoomElem.type = "range";
      this.rangeZoomElem.min = "25";
      this.rangeZoomElem.max = "50";
      this.rangeZoomElem.value = this.oldAppSettingsData.game.zoomPL * 25 + "";
      this.rangeZoomElem.onmousedown = () => isDown = true;
      this.rangeZoomElem.onmouseup = () => isDown = false;
      this.rangeZoomElem.onmousemove = () => {
        if (!isDown) return;
        const zoom = parseInt(this.rangeZoomElem.value) / 25;
        App_default.settings.data.game.zoomPL = zoom;
        this.gamePlayersListElem.style.zoom = zoom + "";
      };
      miniSettingsPLElem.appendChild(this.rangeZoomElem);
      this.playersListElem.appendChild(miniSettingsPLElem);
      this.gamePlayersListElem = document.createElement("div");
      this.gamePlayersListElem.style.height = "155px";
      this.gamePlayersListElem.style.display = "flex";
      this.gamePlayersListElem.style.flexWrap = "wrap";
      this.gamePlayersListElem.style.flexDirection = "column";
      this.gamePlayersListElem.style.zoom = "1";
      this.playersListElem.appendChild(this.gamePlayersListElem);
      this.resizablePLElem = document.createElement("div");
      this.resizablePLElem.style.margin = "2px";
      this.resizablePLElem.style.cursor = "e-resize";
      this.resizablePLElem.style.float = "right";
      this.resizablePLElem.style.width = "5px";
      this.resizablePLElem.style.display = "none";
      this.resizablePLElem.onmousedown = (event) => {
        const el = this.playersListElem;
        const zoom = getZoom();
        const startX = event.clientX / zoom;
        const startWidth = el.clientWidth;
        const minWidth = 5;
        function moveHandler(e) {
          const currX = e.clientX / zoom;
          let newWidth = startWidth;
          newWidth = Math.max(minWidth, startWidth - (currX - startX));
          e.stopPropagation?.();
          e.preventDefault?.();
          el.style.width = newWidth + "px";
        }
        function upHandler(e) {
          App_default.settings.data.game.widthPL = parseInt(el.style.width.replace("px", ""));
          document.removeEventListener("mousemove", moveHandler, true);
          document.removeEventListener("mouseup", upHandler, true);
          e.stopPropagation?.();
        }
        document.addEventListener("mousemove", moveHandler, true);
        document.addEventListener("mouseup", upHandler, true);
        event.stopPropagation?.();
        event.preventDefault?.();
      };
      this.element.appendChild(this.resizablePLElem);
      this.gameInfoElem = createElement("div", {
        css: {
          height: "125px",
          margin: "5px 10px",
          outline: "2px solid #c0c0c0",
          borderRadius: "3px",
          background: "rgba(255,255,255,.5)",
          display: "none"
        }
      });
      this.element.appendChild(this.gameInfoElem);
      this.messagesElem = createElement("div", {
        css: {
          height: App_default.height - (isMobile() ? 295 : 275) + "px",
          textAlign: "center",
          overflowX: "hidden",
          overflowY: "overlay",
          margin: "10px 10px 5px 10px",
          outline: "2px solid #c0c0c0",
          borderRadius: "3px",
          background: "rgba(255,255,255,.5)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start"
        }
      });
      this.element.appendChild(this.messagesElem);
      for (const m of this.localFirstMessages) wait(50).then(() => this.addMessage(m, false));
      const footer = createElement("div", {
        css: {
          display: "flex",
          flexDirection: "column",
          width: "100%"
        },
        appendTo: this.element
      });
      const footer2 = createElement("div", {
        css: {
          display: "flex",
          width: "100%"
        },
        appendTo: footer
      });
      let lastValue = "";
      this.input = document.createElement("input");
      this.input.className = "input-chat";
      this.input.type = `text`;
      this.input.placeholder = `\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435`;
      this.input.addEventListener("keydown", (e) => {
        if (e.key == "Enter" && this.input.value != "") {
          const msg = this.input.value;
          this.input.value = "";
          this.sendMessage(msg);
        }
      });
      this.input.addEventListener("input", (e) => {
        const value = this.input.value;
        const oldValue = lastValue || "";
        lastValue = value;
        if (value.length > oldValue.length && value.endsWith(" ") && !oldValue.endsWith(" ")) {
          const match = value.match(/(?:^|\s)@(\d+)\s$/);
          if (match) {
            const number = match[1];
            const playerName = this.getPlayer((parseInt(number) - 1).toString());
            if (playerName) {
              const hasSpaceBefore = value.match(/\s@\d+\s$/) ? " " : "";
              const newValue = value.replace(/(?:^|\s)@\d+\s$/, `${hasSpaceBefore}[${playerName[PacketDataKeys_default.USER][PacketDataKeys_default.USERNAME]}] `);
              this.input.value = newValue;
              lastValue = newValue;
              this.input.setSelectionRange(newValue.length, newValue.length);
            }
          }
        }
      });
      this.emojiPanel = createElement("div", {
        css: {
          display: "none"
        },
        appendTo: footer
      });
      for (const e of ["sm1", "sm2", "sm3", "sm4", "sm5", "sm6"]) {
        const img = createElement("img", {
          width: 50,
          height: 50,
          css: {},
          appendTo: this.emojiPanel
        });
        getTexture(`emoji/${e}.png`).then((e2) => img.src = e2);
        img.onclick = () => {
          insertAtCaret(this.input, `:${e}:`);
        };
      }
      const emojiBtn = createElement("img", {
        width: isMobile() ? 40 : 25,
        height: isMobile() ? 40 : 25,
        css: {},
        appendTo: footer2
      });
      getTexture("emoji/sm1.png").then((e) => emojiBtn.src = e);
      emojiBtn.onclick = () => {
        this.emojiPanel.style.display = this.emojiPanel.style.display == "none" ? "block" : "none";
        this.#changeHeightMessagesElem();
      };
      this.on("keydown", (e) => e.key == "Enter" && this.input.focus());
      footer2.appendChild(this.input);
      this.on("resize", () => {
        this.#changeHeightMessagesElem();
      }).key("waiting");
      this.isInitialized = true;
      this.preInitCallback();
      if (this.isGame) this.initGame();
      this.setTimeout("scroll messages", () => {
        this.messagesElem.scrollTop = this.messagesElem.scrollHeight;
      }, 500);
    }
    #changeHeightMessagesElem() {
      const ch = this.emojiPanel.style.display == "block" ? 60 : 0;
      if (this.isGame) {
        this.messagesElem.style.height = App_default.height - (isMobile() ? 245 : 225) - ch + "px";
        this.playersListElem.style.height = App_default.height - (isMobile() ? 110 : 90) - ch + "px";
        this.resizablePLElem.style.height = App_default.height - (isMobile() ? 110 : 90) - ch + "px";
      } else {
        this.messagesElem.style.height = App_default.height - (isMobile() ? 295 : 275) - ch + "px";
      }
    }
    async initGame() {
      console.log("\u0437\u0430\u043F\u0443\u0441\u043A \u0438\u0433\u0440\u044B..");
      try {
        this.element.removeChild(this.infoElem);
      } catch {
      }
      this.removeByKey("waiting");
      this.playersListElem.style.float = "right";
      this.playersListElem.style.flexFlow = "column wrap";
      this.playersListElem.style.overflowX = "hidden";
      this.playersListElem.style.overflowY = "overlay";
      this.playersListElem.style.width = (isMobile() ? 115 : this.oldAppSettingsData.game.widthPL) + "px";
      this.playersListElem.style.height = App_default.height - (isMobile() ? 100 : 80) + "px";
      this.gamePlayersListElem.style.flexDirection = "row";
      this.gamePlayersListElem.style.alignContent = "flex-start";
      this.gamePlayersListElem.style.justifyContent = "center";
      this.gamePlayersListElem.style.zoom = this.oldAppSettingsData.game.zoomPL + "";
      this.gamePlayersListElem.innerHTML = "";
      if (!isMobile()) this.rangeZoomElem.style.display = "block";
      this.resizablePLElem.style.display = "block";
      this.#changeHeightMessagesElem();
      this.changeDayTime();
      this.on("resize", () => {
        this.#changeHeightMessagesElem();
      });
      const yourRoleMsg = `\u0412\u044B<br/>${RuRoles[this.me()?.role - 1]}`;
      let timer, mafia, mir, giveUpButton;
      {
        this.gameInfoElem.innerHTML = "";
        this.gameInfoElem.style.display = "flex";
        {
          const nick = createElement("span", {
            html: (App_default.settings.data.game.showIndexPl ? `<span style="color: #ab1457; font-weight: bold">${(this.me()?.index ?? 0) + 1}</span> ` : "") + noXSS(App_default.user.username),
            className: "black",
            css: {
              fontSize: "smaller",
              textAlign: "center",
              filter: App_default.settings.data.hideUsername ? "blur(5px)" : "",
              padding: "1px"
            }
          });
          const myRoleImg = createElement("img", {
            width: 50,
            height: 70
          });
          getRoleImg(this.me()?.role ?? 1).then((e) => myRoleImg.src = e);
          myRoleImg.onmousedown = (e) => e.preventDefault();
          this.deadImgElem = createElement("img", {
            width: 50,
            height: 70,
            css: {
              display: "none",
              position: "absolute",
              top: "56px"
            }
          });
          getTexture(`roles/dead.png`).then((e) => this.deadImgElem.src = e);
          this.deadImgElem.onmousedown = (e) => e.preventDefault();
          this.myVoteElem = createElement("div", {
            css: {
              background: "red",
              color: "white",
              padding: "3px",
              position: "absolute",
              right: "5px",
              bottom: "20px",
              borderRadius: "3px",
              display: "none"
            }
          });
          this.affectedByRolesElem = createElement("div", {
            css: {
              width: "125px",
              height: "100%",
              marginLeft: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              flexWrap: "wrap",
              alignContent: "center"
            }
          });
          this.meElem = createElement("div", {
            css: {
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "0 5px"
            }
          });
          this.yourRoleElem = createElement("span", {
            html: yourRoleMsg,
            className: "black",
            css: {
              fontSize: "smaller",
              textAlign: "center",
              padding: "1px"
            }
          });
          this.meElem.appendChild(this.yourRoleElem);
          this.meElem.appendChild(myRoleImg);
          this.meElem.appendChild(this.deadImgElem);
          this.meElem.appendChild(this.myVoteElem);
          this.meElem.appendChild(nick);
          this.gameInfoElem.appendChild(this.meElem);
          this.gameInfoElem.appendChild(this.affectedByRolesElem);
        }
        {
          const playersStat = this.playersStat ?? {};
          const div = createElement("div", {
            css: {
              display: "flex",
              alignItems: "flex-end",
              flexDirection: "column",
              padding: "8px",
              width: "100%"
            }
          });
          mafia = document.createElement("div");
          mafia.textContent = noXSS(`\u041C\u0430\u0444\u0438\u044F: ${playersStat[PacketDataKeys_default.MAFIA_ALL]} | ${playersStat[PacketDataKeys_default.MAFIA_ALIVE]}`);
          mafia.style.color = "#940000";
          mir = document.createElement("div");
          mir.textContent = noXSS(`\u041C\u0438\u0440\u043D\u044B\u0435: ${playersStat[PacketDataKeys_default.CIVILIAN_ALL]} | ${playersStat[PacketDataKeys_default.CIVILIAN_ALIVE]}`);
          mir.style.color = "#186400";
          timer = createElement("div", {
            text: noXSS(this.timer + ""),
            className: "black",
            css: {
              float: "right",
              fontSize: "35px",
              fontWeight: "bold",
              marginTop: "15px",
              padding: "5px"
            }
          });
          giveUpButton = createElement("button", {
            text: "\u0421\u0434\u0430\u0442\u044C\u0441\u044F",
            css: {
              marginTop: "-5px",
              display: "none"
            }
          });
          {
            const role = this.me()?.role ?? 1;
            if (this.players.length > 7 && this.me()?.alive && (playersStat[PacketDataKeys_default.MAFIA_ALIVE] == 1 && isMafia(role) || playersStat[PacketDataKeys_default.CIVILIAN_ALIVE] == 1 && !isMafia(role))) {
              timer.style.marginTop = "0";
              giveUpButton.style.display = "block";
            }
          }
          giveUpButton.onclick = () => App_default.server.send(PacketDataKeys_default.GIVE_UP, { [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId });
          div.appendChild(mafia);
          div.appendChild(mir);
          div.appendChild(timer);
          div.appendChild(giveUpButton);
          this.gameInfoElem.appendChild(div);
        }
      }
      if (!this.me()?.alive) {
        this.deadImgElem.style.top = this.yourRoleElem.clientHeight + 1 + "px";
        this.deadImgElem.style.display = "flex";
      }
      this.on("message", (data) => {
        if (!this.isGame) return;
        if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.GAME_DAYTIME) {
          this.gameDayTime = data[PacketDataKeys_default.DAYTIME];
          timer.textContent = noXSS(data[PacketDataKeys_default.TIMER]);
          this.changeDayTime();
          this.updatePlayersGame();
        } else if (typeof data[PacketDataKeys_default.TIMER] == "number") {
          this.timer = data[PacketDataKeys_default.TIMER];
          timer.textContent = noXSS(data[PacketDataKeys_default.TIMER]);
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.PLAYERS_STAT) {
          mafia.textContent = noXSS(`\u041C\u0430\u0444\u0438\u044F: ${data[PacketDataKeys_default.MAFIA_ALL]} | ${data[PacketDataKeys_default.MAFIA_ALIVE]}`);
          mir.textContent = noXSS(`\u041C\u0438\u0440\u043D\u044B\u0435: ${data[PacketDataKeys_default.CIVILIAN_ALL]} | ${data[PacketDataKeys_default.CIVILIAN_ALIVE]}`);
          wait(500).then(() => {
            const role = this.me()?.role ?? 1;
            if (this.players.length > 7 && this.me()?.alive && (data[PacketDataKeys_default.MAFIA_ALIVE] == 1 && isMafia(role) || data[PacketDataKeys_default.CIVILIAN_ALIVE] == 1 && !isMafia(role))) {
              giveUpButton.style.display = "block";
              timer.style.marginTop = "0";
            }
          });
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_DATA) {
          for (const pl of data[PacketDataKeys_default.PLAYERS_DATA]) {
            const uo = pl[PacketDataKeys_default.PLAYER_OBJECT_ID];
            if (pl[PacketDataKeys_default.AFFECTED_BY_ROLES]) this.playersData[uo].affectedByRoles = pl[PacketDataKeys_default.AFFECTED_BY_ROLES];
            if (typeof pl[PacketDataKeys_default.ALIVE] == "boolean") this.playersData[uo].alive = pl[PacketDataKeys_default.ALIVE];
            if (typeof pl[PacketDataKeys_default.IS_DAY_ACTION_USED] == "boolean") this.playersData[uo].isDayActionUsed = pl[PacketDataKeys_default.IS_DAY_ACTION_USED];
            if (typeof pl[PacketDataKeys_default.IS_NIGHT_ACTION_ALTERNATIVE] == "boolean") this.playersData[uo].isNightActionAlternative = pl[PacketDataKeys_default.IS_NIGHT_ACTION_ALTERNATIVE];
            if (typeof pl[PacketDataKeys_default.IS_NIGHT_ACTION_USED] == "boolean") this.playersData[uo].isNightActionUsed = pl[PacketDataKeys_default.IS_NIGHT_ACTION_USED];
            if (typeof pl[PacketDataKeys_default.ROLE] == "number") this.playersData[uo].role = pl[PacketDataKeys_default.ROLE];
            if (typeof pl[PacketDataKeys_default.VOTE] == "number") this.playersData[uo].vote = pl[PacketDataKeys_default.VOTE];
          }
          this.updatePlayersGame();
        }
      });
      this.updatePlayersGame();
    }
    async changeDayTime() {
      if (this.gameDayTime < 2) {
        this.element.style.background = `url(${await getBackgroundImg("night3")}) 0% 0% / cover`;
        this.playersListElem.style.outline = "2px solid rgb(128 128 128)";
        this.playersListElem.style.background = "rgb(255 255 255 / 30%)";
        this.gameInfoElem.style.outline = "2px solid rgb(128 128 128)";
        this.gameInfoElem.style.background = "rgb(255 255 255 / 30%)";
        this.messagesElem.style.outline = "2px solid rgb(128 128 128)";
        this.messagesElem.style.background = "rgb(255 255 255 / 30%)";
      } else {
        this.element.style.background = `url(${await getBackgroundImg("day3")}) 0% 0% / cover`;
        this.playersListElem.style.outline = "2px solid #c0c0c0";
        this.playersListElem.style.background = "rgba(255,255,255,.5)";
        this.gameInfoElem.style.outline = "2px solid #c0c0c0";
        this.gameInfoElem.style.background = "rgba(255,255,255,.5)";
        this.messagesElem.style.outline = "2px solid #c0c0c0";
        this.messagesElem.style.background = "rgba(255,255,255,.5)";
      }
      for (const uo in this.playersData) {
        this.playersData[uo].didAutoClick = false;
      }
    }
    updatePlayersGame() {
      const self2 = this;
      const entries = Object.entries(this.playersData).sort(([, a], [, b]) => (a.index ?? 0) - (b.index ?? 0));
      this.gamePlayersListElem.innerHTML = "";
      for (const [uo, pl] of entries) {
        if (pl.username == App_default.user.username) {
          if (this.deadImgElem && this.deadImgElem.style.display == "none" && this.yourRoleElem && pl.alive == false) {
            this.deadImgElem.style.top = this.yourRoleElem.clientHeight + 1 + "px";
            this.deadImgElem.style.display = "flex";
            if (App_default.settings.data.game.showYouDiedMessage) MessageBox_default(`\u0412\u044B \u0443\u043C\u0435\u0440\u043B\u0438`);
          }
          if (this.myVoteElem) {
            if (typeof this.playersData[uo].vote == "number" && this.playersData[uo].vote > 0) {
              this.myVoteElem.style.display = "block";
              this.myVoteElem.textContent = noXSS(this.playersData[uo].vote + "");
            } else {
              this.myVoteElem.style.display = "none";
            }
          }
          if (this.affectedByRolesElem) {
            const affectedByRole = this.playersData[uo].affectedByRoles ?? [];
            const equal = this.localAffectedByRoles.length == affectedByRole.length && this.localAffectedByRoles.every((value, index) => value == affectedByRole[index]);
            if (!equal) {
              this.localAffectedByRoles = affectedByRole;
              this.affectedByRolesElem.innerHTML = "";
              for (const r of affectedByRole) {
                const img = document.createElement("img");
                getRoleImg(r).then((e) => img.src = e);
                img.width = 28;
                img.height = 40;
                img.style.opacity = "0";
                img.style.animation = "1s opacity linear alternate infinite";
                img.style.margin = "1px";
                img.onmousedown = (e) => e.preventDefault();
                this.affectedByRolesElem.appendChild(img);
              }
            }
          }
          continue;
        }
        async function contextMenuCallback(event) {
          const cx = new ContextMenu(
            self2.playersData[uo].alive ? typeof self2.playersData[uo].role == "number" ? ["\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C", `${self2.playersData[uo].autoClick ? "\u2705 " : ""}\u0410\u0432\u0442\u043E-\u043A\u043B\u0438\u043A`] : ["\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C", `${self2.playersData[uo].autoClick ? "\u2705 " : ""}\u0410\u0432\u0442\u043E-\u043A\u043B\u0438\u043A`, `\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0440\u043E\u043B\u044C`] : ["\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C"],
            event
          );
          const result = await cx.waitForResult();
          if (result == `${self2.playersData[uo].autoClick ? "\u2705 " : ""}\u0410\u0432\u0442\u043E-\u043A\u043B\u0438\u043A`) {
            self2.playersData[uo].autoClick = !self2.playersData[uo].autoClick;
            self2.playersData[uo].didAutoClick = false;
          } else if (result == "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C") {
            ProfileInfo(uo);
          } else if (result == "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0440\u043E\u043B\u044C") {
            const cx2 = new ContextMenu(["\u0423\u0431\u0440\u0430\u0442\u044C", ...RuRoles], event);
            const r = await cx2.waitForResult();
            if (r == "\u0423\u0431\u0440\u0430\u0442\u044C") self2.playersData[uo].preRole = void 0;
            else self2.playersData[uo].preRole = RuRoles.findIndex((e) => e == r) + 1;
            self2.updatePlayersGame();
          }
        }
        const username = pl.username ?? "?";
        const div = createElement("div", {
          css: {
            margin: "2px",
            width: "50px",
            textAlign: "center",
            position: "relative",
            height: "100px"
          }
        });
        const nick = document.createElement("div");
        nick.innerHTML = (App_default.settings.data.game.showIndexPl ? `<span style="color: #ab1457; font-weight: bold">${(pl.index ?? 0) + 1}</span> ` : "") + noXSS(username);
        nick.className = "black";
        nick.style.wordBreak = "break-all";
        nick.style.textAlign = "center";
        nick.style.fontSize = "12px";
        nick.style.marginTop = "-2px";
        const roleImg = document.createElement("img");
        getRoleImg(pl.role ?? 0).then((e) => roleImg.src = e);
        roleImg.width = 50;
        roleImg.height = 70;
        roleImg.oncontextmenu = contextMenuCallback;
        roleImg.onmousedown = (e) => e.preventDefault();
        div.appendChild(roleImg);
        if (!pl.alive) {
          const deadImg = document.createElement("img");
          getTexture(`roles/dead.png`).then((e) => deadImg.src = e);
          deadImg.width = 50;
          deadImg.height = 70;
          deadImg.style.position = "absolute";
          deadImg.style.left = "0";
          deadImg.onmousedown = (e) => e.preventDefault();
          deadImg.onclick = () => this.addNickToInput(username);
          deadImg.oncontextmenu = contextMenuCallback;
          div.appendChild(deadImg);
        }
        if (!pl.role && typeof pl.preRole == "number" && pl.preRole > -1) {
          const roleImg2 = document.createElement("img");
          getTexture(`roles/a${pl.preRole}.png`).then((e) => roleImg2.src = e).catch(console.error);
          roleImg2.width = 50;
          roleImg2.height = 70;
          roleImg2.style.position = "absolute";
          roleImg2.style.left = "0";
          roleImg2.onmousedown = (e) => e.preventDefault();
          roleImg2.onclick = () => this.addNickToInput(username);
          roleImg2.oncontextmenu = contextMenuCallback;
          div.appendChild(roleImg2);
        }
        if (typeof this.playersData[uo].vote == "number" && this.playersData[uo].vote > 0) {
          const vote = this.playersData[uo].vote;
          const text = document.createElement("div");
          text.style.background = "red";
          text.style.color = "white";
          text.style.padding = "3px";
          text.style.position = "absolute";
          text.style.right = "0";
          text.style.bottom = "30px";
          text.style.borderRadius = "3px";
          text.textContent = noXSS(vote + "");
          div.appendChild(text);
        }
        let action = "";
        let isActionUsed = this.gameDayTime < 2 ? this.me()?.isNightActionUsed : this.me()?.isDayActionUsed;
        when(this.me()?.role).case(2 /* DOCTOR */, () => this.gameDayTime == 1 && (() => {
          action = "_2";
        })()).case(3 /* SHERIFF */, () => this.gameDayTime == 1 && (() => {
          action = "check";
          if (this.playersData[uo].affectedByRoles?.includes(3)) action = "";
        })()).case(4 /* MAFIA */, () => this.gameDayTime == 1 && (() => {
          action = "kill";
          if (isMafia(this.playersData[uo].role ?? 1)) action = "";
        })()).case(5 /* LOVER */, () => this.gameDayTime == 0 && (() => {
          action = "_5";
        })()).case(6 /* TERRORIST */, () => this.gameDayTime == 3 && (() => {
          action = "_6";
        })()).case(7 /* JOURNALIST */, () => this.gameDayTime == 1 && (() => {
          if (!this.playersData[uo].affectedByRoles?.includes(7)) action = "_7";
        })()).case(8 /* BODYGUARD */, () => this.gameDayTime == 2 && (() => {
          action = "_8";
          if (this.me()?.isNightActionUsed) action = "";
        })()).case(9 /* BARMAN */, () => this.gameDayTime == 1 && (() => {
          action = "_9";
        })()).case(11 /* INFORMER */, () => this.gameDayTime == 1 && (() => {
          action = "check";
          if (this.playersData[uo].affectedByRoles?.includes(11)) action = "";
        })());
        if (action == "" && this.gameDayTime == 3) action = "kill";
        if (this.gameDayTime == 1 && this.me()?.affectedByRoles?.includes(9) && !this.me()?.isNightActionUsed) isActionUsed = false;
        if (action != "" && this.status == 3 && !isActionUsed && this.me()?.alive && this.playersData[uo].alive) {
          const actionImg = document.createElement("img");
          getTexture(`roles/${action}.png`).then((e) => actionImg.src = e);
          actionImg.width = 50;
          actionImg.height = 70;
          actionImg.style.position = "absolute";
          actionImg.style.left = "0";
          actionImg.style.transform = "scale(0)";
          actionImg.style.animation = ".7s zoom-in-zoom-out alternate infinite";
          actionImg.style.animationDelay = ".3s";
          actionImg.onmousedown = (e) => e.preventDefault();
          actionImg.oncontextmenu = contextMenuCallback;
          actionImg.onclick = roleImg.onclick = () => {
            App_default.server.send(PacketDataKeys_default.ROLE_ACTION, {
              [PacketDataKeys_default.PLAYER_OBJECT_ID]: uo,
              [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId,
              [PacketDataKeys_default.ROOM_MODEL_TYPE]: this.modelType
            });
            this.updatePlayersGame();
          };
          div.appendChild(actionImg);
          if (this.playersData[uo].autoClick && !this.playersData[uo].didAutoClick) {
            this.playersData[uo].didAutoClick = true;
            actionImg.click();
          }
        } else {
          roleImg.onclick = () => this.addNickToInput(username);
        }
        div.appendChild(nick);
        this.gamePlayersListElem.appendChild(div);
      }
    }
    addMessage(m, deleteFirst = false) {
      const text = m[PacketDataKeys_default.TEXT];
      const type = m[PacketDataKeys_default.MESSAGE_TYPE];
      const sticker = m[PacketDataKeys_default.MESSAGE_STICKER];
      const user = m[PacketDataKeys_default.USER];
      const objectId = m[PacketDataKeys_default.OBJECT_ID] ?? "";
      const playerObjectId = user ? user[PacketDataKeys_default.PLAYER_OBJECT_ID] : "";
      this.messages.push(m);
      if ((user ? type != 2 && type != 3 && type != 13 && type != 24 && type != 25 : user) || type == 11 || type == 26 || type == 29) {
        const username = user ? user[PacketDataKeys_default.USERNAME] : type == 26 ? "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440" : type == 29 ? "\u0411\u0430\u0440\u043C\u0435\u043D" : type == 11 ? "\u041C\u0430\u0444\u0438\u044F" : "???";
        let msgText = text || "", color = "black";
        if (type == 10 || type == 14) {
          msgText = `\u0413\u043E\u043B\u043E\u0441\u0443\u0435\u0442 \u0437\u0430 [${text}]`;
          color = "#186400";
        } else if (type == 12) {
          color = `#545454`;
        } else if (type == 28) {
          msgText = `\u0421\u0434\u0430\u043B\u0441\u044F`;
          color = "#940000";
        } else if (type == 18) {
          color = "#113B81";
        } else if (type == 19) {
          msgText = `\u0412\u0417\u041E\u0420\u0412\u0410\u041B \u0438\u0433\u0440\u043E\u043A\u0430 [${text}]`;
          color = "#940000";
        } else if (type == 22) {
          msgText = `\u0412\u0417\u041E\u0420\u0412\u0410\u041B \u0438\u0433\u0440\u043E\u043A\u0430 [${text}], \u043D\u043E \u0438\u0433\u0440\u043E\u043A \u0431\u044B\u043B \u043F\u043E\u0434 \u0437\u0430\u0449\u0438\u0442\u043E\u0439 \u0442\u0435\u043B\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435\u043B\u044F \u0438 \u043E\u0441\u0442\u0430\u043B\u0441\u044F \u0436\u0438\u0432!`;
          color = "#940000";
        }
        if (this.lastMessage && this.lastMessage.divM && this.lastMessage.username == username) {
          const msg = document.createElement("span");
          let cleanText = users_default[objectId] == "dev" ? msgText : noXSS(msgText);
          if (msgText.includes(`[${App_default.user.username}]`))
            cleanText = cleanText.replaceAll(`${App_default.user.username}`, `<span style="${App_default.settings.data.hideUsername ? "filter: blur(5px)" : "color: #ab1457; font-weight: bold"}">${App_default.user.username}</span>`);
          processEmojis(msg, cleanText);
          msg.style.color = color;
          msg.style.userSelect = "text";
          this.lastMessage.divM.appendChild(msg);
        } else {
          const div = document.createElement("div");
          div.style.display = "flex";
          div.style.textAlign = "left";
          const avatar = document.createElement("img");
          getAvatarImg(user ?? username).then((e) => avatar.src = e);
          avatar.style.borderRadius = "100%";
          avatar.width = 35;
          avatar.height = 35;
          avatar.style.margin = "5px";
          avatar.onmousedown = (e) => e.preventDefault();
          avatar.onclick = () => ProfileInfo(playerObjectId);
          const divM = document.createElement("div");
          divM.style.display = "flex";
          divM.style.flexDirection = "column";
          divM.style.justifyContent = "center";
          divM.style.wordBreak = "auto-phrase";
          const nick = document.createElement("span");
          if (this.isGame && App_default.settings.data.game.showIndexPlChat) {
            const e = createElement("span", { text: (this.playersData[objectId]?.index ?? 0) + 1 + " ", css: { color: "#ab1457", fontWeight: "bold" } });
            nick.appendChild(e);
          }
          createElement("span", { css: { marginLeft: "2px" }, text: user && user[PacketDataKeys_default.VIP] ? username + ` ${user[PacketDataKeys_default.VIP]}` : username, appendTo: nick });
          if (username == App_default.user.username && App_default.settings.data.hideUsername) nick.style.filter = "blur(5px)";
          nick.style.color = type == 17 ? "#4B4483" : type == 12 ? "#545454" : "black";
          nick.onclick = () => this.addNickToInput(username);
          const msg = document.createElement("span");
          let cleanText = users_default[objectId] == "dev" ? msgText : noXSS(msgText);
          if (msgText.includes(`[${App_default.user.username}]`))
            cleanText = cleanText.replaceAll(`${App_default.user.username}`, `<span style="${App_default.settings.data.hideUsername ? "filter: blur(5px)" : "color: #ab1457; font-weight: bold"}">${App_default.user.username}</span>`);
          processEmojis(msg, cleanText);
          msg.style.color = color;
          msg.style.userSelect = "text";
          div.appendChild(avatar);
          div.appendChild(divM);
          divM.appendChild(nick);
          divM.appendChild(msg);
          this.messagesElem.appendChild(div);
          this.lastMessage = { username, divM };
        }
      } else {
        const div = document.createElement("div");
        const username = user?.[PacketDataKeys_default.USERNAME];
        let msg = text, color = "black", xssAllowed = false, nickElement = `<span style="${username == App_default.user.username && App_default.settings.data.hideUsername ? "filter: blur(5px)" : ""}">${username}</span>`, nick1Element = text && text.split("#").length > 1 ? `<span style="${text.split("#")[0] == App_default.user.username && App_default.settings.data.hideUsername ? "filter: blur(5px)" : ""}">${text.split("#")[0]}</span>` : "", nick2Element = text && text.split("#").length > 1 ? `<span style="${text.split("#")[2] == App_default.user.username && App_default.settings.data.hideUsername ? "filter: blur(5px)" : ""}">${text.split("#")[2]}</span>` : "", nick3Element = m[PacketDataKeys_default.USERNAME] ? `<span style="${m[PacketDataKeys_default.USERNAME]["0"][PacketDataKeys_default.USERNAME] == App_default.user.username && App_default.settings.data.hideUsername ? "filter: blur(5px)" : ""}">${m[PacketDataKeys_default.USERNAME]["0"][PacketDataKeys_default.USERNAME]}</span>` : "";
        if (type == 2) {
          msg = `\u0418\u0433\u0440\u043E\u043A ${nickElement} \u0432\u043E\u0448\u0451\u043B`;
          color = "#186400";
          xssAllowed = true;
        } else if (type == 3) {
          msg = `\u0418\u0433\u0440\u043E\u043A ${nickElement} \u0432\u044B\u0448\u0435\u043B`;
          color = "#940000";
          xssAllowed = true;
        } else if (type == 4) {
          msg = `\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C`;
        } else if (type == 7) {
          msg = `\u041D\u0430\u0441\u0442\u0443\u043F\u0438\u043B\u0430 \u043D\u043E\u0447\u044C [\u041C\u0410\u0424\u0418\u042F \u0432 \u0447\u0430\u0442\u0435]`;
          color = "#113B81";
        } else if (type == 6) {
          msg = `[\u041C\u0410\u0424\u0418\u042F \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u0436\u0435\u0440\u0442\u0432\u0443]`;
          color = "#113B81";
        } else if (type == 8) {
          msg = `\u041D\u0430\u0441\u0442\u0443\u043F\u0438\u043B \u0434\u0435\u043D\u044C [\u0412\u0441\u0435 \u043E\u0431\u0449\u0430\u044E\u0442\u0441\u044F \u0432 \u0447\u0430\u0442\u0435]`;
          color = "#C46509";
        } else if (type == 9) {
          msg = `[\u0412\u0441\u0435 \u0433\u043E\u043B\u043E\u0441\u0443\u044E\u0442] \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0433\u0440\u043E\u043A\u0430, \u043A\u043E\u0442\u043E\u0440\u043E\u0433\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u043A\u0430\u0437\u043D\u0438\u0442\u044C`;
          color = "#C46509";
        } else if (type == 13) {
          msg = `\u0418\u0433\u0440\u043E\u043A [${nickElement}] \u0423\u0411\u0418\u0422!`;
          color = "#940000";
          xssAllowed = true;
        } else if (type == 15) {
          msg = `\u0412\u0421\u0415 \u043E\u0441\u0442\u0430\u043B\u0438\u0441\u044C \u0436\u0438\u0432\u044B. \u041D\u0438\u043A\u043E\u0433\u043E \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0431\u0438\u0442\u044C!`;
          color = "#186400";
        } else if (type == 16) {
          msg = `\u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430! \u041C\u0418\u0420\u041D\u042B\u0415 \u0416\u0418\u0422\u0415\u041B\u0418 \u043F\u043E\u0431\u0435\u0434\u0438\u043B\u0438!`;
          color = "#186400";
        } else if (type == 17) {
          msg = `\u0418\u0433\u0440\u0430 \u043E\u043A\u043E\u043D\u0447\u0435\u043D\u0430! \u041C\u0410\u0424\u0418\u042F \u043F\u043E\u0431\u0435\u0434\u0438\u043B\u0430!`;
          color = "#186400";
        } else if (type == 20) {
          msg = `\u0421\u0420\u041E\u0427\u041D\u0410\u042F \u041D\u041E\u0412\u041E\u0421\u0422\u042C!
\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442 \u043F\u0440\u043E\u0432\u0435\u043B \u0440\u0430\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u043A\u0430\u043A \u043E\u043A\u0430\u0437\u0430\u043B\u043E\u0441\u044C \u0438\u0433\u0440\u043E\u043A\u0438 [${nick1Element}] \u0438 [${nick2Element}] \u0438\u0433\u0440\u0430\u044E\u0442 \u0432 \u043E\u0434\u043D\u043E\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0435`;
          color = "#940000";
          xssAllowed = true;
        } else if (type == 21) {
          msg = `\u0421\u0420\u041E\u0427\u041D\u0410\u042F \u041D\u041E\u0412\u041E\u0421\u0422\u042C!
\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442 \u043F\u0440\u043E\u0432\u0435\u043B \u0440\u0430\u0441\u0441\u043B\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0438 \u043A\u0430\u043A \u043E\u043A\u0430\u0437\u0430\u043B\u043E\u0441\u044C \u0438\u0433\u0440\u043E\u043A\u0438 [${nick1Element}] \u0438 [${nick2Element}] \u0438\u0433\u0440\u0430\u044E\u0442 \u0432 \u0440\u0430\u0437\u043D\u044B\u0445 \u043A\u043E\u043C\u0430\u043D\u0434\u0430\u0445`;
          color = "#940000";
          xssAllowed = true;
        } else if (type == 22) {
          msg = `\u043D\u0438\u0447\u044C\u044F`;
        } else if (type == 24) {
          console.log(this.kicks);
          console.log(typeof this.kicks[m[PacketDataKeys_default.USERNAME]["0"][PacketDataKeys_default.PLAYER_OBJECT_ID]] == "number");
          msg = `[${nickElement}] \u043D\u0430\u0447\u0430\u043B \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u0435, \u0447\u0442\u043E\u0431\u044B \u0432\u044B\u0433\u043D\u0430\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430 [${nick3Element}] \u0438\u0437 \u043A\u043E\u043C\u043D\u0430\u0442\u044B
`;
          xssAllowed = true;
          color = "#113B81";
        } else if (type == 25) {
          msg = `\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u043E\u0441\u044C \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u0435. \u0412\u044B\u0433\u043D\u0430\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430?
\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u0430\u043D\u0438\u044F:
\u0414\u0430: ${text.split("|")[0]} | \u041D\u0435\u0442: ${text.split("|")[1]}`;
          color = "#113B81";
        }
        div.innerHTML = (xssAllowed ? msg : noXSS(msg)).replaceAll(`
`, "<br/>");
        div.style.color = color;
        div.style.userSelect = "text";
        div.style.margin = "3px";
        this.messagesElem.appendChild(div);
        this.lastMessage = {};
        if (type == 24 && m[PacketDataKeys_default.USERNAME]) {
          const t = this.kicks[m[PacketDataKeys_default.USERNAME]["0"][PacketDataKeys_default.PLAYER_OBJECT_ID]] ?? 10;
          const timer = document.createElement("p");
          timer.style.margin = "5px";
          timer.textContent = `${t}`;
          div.appendChild(timer);
          const btnYes = document.createElement("button");
          btnYes.textContent = `\u0412\u044B\u0433\u043D\u0430\u0442\u044C`;
          btnYes.onclick = () => {
            App_default.server.send(PacketDataKeys_default.KICK_USER_VOTE, {
              [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId,
              [PacketDataKeys_default.VOTE]: true
            });
            btnYes.disabled = true;
            btnNo.disabled = true;
          };
          div.appendChild(btnYes);
          const btnNo = document.createElement("button");
          btnNo.textContent = `\u041D\u0435 \u0432\u044B\u0433\u043E\u043D\u044F\u0442\u044C`;
          btnNo.onclick = () => {
            App_default.server.send(PacketDataKeys_default.KICK_USER_VOTE, {
              [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId,
              [PacketDataKeys_default.VOTE]: false
            });
            btnYes.disabled = true;
            btnNo.disabled = true;
          };
          div.appendChild(btnNo);
          this.on("message", (data) => {
            if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.KICK_TIMER) {
              const t2 = data[PacketDataKeys_default.TIMER];
              timer.textContent = t2;
              if (t2 < 1) {
                delete this.kicks[m[PacketDataKeys_default.USERNAME][0][PacketDataKeys_default.PLAYER_OBJECT_ID]];
                this.removeByKey("kick");
              }
            }
          }).key("kick");
        }
        if (type == 2 || type == 3) {
          if (this.joinLeaveMessages[username])
            this.joinLeaveMessages[username].remove();
          this.joinLeaveMessages[username] = div;
        }
      }
      if (this.messagesElem.scrollHeight - App_default.height - this.messagesElem.scrollTop < 75)
        this.messagesElem.scroll({ top: this.messagesElem.scrollHeight, behavior: "smooth" });
      if (deleteFirst && this.messagesElem.firstElementChild)
        this.messagesElem.removeChild(this.messagesElem.firstElementChild);
    }
    addNickToInput(username) {
      const isFocused = document.activeElement == this.input;
      if (this.input.value.includes(`[${username}]`)) {
        const posStart = this.input.value.indexOf(`[${username}]`);
        const posEnd = this.input.value.lastIndexOf(`[${username}]`);
        if (posEnd == 0) {
          this.input.value = this.input.value.replace(`[${username}] `, "");
        } else {
          if (this.input.value.substring(0, posStart).endsWith(" "))
            this.input.value = this.input.value.replace(` [${username}] `, "");
          else
            this.input.value = this.input.value.replace(`[${username}]`, "");
        }
      } else {
        if (["", " "].includes(this.input.value.substring((this.input.selectionStart ?? 1) - 1)))
          insertAtCaret(this.input, `[${username}] `);
        else
          insertAtCaret(this.input, ` [${username}] `);
      }
      if (isMobile()) this.input.focus();
    }
    sendMessage(message, options = {}) {
      if (message.startsWith(App_default.settings.data.game.barmanEffect)) {
        const symbols = "?!&@#%^~<>*";
        message = Array.from({ length: [...message].length - 1 }, () => symbols[Math.random() * symbols.length | 0]).join("");
      }
      if (CommandManager_default.executeCommand(message)) return;
      App_default.server.send(PacketDataKeys_default.ROOM_MESSAGE_CREATE, {
        [PacketDataKeys_default.MESSAGE]: {
          [PacketDataKeys_default.MESSAGE_STYLE]: options.messageStyle ?? 0,
          [PacketDataKeys_default.MESSAGE_STICKER]: options.messageSticker ?? false,
          [PacketDataKeys_default.TEXT]: message
        },
        [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId,
        [PacketDataKeys_default.ROOM_MODEL_TYPE]: this.modelType
      });
      this.messagesElem.scroll({ top: this.messagesElem.scrollHeight, behavior: "smooth" });
    }
    updatePlayersWaiting(players) {
      if (this.status == 4 || this.status == 3) return;
      this.usersWaiting = players.map((e) => e[PacketDataKeys_default.OBJECT_ID]);
      this.titleElem.textContent = `${this.title} (${players.length}/${this.maxPlayers})`;
      this.gamePlayersListElem.innerHTML = "";
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const uo = player[PacketDataKeys_default.OBJECT_ID];
        const playerUser = player[PacketDataKeys_default.PLAYER_USER];
        const playerObjectId = playerUser[PacketDataKeys_default.PLAYER_OBJECT_ID];
        const username = playerUser[PacketDataKeys_default.USERNAME];
        const div = document.createElement("div");
        const avatar = document.createElement("img");
        getAvatarImg(playerUser).then((e) => avatar.src = e);
        avatar.style.borderRadius = "100%";
        avatar.width = avatar.height = 25;
        avatar.style.margin = "5px";
        avatar.onmousedown = (e) => e.preventDefault();
        avatar.onclick = () => ProfileInfo(playerObjectId);
        const nick = document.createElement("span");
        createElement("span", { css: { marginLeft: "2px" }, text: playerUser[PacketDataKeys_default.VIP] ? username + ` ${playerUser[PacketDataKeys_default.VIP]}` : username, appendTo: nick });
        if (username == App_default.user.username && App_default.settings.data.hideUsername) nick.style.filter = "blur(5px)";
        nick.className = "black";
        nick.onclick = () => this.addNickToInput(username);
        div.style.display = "flex";
        div.style.textAlign = "left";
        div.style.alignItems = "center";
        div.appendChild(avatar);
        div.appendChild(nick);
        this.gamePlayersListElem.appendChild(div);
      }
    }
    getPlayer(arg) {
      const pl = this.players.find((e) => arg == e[PacketDataKeys_default.USER][PacketDataKeys_default.USERNAME]) || this.players[parseInt(arg)];
      return pl;
    }
    destroy() {
      App_default.server.send(PacketDataKeys_default.REMOVE_PLAYER, {
        [PacketDataKeys_default.ROOM_OBJECT_ID]: this.roomObjectId
      });
      super.destroy();
    }
  };

  // game/src/dialog/LoadingBox.ts
  function LoadingBox_default(options = {}) {
    const box = new Box({ title: options.title ?? "\u0417\u0410\u0413\u0420\u0423\u0417\u041A\u0410", canCloseAnywhere: options.canCloseAnywhere || false, height: 175 });
    const elem = document.createElement("div");
    elem.style.width = "100%";
    elem.style.height = "100%";
    elem.style.padding = "15px 0 0 0";
    elem.style.position = "absolute";
    elem.style.display = "flex";
    elem.style.flexDirection = "column";
    elem.style.alignItems = "center";
    elem.style.left = "0";
    box.content.appendChild(elem);
    const loadingElem = document.createElement("img");
    fs_default.loadImageAsDataURL(`${App_default.config.path}/assets/textures/loading/Tx.png`).then((e) => loadingElem.src = e);
    elem.appendChild(loadingElem);
    const txt = document.createElement("p");
    txt.style.color = "black";
    txt.textContent = options.text ?? "";
    elem.appendChild(txt);
    let rotation = 0;
    box.on("tick", (dt) => {
      if (dt % 2 < 1) return;
      loadingElem.style.transform = `rotateZ(${rotation % 360}deg)`;
      rotation += 30;
    });
    return {
      box,
      changeText(text) {
        txt.textContent = text;
      },
      done() {
        box.close();
      }
    };
  }

  // game/src/screen/RoomCreation.ts
  var RoomCreation = class extends Screen {
    data;
    constructor() {
      super("RoomCreation");
      App_default.title = "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const title = document.createElement("label");
      title.textContent = "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B";
      header.appendChild(title);
      this.on("back", () => {
        App_default.screen = new Rooms();
      });
      this.data = App_default.settings.data.roomCreate;
      this.init();
    }
    createRoom(data) {
      App_default.server.send(PacketDataKeys_default.ROOM_CREATE, {
        [PacketDataKeys_default.TOKEN]: App_default.user.token,
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.ROOM]: {
          [PacketDataKeys_default.TITLE]: data.title,
          [PacketDataKeys_default.DAYTIME]: 0,
          [PacketDataKeys_default.MIN_PLAYERS]: data.minPlayers,
          [PacketDataKeys_default.MAX_PLAYERS]: data.maxPlayers,
          [PacketDataKeys_default.MIN_LEVEL]: data.minLevel,
          [PacketDataKeys_default.SELECTED_ROLES]: data.selectedRoles,
          [PacketDataKeys_default.PASSWORD]: data.password ? md5salt(data.password) : "",
          [PacketDataKeys_default.VIP_ENABLED]: data.vip
        }
      });
      App_default.screen = new Room("", {
        sendRoomEnter: false
      });
    }
    init() {
      const self2 = this;
      const e = document.createElement("div");
      e.style.display = "flex";
      e.style.padding = "10px";
      e.style.justifyContent = "center";
      e.style.flexDirection = "column";
      this.element.appendChild(e);
      function addH(text, { fontSize = 16, margin = "10px" } = {}) {
        const h = document.createElement("p");
        h.style.textAlign = "center";
        h.style.fontSize = fontSize + "px";
        h.style.margin = margin;
        h.innerHTML = text;
        e.appendChild(h);
      }
      function addCheckbox(text, key, image) {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.padding = "3px";
        e.appendChild(div);
        const img = document.createElement("img");
        img.width = 25;
        image.then((e2) => img.src = e2);
        div.appendChild(img);
        const cb = document.createElement("input");
        cb.style.zoom = "1.5";
        cb.type = "checkbox";
        cb.checked = typeof key == "string" ? !!self2.data[key] : self2.data.selectedRoles.includes(key);
        cb.onchange = () => {
          if (typeof key == "string") {
            self2.data[key] = cb.checked;
          } else {
            self2.data.selectedRoles = self2.data.selectedRoles.includes(key) ? self2.data.selectedRoles.filter((v) => v !== key) : [...self2.data.selectedRoles, key];
          }
          console.log(self2.data);
        };
        div.appendChild(cb);
        const span = document.createElement("span");
        span.textContent = text;
        div.appendChild(span);
      }
      function addSlider(type) {
        function attachTooltip(wrapper2, input, getText) {
          const tip = document.createElement("div");
          tip.className = "range-tooltip";
          wrapper2.appendChild(tip);
          function update() {
            const minVal = Number(input.min);
            const maxVal = Number(input.max);
            const val = Number(input.value);
            const width = wrapper2.clientWidth;
            const px = (val - minVal) / (maxVal - minVal) * width / App_default.zoom / getZoom();
            tip.style.left = px + "px";
            tip.textContent = getText();
          }
          input.addEventListener("pointerdown", () => {
            update();
            tip.style.opacity = "1";
          });
          input.addEventListener("input", update);
          function hide() {
            tip.style.opacity = "0";
          }
          input.addEventListener("pointerup", hide);
          input.addEventListener("pointercancel", hide);
          input.addEventListener("pointerleave", hide);
        }
        if (type == "lvl") {
          const wrapper2 = document.createElement("div");
          wrapper2.style.position = "relative";
          e.appendChild(wrapper2);
          const el = document.createElement("input");
          el.style.width = "100%";
          el.type = "range";
          el.min = "1";
          el.max = "13";
          el.value = String(self2.data.minLevel);
          wrapper2.appendChild(el);
          attachTooltip(wrapper2, el, () => `${el.value}`);
          el.oninput = () => {
            self2.data.minLevel = Number(el.value);
          };
          return;
        }
        const wrapper = document.createElement("div");
        wrapper.className = "range-wrapper";
        e.appendChild(wrapper);
        const track = document.createElement("div");
        track.className = "range-track";
        wrapper.appendChild(track);
        const active = document.createElement("div");
        active.className = "range-active";
        wrapper.appendChild(active);
        const min = document.createElement("input");
        const max = document.createElement("input");
        attachTooltip(wrapper, min, () => String(self2.data.minPlayers));
        attachTooltip(wrapper, max, () => String(self2.data.maxPlayers));
        min.type = max.type = "range";
        min.min = max.min = "1";
        min.max = max.max = "21";
        min.value = String(self2.data.minPlayers);
        max.value = String(self2.data.maxPlayers);
        function sync(source) {
          let a = Number(min.value);
          let b = Number(max.value);
          if (a > b) {
            if (source == min) b = a;
            else a = b;
          }
          min.value = String(a);
          max.value = String(b);
          self2.data.minPlayers = a;
          self2.data.maxPlayers = b;
          const width = wrapper.clientWidth;
          const leftPx = (a - 1) / (21 - 1) * width / App_default.zoom / getZoom();
          const rightPx = (b - 1) / (21 - 1) * width / App_default.zoom / getZoom();
          active.style.left = leftPx + "px";
          active.style.width = rightPx - leftPx + "px";
        }
        min.oninput = () => sync(min);
        max.oninput = () => sync(max);
        wrapper.appendChild(min);
        wrapper.appendChild(max);
        sync();
      }
      const roomName = document.createElement("input");
      roomName.placeholder = `\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u043D\u0430\u0442\u044B`;
      roomName.style.width = "100%";
      roomName.value = App_default.settings.data.roomCreate.title;
      roomName.oninput = () => this.data.title = roomName.value;
      e.appendChild(roomName);
      addH(`\u041A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0438\u0433\u0440\u043E\u043A\u043E\u0432`);
      addSlider(`players`);
      addH(`\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u044B`);
      addSlider(`lvl`);
      addH(`\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438`);
      addCheckbox("VIP \u043A\u043E\u043C\u043D\u0430\u0442\u0430", "vip", getTexture(`vip/_u.png`));
      addH(`\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0440\u043E\u043B\u0438`, { margin: "10px 0 5px 0" });
      addH(`\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u043C\u0430\u0444\u0438\u0438`, { fontSize: 13, margin: "5px" });
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u0422\u0435\u0440\u0440\u043E\u0440\u0438\u0441\u0442`, 6, getRoleImg(6 /* TERRORIST */));
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u0411\u0430\u0440\u043C\u0435\u043D`, 9, getRoleImg(9 /* BARMAN */));
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0440`, 11, getRoleImg(11 /* INFORMER */));
      addH(`\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u043C\u0438\u0440\u043D\u044B\u0445 \u0436\u0438\u0442\u0435\u043B\u0435\u0439`, { fontSize: 13, margin: "5px" });
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u0414\u043E\u043A\u0442\u043E\u0440`, 2, getRoleImg(2 /* DOCTOR */));
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u041B\u044E\u0431\u043E\u0432\u043D\u0438\u0446\u0430`, 5, getRoleImg(5 /* LOVER */));
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442`, 7, getRoleImg(7 /* JOURNALIST */));
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u0422\u0435\u043B\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435\u043B\u044C`, 8, getRoleImg(8 /* BODYGUARD */));
      addCheckbox(`\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0440\u043E\u043B\u044C - \u0428\u043F\u0438\u043E\u043D`, 10, getRoleImg(10 /* SPY */));
      const roomPass = document.createElement("input");
      roomPass.placeholder = `\u041F\u0430\u0440\u043E\u043B\u044C (\u041E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u043F\u0443\u0441\u0442\u044B\u043C \u0434\u043B\u044F \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F)`;
      roomPass.style.width = "100%";
      roomPass.value = App_default.settings.data.roomCreate.password;
      roomPass.oninput = () => this.data.password = roomPass.value;
      e.appendChild(roomPass);
      const btnCreate = document.createElement("button");
      btnCreate.textContent = "\u0421\u043E\u0437\u0434\u0430\u0442\u044C";
      btnCreate.onclick = () => this.createRoom(this.data);
      e.appendChild(btnCreate);
    }
    destroy() {
      super.destroy();
      App_default.settings.data.roomCreate = this.data;
    }
  };

  // core/src/utils/format.ts
  function splitSeconds(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds % 86400 / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }
  function getWordForm(number, formsNominative, formsGenitive, caseType = "nominative") {
    const forms = caseType === "genitive" ? formsGenitive : formsNominative;
    if (number % 10 === 1 && number % 100 !== 11) {
      return forms[0];
    }
    if (number % 10 >= 2 && number % 10 <= 4 && (number % 100 < 10 || number % 100 >= 20)) {
      return forms[1];
    }
    return forms[2];
  }
  function formatSeconds(seconds, caseType = "nominative") {
    if (seconds == 0) return "0 \u0441\u0435\u043A\u0443\u043D\u0434";
    const units = splitSeconds(seconds);
    const parts = [];
    const dayFormsNominative = ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"];
    const hourFormsNominative = ["\u0447\u0430\u0441", "\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441\u043E\u0432"];
    const minuteFormsNominative = ["\u043C\u0438\u043D\u0443\u0442\u0430", "\u043C\u0438\u043D\u0443\u0442\u044B", "\u043C\u0438\u043D\u0443\u0442"];
    const secondFormsNominative = ["\u0441\u0435\u043A\u0443\u043D\u0434\u0430", "\u0441\u0435\u043A\u0443\u043D\u0434\u044B", "\u0441\u0435\u043A\u0443\u043D\u0434"];
    const dayFormsGenitive = ["\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439", "\u0434\u043D\u0435\u0439"];
    const hourFormsGenitive = ["\u0447\u0430\u0441\u0430", "\u0447\u0430\u0441\u043E\u0432", "\u0447\u0430\u0441\u043E\u0432"];
    const minuteFormsGenitive = ["\u043C\u0438\u043D\u0443\u0442\u044B", "\u043C\u0438\u043D\u0443\u0442", "\u043C\u0438\u043D\u0443\u0442"];
    const secondFormsGenitive = ["\u0441\u0435\u043A\u0443\u043D\u0434\u0443", "\u0441\u0435\u043A\u0443\u043D\u0434\u044B", "\u0441\u0435\u043A\u0443\u043D\u0434"];
    if (units.days > 0)
      parts.push(`${units.days} ${getWordForm(units.days, dayFormsNominative, dayFormsGenitive, caseType)}`);
    if (units.hours > 0)
      parts.push(`${units.hours} ${getWordForm(units.hours, hourFormsNominative, hourFormsGenitive, caseType)}`);
    if (units.minutes > 0)
      parts.push(`${units.minutes} ${getWordForm(units.minutes, minuteFormsNominative, minuteFormsGenitive, caseType)}`);
    if (units.seconds > 0 || parts.length === 0)
      parts.push(`${units.seconds} ${getWordForm(units.seconds, secondFormsNominative, secondFormsGenitive, caseType)}`);
    return parts.join(" ");
  }
  function format_default(seconds, caseType = "nominative") {
    if (!Number.isInteger(seconds) || seconds < 0) {
      throw new Error("\u0412\u0445\u043E\u0434\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043D\u0435\u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C");
    }
    return formatSeconds(seconds, caseType);
  }
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const pad = (n) => n.toString().padStart(2, "0");
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }

  // game/src/dialog/RoomPlayers.ts
  async function RoomPlayers_default(roomId) {
    const height = 450;
    const box = new Box({ title: "\u0418\u0413\u0420\u041E\u041A\u0418 \u0412 \u041A\u041E\u041C\u041D\u0410\u0422\u0415:", width: 350, height, canCloseAnywhere: true });
    const div = createElement("div", {
      css: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }
    });
    box.content.appendChild(div);
    const list = createElement("div", {
      css: {
        display: "flex",
        flexDirection: "column",
        overflowY: "overlay",
        height: height - 80 + "px",
        width: "100%",
        alignItems: "left"
      }
    });
    div.appendChild(list);
    App_default.server.send(PacketDataKeys_default.GET_PLAYERS, {
      [PacketDataKeys_default.ROOM_OBJECT_ID]: roomId
    });
    const data = await App_default.server.awaitPacket(PacketDataKeys_default.PLAYERS_IN_ROOM);
    for (const pl of data[PacketDataKeys_default.PLAYERS]) {
      const e = createElement("div", {
        css: {
          display: "flex",
          alignItems: "center",
          marginLeft: "10px",
          marginRight: "10px"
        }
      });
      const avatar = createElement("img", {
        css: {
          borderRadius: "100%",
          margin: "5px"
        },
        width: 30,
        height: 30
      });
      getAvatarImg(pl).then((e2) => avatar.src = e2);
      avatar.onclick = () => ProfileInfo(pl[PacketDataKeys_default.PLAYER_OBJECT_ID]);
      const nick = createElement("span", {
        text: noXSS(pl[PacketDataKeys_default.USERNAME]),
        css: {
          width: "99%"
        },
        className: "black"
      });
      const alive = createElement("span", {
        text: pl[PacketDataKeys_default.ALIVE] ? "\u0416\u0438\u0432" : "\u0423\u043C\u0435\u0440",
        css: {
          color: pl[PacketDataKeys_default.ALIVE] ? "#186400" : "#940000"
        },
        className: "black"
      });
      e.appendChild(avatar);
      e.appendChild(nick);
      e.appendChild(alive);
      list.appendChild(e);
    }
    const btnOk = document.createElement("button");
    btnOk.textContent = "\u0412\u041E\u0419\u0422\u0418";
    btnOk.style.width = "80%";
    btnOk.addEventListener("click", () => {
      box.close();
      App_default.screen = new Room(roomId);
    });
    div.appendChild(btnOk);
    await box.wait("destroy");
  }

  // game/src/screen/Rooms.ts
  var Rooms = class _Rooms extends Screen {
    div;
    titleElem;
    search = "";
    constructor() {
      super("Rooms");
      App_default.title = "\u041A\u043E\u043C\u043D\u0430\u0442\u044B";
      this.element.style.overflow = "hidden";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      this.titleElem = document.createElement("label");
      this.titleElem.textContent = "\u041A\u043E\u043C\u043D\u0430\u0442\u044B";
      header.appendChild(this.titleElem);
      this.on("back", () => {
        App_default.screen = new Dashboard();
      });
      this.init();
    }
    async reconnect() {
      super.reconnect();
      this.rooms = [];
      this.updateRooms();
      App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_ROOMS_LIST, {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token
      });
      const data = await App_default.server.awaitPacket(PacketDataKeys_default.ROOMS);
      const rooms = this.getRooms(data[PacketDataKeys_default.ROOMS]);
      for (const room of rooms) this.addRoom(room);
    }
    async init() {
      App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_ROOMS_LIST, {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token
      });
      const data = await App_default.server.awaitPacket(PacketDataKeys_default.ROOMS);
      const filterElem = document.createElement("div");
      filterElem.className = "rooms-filter";
      this.element.appendChild(filterElem);
      {
        const inputSearch = document.createElement("input");
        inputSearch.placeholder = "\u041F\u043E\u0438\u0441\u043A";
        inputSearch.size = 30;
        inputSearch.onchange = inputSearch.onkeyup = () => {
          this.search = inputSearch.value;
          this.updateRooms();
        };
        filterElem.appendChild(inputSearch);
        const updateBtn = document.createElement("button");
        updateBtn.textContent = `\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C`;
        updateBtn.onclick = async () => {
          this.rooms = [];
          this.updateRooms();
          App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_ROOMS_LIST, {
            [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
            [PacketDataKeys_default.TOKEN]: App_default.user.token
          });
          const data2 = await App_default.server.awaitPacket(PacketDataKeys_default.ROOMS);
          const rooms2 = this.getRooms(data2[PacketDataKeys_default.ROOMS]);
          for (const room of rooms2) this.addRoom(room);
        };
        filterElem.appendChild(updateBtn);
        const filterBtn = document.createElement("button");
        filterBtn.textContent = `\u0424\u0438\u043B\u044C\u0442\u0440`;
        filterBtn.onclick = () => {
          MessageBox_default("\u0421\u043A\u043E\u0440\u043E..");
        };
        filterElem.appendChild(filterBtn);
        const sortBtn = document.createElement("button");
        sortBtn.textContent = `\u0421\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0430`;
        sortBtn.onclick = () => {
          MessageBox_default("\u0421\u043A\u043E\u0440\u043E..");
        };
        filterElem.appendChild(sortBtn);
        this.on("keydown", (e) => {
          if (e.ctrlKey && e.key == "f") {
            inputSearch.focus();
            e.preventDefault();
          }
        });
      }
      this.div = document.createElement("div");
      this.div.style.textAlign = "center";
      this.div.style.overflowY = "overlay";
      this.div.style.height = App_default.height - (95 + filterElem.clientHeight) + "px";
      this.element.appendChild(this.div);
      const rooms = this.getRooms(data[PacketDataKeys_default.ROOMS]);
      for (const room of rooms) this.addRoom(room);
      const divBtns = document.createElement("div");
      divBtns.style.textAlign = "center";
      divBtns.style.margin = "3px";
      this.element.appendChild(divBtns);
      const btnCreateRoom = document.createElement("button");
      btnCreateRoom.textContent = "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043E\u043C\u043D\u0430\u0442\u0443";
      btnCreateRoom.style.width = "99%";
      btnCreateRoom.onclick = () => App_default.screen = new RoomCreation();
      divBtns.appendChild(btnCreateRoom);
      this.on("message", (data2) => {
        if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROOM_IN_LOBBY_STATE) {
          this.getRoomByObjectId(data2[PacketDataKeys_default.ROOM_IN_LOBBY_STATE][PacketDataKeys_default.ROOM_OBJECT_ID])?.rils(data2[PacketDataKeys_default.ROOM_IN_LOBBY_STATE]);
          this.updateRooms();
        } else if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.GAME_STATUS_IN_ROOMS_LIST) {
          this.getRoomByObjectId(data2[PacketDataKeys_default.ROOM_OBJECT_ID]).room.status = data2[PacketDataKeys_default.STATUS];
          this.updateRooms();
        } else if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ADD) {
          this.addRoom(data2[PacketDataKeys_default.ROOM]);
          this.updateRooms();
        } else if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.REMOVE) {
          this.getRoomByObjectId(data2[PacketDataKeys_default.ROOM_OBJECT_ID])?.remove();
          this.rooms.splice(this.getRoomIdByObjectId(data2[PacketDataKeys_default.ROOM_OBJECT_ID]), 1);
          this.updateRooms();
        }
      });
      this.on("resize", (e) => {
        this.div.style.height = App_default.height - (85 + filterElem.clientHeight + 5) + "px";
      });
    }
    // <ROOM_OBJECT_ID, data>
    rooms = [];
    roomsId = 0;
    getRoomByObjectId(objectId) {
      return this.rooms.find((e) => e.room[PacketDataKeys_default.OBJECT_ID] == objectId);
    }
    getRoomIdByObjectId(objectId) {
      return this.rooms.findIndex((e) => e.room[PacketDataKeys_default.OBJECT_ID] == objectId);
    }
    getRooms(data) {
      const rooms = data.sort((a, b) => {
        const roomStatusDiff = a[PacketDataKeys_default.ROOM_STATUS] - b[PacketDataKeys_default.ROOM_STATUS];
        if (roomStatusDiff !== 0) return roomStatusDiff;
        const statusDiff = a[PacketDataKeys_default.STATUS] - b[PacketDataKeys_default.STATUS];
        if (statusDiff !== 0) return statusDiff;
        return a[PacketDataKeys_default.MIN_LEVEL] - b[PacketDataKeys_default.MIN_LEVEL];
      });
      const title = `\u041A\u043E\u043C\u043D\u0430\u0442\u044B: (${data.length}/${rooms.length})`;
      this.titleElem.textContent = noXSS(title);
      App_default.title = title;
      return rooms;
    }
    updateRooms() {
      this.div.innerHTML = "";
      let roomsData = [];
      for (let room of this.rooms) roomsData.push(room.room);
      const rooms = this.getRooms(roomsData);
      this.rooms = [];
      for (const room of rooms) {
        this.addRoom(Object.assign({}, room));
      }
    }
    filter(room) {
      if (!room) return false;
      const search = this.search == "" ? true : room[PacketDataKeys_default.TITLE].toLowerCase().includes(this.search.toLowerCase());
      return search;
    }
    static orderRoles = [2, 7, 10, 11, 9, 5, 6, 8];
    static getRoomElement(room) {
      const isHistory = typeof room.isHistory == "boolean" && room.isHistory;
      const isProfileInfo = typeof room[PacketDataKeys_default.SAME_ROOM] == "boolean";
      const objectId = room[PacketDataKeys_default.OBJECT_ID];
      const level = room[PacketDataKeys_default.MIN_LEVEL];
      const myStatus = typeof room.status == "number" ? room.status : isProfileInfo ? 2 : room[PacketDataKeys_default.ROOM_STATUS];
      const statusText = room.statusText;
      const rank = level == 3 ? 2 : level == 5 ? 3 : level == 7 ? 4 : level == 9 ? 5 : level == 11 ? 6 : 1;
      const selectedRoles = room[PacketDataKeys_default.SELECTED_ROLES] ?? [];
      const hasPassword = room[PacketDataKeys_default.PASSWORD];
      const friends = room[PacketDataKeys_default.FRIEND_IN_ROOM];
      let clickType = "";
      let joinCallback = () => {
      };
      let viewRoomPlayersCallback = () => {
      };
      async function join() {
        await new Promise((res) => setTimeout(res, 0));
        if (clickType) {
          viewRoomPlayersCallback();
          RoomPlayers_default(objectId);
          clickType = "";
          return;
        }
        joinCallback();
        if (hasPassword) {
          let password = await PromptBox_default(`\u042D\u0442\u0430 \u043A\u043E\u043C\u043D\u0430\u0442\u0430 \u043F\u043E\u0434 \u0437\u0430\u043C\u043A\u043E\u043C

\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C`, { btnText: `\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C`, placeholder: `\u041F\u0430\u0440\u043E\u043B\u044C`, title: "\u0412\u0412\u0415\u0421\u0422\u0418 \u041F\u0410\u0420\u041E\u041B\u042C", height: 200 });
          if (password == "") return;
          App_default.server.send(PacketDataKeys_default.ROOM_ENTER, {
            [PacketDataKeys_default.ROOM_PASS]: md5salt(password),
            [PacketDataKeys_default.ROOM_OBJECT_ID]: objectId
          });
          const rData = await App_default.server.awaitPacket([PacketDataKeys_default.ROOM_ENTER, PacketDataKeys_default.ROOM_PASSWORD_IS_WRONG_ERROR, PacketDataKeys_default.GAME_STARTED, PacketDataKeys_default.USER_IN_ANOTHER_ROOM, PacketDataKeys_default.USER_USING_DOUBLE_ACCOUNT, PacketDataKeys_default.USER_LEVEL_NOT_ENOUGH, PacketDataKeys_default.USER_KICKED]);
          if (rData[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROOM_PASSWORD_IS_WRONG_ERROR) {
            await MessageBox_default("\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C!");
            join();
            return;
          }
          App_default.screen = new Room(objectId, { password, sendRoomEnter: true });
          return;
        }
        if (isHistory) {
          App_default.screen = new Room(objectId, { isHistory, data: room.data });
        } else {
          App_default.screen = new Room(objectId);
        }
      }
      const div = document.createElement("div");
      div.className = "room";
      const levelImg = document.createElement("img");
      levelImg.className = "room-lvl";
      const title = document.createElement("div");
      title.className = "room-title";
      const status = document.createElement("div");
      status.className = "room-status";
      const btnPlayers = document.createElement("div");
      btnPlayers.className = "room-btn-players";
      if (myStatus == 0) {
        const text = document.createElement("div");
        text.className = "black";
        text.style.textAlign = "center";
        text.style.padding = "5px";
        text.textContent = statusText ?? `\u0412\u044B \u0438\u0433\u0440\u0430\u0435\u0442\u0435 \u0432 \u044D\u0442\u043E\u0439 \u043A\u043E\u043C\u043D\u0430\u0442\u0435`;
        div.appendChild(text);
      } else if (myStatus == 1) {
        const text = document.createElement("div");
        text.className = "black";
        text.style.textAlign = "center";
        text.style.padding = "5px";
        text.textContent = statusText ?? `\u0412\u0430\u0441 \u0443\u0431\u0438\u043B\u0438 \u0432 \u044D\u0442\u043E\u0439 \u043A\u043E\u043C\u043D\u0430\u0442\u0435`;
        div.appendChild(text);
      }
      div.style.background = myStatus == 0 ? "rgb(137 242 165 / 40%)" : myStatus == 1 ? "rgb(255 138 146 / 40%)" : "rgba(200,200,200,.4)";
      if (selectedRoles.length == 0) div.style.height = myStatus < 2 ? "110px" : "80px";
      div.onmouseenter = () => myStatus == 0 ? "rgb(114 202 137 / 40%)" : myStatus == 1 ? "rgb(219 103 111 / 40%)" : div.style.background = "rgba(200,200,200,.3)";
      div.onmouseleave = () => myStatus == 0 ? "rgb(137 242 165 / 40%)" : myStatus == 1 ? "rgb(255 138 146 / 40%)" : div.style.background = "rgba(200,200,200,.4)";
      div.onclick = () => join();
      if (!isProfileInfo) div.oncontextmenu = async (e) => {
        e.preventDefault();
        const joinPl = `\u0417\u0430\u0439\u0442\u0438, \u043A\u043E\u0433\u0434\u0430 ${room[PacketDataKeys_default.MAX_PLAYERS] - 1} \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0431\u0443\u0434\u0435\u0442`;
        const cx = new ContextMenu(isHistory ? ["\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"] : ["\u0417\u0430\u0439\u0442\u0438", joinPl, "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C object id"], e);
        const result = await cx.waitForResult();
        when(result).case(joinPl, async () => {
          const loading = LoadingBox_default({ title: "\u0416\u0414\u0401\u041C", text: `\u041A\u043E\u043B-\u0432\u043E \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0435: ${room[PacketDataKeys_default.PLAYERS_NUM]}`, canCloseAnywhere: true });
          const maxPl = room[PacketDataKeys_default.MAX_PLAYERS];
          App_default.server.on("message", async (data) => {
            if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ROOM_IN_LOBBY_STATE) {
              const oid = data[PacketDataKeys_default.ROOM_IN_LOBBY_STATE][PacketDataKeys_default.ROOM_OBJECT_ID];
              const numPl = data[PacketDataKeys_default.ROOM_IN_LOBBY_STATE][PacketDataKeys_default.PLAYERS_IN_ROOM];
              if (objectId == oid) {
                loading.changeText(`\u041A\u043E\u043B-\u0432\u043E \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0435: ${numPl}`);
                if (maxPl - numPl == 1) {
                  await wait(50);
                  loading.done();
                  join();
                }
              }
            } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.GAME_STATUS_IN_ROOMS_LIST) {
              const oid = data[PacketDataKeys_default.ROOM_IN_LOBBY_STATE][PacketDataKeys_default.ROOM_OBJECT_ID];
              if (objectId == oid) {
                const status2 = data[PacketDataKeys_default.STATUS];
                if (status2 == 2) {
                  loading.done();
                  MessageBox_default(`\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C`);
                }
              }
            }
          }).key("waitingRils");
          loading.box.on("destroy", () => App_default.server.removeByKey("waitingRils"));
        }).case("\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C", () => join()).case("\u0417\u0430\u0439\u0442\u0438", () => join()).case("\u0423\u0434\u0430\u043B\u0438\u0442\u044C", async () => {
          if (!isHistory) return;
          if (!await ConfirmBox_default(`\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C?`)) return;
          if (!await fs_default.existsFile(`${App_default.config.path}/history.json`))
            await fs_default.writeFile(`${App_default.config.path}/history.json`, JSON.stringify({ rooms: [] }));
          const history2 = JSON.parse(await fs_default.readFile(`${App_default.config.path}/history.json`));
          history2.rooms.splice(Number(objectId), 1);
          await fs_default.writeFile(`${App_default.config.path}/history.json`, JSON.stringify(history2));
          App_default.screen = new History();
        }).case(`\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C object id`, () => {
        });
      };
      getTexture(`rank/rank${rank}_36.png`).then((e) => levelImg.src = e);
      title.textContent = `${room[PacketDataKeys_default.PASSWORD] ? "\u{1F512} " : ""}` + room[PacketDataKeys_default.TITLE];
      status.textContent = isHistory ? formatDate(room["created"]) : room[PacketDataKeys_default.STATUS] == 0 ? `\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F` : `\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C`;
      status.style.color = isHistory ? "black" : room[PacketDataKeys_default.STATUS] == 0 ? `green` : `red`;
      title.prepend(levelImg);
      title.appendChild(status);
      div.appendChild(title);
      const arr = selectedRoles.slice().sort((a, b) => this.orderRoles.indexOf(a) - this.orderRoles.indexOf(b));
      for (const role of arr) {
        const img = document.createElement("img");
        getRoleImg(role).then((e) => img.src = e);
        img.width = 25;
        img.height = 35;
        img.style.margin = "1px";
        img.onmousedown = (e) => e.preventDefault();
        div.appendChild(img);
      }
      if (friends > 0) {
        const img = createElement("img", { width: 20, height: 20, css: { verticalAlign: "text-bottom" } });
        getTexture(`ui/4v.png`).then((e) => img.src = e);
        btnPlayers.appendChild(img);
      }
      createElement("span", { css: { marginLeft: "2px" }, text: typeof room[PacketDataKeys_default.MIN_PLAYERS] == "number" ? `\u0418\u0433\u0440\u043E\u043A\u0438: ${room[PacketDataKeys_default.PLAYERS_NUM]} [${room[PacketDataKeys_default.MIN_PLAYERS]}/${room[PacketDataKeys_default.MAX_PLAYERS]}] \u2B63` : `\u0418\u0433\u0440\u043E\u043A\u0438: [${room[PacketDataKeys_default.PLAYERS_NUM]}]`, appendTo: btnPlayers });
      btnPlayers.onclick = () => clickType = "btnPlayers";
      div.appendChild(btnPlayers);
      return {
        elem: div,
        onJoin: (c) => joinCallback = c,
        onViewRoomPlayers: (c) => viewRoomPlayersCallback = c
      };
    }
    addRoom(room) {
      const self2 = this;
      const objectId = room[PacketDataKeys_default.OBJECT_ID];
      if (!this.filter(room)) {
        if (this.getRoomByObjectId(objectId)) this.rooms.splice(this.getRoomIdByObjectId(objectId), 1);
        this.rooms.push(Object.assign({}, {
          room,
          id: this.roomsId,
          rils() {
          },
          remove() {
          }
        }));
        return;
      }
      const roomElem = _Rooms.getRoomElement(room);
      this.div.appendChild(roomElem.elem);
      if (this.getRoomByObjectId(objectId)) this.rooms.splice(this.getRoomIdByObjectId(objectId), 1);
      this.rooms.push(Object.assign({}, {
        room,
        id: this.roomsId,
        rils(data) {
          const playersInRoom = data[PacketDataKeys_default.PLAYERS_IN_ROOM];
          const min = room[PacketDataKeys_default.MIN_PLAYERS];
          const max = room[PacketDataKeys_default.MAX_PLAYERS];
        },
        remove() {
          self2.div.removeChild(roomElem.elem);
        }
      }));
      this.roomsId++;
    }
  };

  // game/src/screen/Friends.ts
  var Friends = class extends Screen {
    div;
    list;
    isSearch = false;
    searchValue = "";
    constructor() {
      super("Friends");
      this.element.style.overflow = "hidden";
      App_default.title = "\u0414\u0440\u0443\u0437\u044C\u044F";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const title = document.createElement("label");
      title.textContent = "\u0414\u0440\u0443\u0437\u044C\u044F";
      header.appendChild(title);
      this.on("back", () => {
        App_default.screen = new Dashboard();
      });
      this.init();
    }
    async init() {
      App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_FRIENDSHIP_LIST, {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token
      });
      this.div = document.createElement("div");
      this.div.style.display = "flex";
      this.div.style.padding = "10px";
      this.div.style.flexDirection = "column";
      this.element.appendChild(this.div);
      const btns = createElement("div", {
        css: {
          display: "flex",
          width: "100%"
        },
        appendTo: this.div
      });
      const friends = createElement("button", {
        className: "gray",
        text: "\u0414\u0440\u0443\u0437\u044C\u044F",
        css: {
          width: "100%",
          margin: "2px"
        },
        appendTo: btns
      });
      friends.onclick = async () => {
        App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_FRIENDSHIP_LIST, {
          [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
          [PacketDataKeys_default.TOKEN]: App_default.user.token
        });
        const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.FRIENDSHIP_LIST]);
        friends.className = "gray";
        requests.className = "dark-gray";
        search.className = "dark-gray";
        this.isSearch = false;
        this.updateFriends(data2[PacketDataKeys_default.FRIENDSHIP_LIST][PacketDataKeys_default.FRIENDSHIP_LIST]);
      };
      const requests = createElement("button", {
        className: "dark-gray",
        text: "\u0417\u0430\u043F\u0440\u043E\u0441\u044B",
        css: {
          width: "100%",
          margin: "2px"
        },
        appendTo: btns
      });
      requests.onclick = async () => {
        App_default.server.send(PacketDataKeys_default.GET_SENT_FRIEND_REQUESTS_LIST, {
          [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
          [PacketDataKeys_default.TOKEN]: App_default.user.token
        });
        const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.FRIENDSHIP_LIST]);
        friends.className = "dark-gray";
        requests.className = "gray";
        search.className = "dark-gray";
        this.isSearch = false;
        this.updateFriends(data2[PacketDataKeys_default.FRIENDSHIP_LIST][PacketDataKeys_default.FRIENDSHIP_LIST]);
      };
      const search = createElement("button", {
        className: "dark-gray",
        text: "\u041F\u043E\u0438\u0441\u043A",
        css: {
          width: "100%",
          margin: "2px"
        },
        appendTo: btns
      });
      search.onclick = async () => {
        friends.className = "dark-gray";
        requests.className = "dark-gray";
        search.className = "gray";
        this.isSearch = true;
        this.updateFriends([]);
      };
      this.list = document.createElement("div");
      this.list.style.overflowY = "overlay";
      this.list.style.height = App_default.height - 125 + "px";
      this.div.appendChild(this.list);
      this.on("resize", () => {
        this.list.style.height = App_default.height - 125 + "px";
      });
      const data = await App_default.server.awaitPacket([PacketDataKeys_default.FRIENDSHIP_LIST]);
      this.updateFriends(data[PacketDataKeys_default.FRIENDSHIP_LIST][PacketDataKeys_default.FRIENDSHIP_LIST]);
    }
    updateFriends(data) {
      this.list.innerHTML = "";
      let inputSearch;
      if (this.isSearch) {
        console.log(data);
        inputSearch = createElement("input", {
          value: this.searchValue,
          css: {
            width: "100%"
          }
        });
        inputSearch.onchange = async () => {
          this.searchValue = inputSearch.value;
          App_default.server.send(PacketDataKeys_default.SEARCH_USER, {
            [PacketDataKeys_default.SEARCH_TEXT]: inputSearch.value
          });
          const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.SEARCH_USER]);
          this.updateFriends(data2[PacketDataKeys_default.USERS]);
        };
        this.list.appendChild(inputSearch);
      }
      for (const f of data) {
        const isFriend = !!f[PacketDataKeys_default.FRIEND];
        const objectId = f[PacketDataKeys_default.OBJECT_ID];
        const user = isFriend ? f[PacketDataKeys_default.FRIEND] : this.isSearch ? {
          photo: f[PacketDataKeys_default.PHOTO],
          objectId
        } : f[PacketDataKeys_default.USER];
        const userObjectId = this.isSearch ? f[PacketDataKeys_default.PLAYER_OBJECT_ID] : user[PacketDataKeys_default.PLAYER_OBJECT_ID];
        const username = !this.isSearch ? user[PacketDataKeys_default.USERNAME] : f[PacketDataKeys_default.USERNAME];
        const newMessages = Number(f[PacketDataKeys_default.NEW_MESSAGES]);
        const accepted = f[PacketDataKeys_default.ACCEPTED];
        let isClicked = false;
        const e = document.createElement("div");
        e.style.background = "rgba(200,200,200,.4)";
        e.style.padding = "7px";
        e.style.margin = "5px";
        e.style.borderRadius = "10px";
        e.style.display = "flex";
        e.onclick = () => {
          wait(5).then(() => {
            if (this.isSearch) {
              ProfileInfo(userObjectId);
              return;
            }
            if (!isClicked) App_default.screen = new PrivateChat(objectId, userObjectId, user);
          });
        };
        const avatar = document.createElement("img");
        avatar.width = avatar.height = 40;
        avatar.style.borderRadius = "100%";
        avatar.onmousedown = (e2) => e2.preventDefault();
        avatar.onclick = () => {
          isClicked = true;
          ProfileInfo(userObjectId);
        };
        getAvatarImg(this.isSearch ? { photo: f[PacketDataKeys_default.PHOTO] } : user).then((s) => avatar.src = s);
        e.appendChild(avatar);
        const badge = document.createElement("div");
        badge.style.width = badge.style.height = "15px";
        badge.style.minWidth = badge.style.minHeight = "15px";
        badge.style.maxWidth = badge.style.maxHeight = "15px";
        badge.style.boxSizing = "border-box";
        badge.style.background = (user ? user[PacketDataKeys_default.IS_ONLINE] : f[PacketDataKeys_default.IS_ONLINE]) ? "#3fe33f" : "#636363";
        badge.style.border = "2px solid white";
        badge.style.borderRadius = "100%";
        badge.style.position = "relative";
        badge.style.left = "-45px";
        e.appendChild(badge);
        const d = document.createElement("div");
        d.style.display = "flex";
        d.style.flexDirection = "column";
        d.style.width = "300px";
        e.appendChild(d);
        const nick = document.createElement("span");
        nick.textContent = username;
        nick.style.padding = "0 5px 7px 10px";
        nick.style.color = "black";
        d.appendChild(nick);
        const date = document.createElement("span");
        date.textContent = this.isSearch ? f[PacketDataKeys_default.IS_ONLINE] ? "\u0412 \u0441\u0435\u0442\u0438" : "\u041D\u0435 \u0432 \u0441\u0435\u0442\u0438" : formatDate(f[PacketDataKeys_default.UPDATED]);
        date.style.padding = "0 5px 0 5px";
        date.style.fontSize = "11px";
        date.style.color = "black";
        d.appendChild(date);
        const btns = document.createElement("div");
        btns.style.display = "flex";
        btns.style.width = "100%";
        btns.style.justifyContent = "flex-end";
        e.appendChild(btns);
        if (f[PacketDataKeys_default.ROOM]) {
          const btnRoom = document.createElement("button");
          btnRoom.textContent = "\u0412 \u043A\u043E\u043C\u043D\u0430\u0442\u0435";
          btnRoom.onclick = () => {
            isClicked = true;
            App_default.screen = new Room(f[PacketDataKeys_default.ROOM][PacketDataKeys_default.OBJECT_ID]);
          };
          btns.appendChild(btnRoom);
        }
        if (newMessages > 0) {
          const div1 = document.createElement("div");
          div1.style.display = "flex";
          div1.style.alignItems = "center";
          div1.style.padding = "5px";
          div1.textContent = newMessages > 0 ? newMessages + "" : "";
          if (newMessages > 0) {
            const img = document.createElement("img");
            img.width = 18;
            img.height = 14;
            img.style.marginLeft = "5px";
            getTexture("ui/0Y.png").then((e2) => img.src = e2);
            div1.appendChild(img);
          }
          btns.appendChild(div1);
        }
        if (accepted === 0) {
          const btnAcceptFriend = createElement("button", {
            className: "green",
            text: "\u041F\u0440\u0438\u043D\u044F\u0442\u044C",
            appendTo: btns
          });
          btnAcceptFriend.onclick = async () => {
            isClicked = true;
            const e2 = await ConfirmBox_default(`\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443 \u0432 \u0434\u0440\u0443\u0437\u044C\u044F \u043E\u0442 \u0434\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F?`, { title: `\u041F\u0420\u0418\u041D\u042F\u0422\u042C \u0414\u0420\u0423\u0416\u0411\u0423` });
            if (e2) {
              App_default.server.send(PacketDataKeys_default.ADD_FRIEND, {
                [PacketDataKeys_default.FRIEND_USER_OBJECT_ID]: userObjectId
              });
              const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.ADD_FRIEND, PacketDataKeys_default.YOUR_FRIENDSHIP_LIST_FULL]);
              if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.YOUR_FRIENDSHIP_LIST_FULL) {
                MessageBox_default(`\u0421\u043F\u0438\u0441\u043E\u043A \u0432\u0430\u0448\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439 \u043F\u043E\u043B\u043E\u043D. \u0412\u044B \u0443\u0436\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u043B\u0438 ${data2[PacketDataKeys_default.FRIENDSHIP_LIST_LIMIT]} \u0434\u0440\u0443\u0437\u0435\u0439 \u0432 \u0441\u043F\u0438\u0441\u043E\u043A \u0434\u0440\u0443\u0437\u0435\u0439

\u0412\u044B \u0441\u043C\u043E\u0436\u0435\u0442\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C 200 \u0434\u0440\u0443\u0437\u0435\u0439, \u0435\u0441\u043B\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 VIP

\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u0432\u0430\u0448\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439`);
                return;
              }
              if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ADD_FRIEND) {
                btnAcceptFriend.style.display = "none";
              }
            }
          };
        }
        if (!this.isSearch) {
          const btnRemoveFriend = createElement("button", {
            className: "gray",
            text: "X",
            appendTo: btns
          });
          btnRemoveFriend.onclick = async () => {
            isClicked = true;
            const c = await ConfirmBox_default(`\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438\u0437 \u0434\u0440\u0443\u0437\u0435\u0439? \u0412\u0441\u0435 \u043B\u0438\u0447\u043D\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0442\u0430\u043A-\u0436\u0435 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B.`, { title: `\u0423\u0414\u0410\u041B\u0418\u0422\u042C \u0418\u0417 \u0414\u0420\u0423\u0417\u0415\u0419`, height: 175 });
            if (c) {
              App_default.server.send(PacketDataKeys_default.REMOVE_FRIEND, {
                [PacketDataKeys_default.FRIEND_USER_OBJECT_ID]: userObjectId
              });
              const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.REMOVE_FRIEND]);
              if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.REMOVE_FRIEND)
                e.remove();
            }
          };
        }
        this.list.appendChild(e);
      }
      inputSearch?.focus();
    }
  };

  // game/src/screen/PrivateChat.ts
  var PrivateChat = class extends Screen {
    constructor(friendObjectId, friendUserObjectId, user) {
      super("PrivateChat");
      this.friendObjectId = friendObjectId;
      this.friendUserObjectId = friendUserObjectId;
      this.user = user;
      App_default.title = user[PacketDataKeys_default.USERNAME];
      (async () => this.element.style.background = `url(${await getBackgroundImg("day3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const title = document.createElement("label");
      title.textContent = user[PacketDataKeys_default.USERNAME];
      header.appendChild(title);
      this.on("back", () => {
        App_default.screen = new Friends();
      });
      this.init();
    }
    messagesElem;
    writingElem;
    input;
    async init() {
      App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_PRIVATE_CHAT, {
        [PacketDataKeys_default.TOKEN]: App_default.user.token,
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.FRIENDSHIP]: this.friendObjectId
      });
      const data = await App_default.server.awaitPacket("pcmsr");
      this.messagesElem = document.createElement("div");
      this.messagesElem.style.height = App_default.height - (isMobile() ? 110 : 90) + "px";
      this.messagesElem.style.textAlign = "center";
      this.messagesElem.style.overflowX = "hidden";
      this.messagesElem.style.overflowY = "overlay";
      this.messagesElem.style.margin = "10px 10px 5px 10px";
      this.messagesElem.style.outline = "2px solid #c0c0c0";
      this.messagesElem.style.borderRadius = "3px";
      this.messagesElem.style.background = "rgba(255,255,255,.5)";
      this.messagesElem.style.display = "flex";
      this.messagesElem.style.flexDirection = "column";
      this.messagesElem.style.justifyContent = "flex-start";
      this.element.appendChild(this.messagesElem);
      this.writingElem = createElement("div", {
        css: {
          width: "100%",
          display: "none"
        },
        appendTo: this.element
      });
      const footer = document.createElement("div");
      footer.style.width = "100%";
      this.element.appendChild(footer);
      this.input = document.createElement("input");
      this.input.className = "input-chat";
      this.input.type = `text`;
      this.input.placeholder = `\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435`;
      this.input.addEventListener("keydown", (e) => {
        if (e.key == "Enter" && this.input.value != "") {
          const msg = this.input.value;
          this.input.value = "";
          this.sendMessage(msg);
        }
      });
      if (isMobile()) {
        this.input.addEventListener("focus", () => {
          App_default.width = innerWidth;
          App_default.height = innerHeight - 1;
        });
        this.input.addEventListener("blur", () => {
          App_default.width = innerWidth;
          App_default.height = innerHeight - 2;
        });
      }
      this.on("keydown", (e) => e.key == "Enter" && this.input.focus());
      footer.appendChild(this.input);
      this.on("message", (data2) => {
        if (data2[PacketDataKeys_default.TYPE] == "pcmr") {
          this.addMessage(data2[PacketDataKeys_default.MESSAGE]);
        } else if (data2[PacketDataKeys_default.TYPE] == "pruint") {
          this.writingElem.style.display = "none";
        } else if (data2[PacketDataKeys_default.TYPE] == "pruit") {
          this.writingElem.style.display = "block";
        }
      });
      this.on("resize", () => {
        this.messagesElem.style.height = App_default.height - (isMobile() ? 110 : 90) + "px";
      });
      for (const m of data[PacketDataKeys_default.MESSAGES]) this.addMessage(m, false);
      this.messagesElem.scrollTop = this.messagesElem.scrollHeight;
      App_default.server.send(PacketDataKeys_default.ACCEPT_MESSAGES, {
        [PacketDataKeys_default.FRIENDSHIP]: this.friendObjectId
      });
    }
    messages = 0;
    lastMessage;
    lastMessageDate;
    addMessage(m, deleteFirst = this.messages > 100 ? true : false) {
      const text = m[PacketDataKeys_default.TEXT];
      const type = m[PacketDataKeys_default.MESSAGE_TYPE];
      const sticker = m[PacketDataKeys_default.MESSAGE_STICKER];
      const objectId = m[PacketDataKeys_default.OBJECT_ID];
      const playerObjectId = m[PacketDataKeys_default.PLAYER_OBJECT_ID];
      const isMe = App_default.user.playerObjectId == playerObjectId;
      const user = isMe ? App_default.user : this.user;
      const username = isMe ? App_default.user.username : this.user[PacketDataKeys_default.USERNAME];
      const created = m[PacketDataKeys_default.CREATED];
      const accepted = m[PacketDataKeys_default.ACCEPTED];
      if (objectId && !m.isDate) {
        if (this.lastMessage && this.lastMessage.divM && this.lastMessage.playerObjectId == playerObjectId) {
          const msg = document.createElement("span");
          msg.textContent = noXSS(text);
          msg.className = "black";
          msg.style.userSelect = "text";
          this.lastMessage.divM.appendChild(msg);
        } else {
          const div = document.createElement("div");
          div.style.display = "flex";
          div.style.textAlign = "left";
          if (!accepted) div.style.background = "#c5c5c5";
          const divM = document.createElement("div");
          divM.style.display = "flex";
          divM.style.flexDirection = "column";
          divM.style.justifyContent = "center";
          divM.style.wordBreak = "auto-phrase";
          const avatar = document.createElement("img");
          getAvatarImg(user).then((e) => avatar.src = e);
          avatar.style.borderRadius = "100%";
          avatar.width = 35;
          avatar.height = 35;
          avatar.style.margin = "5px";
          avatar.onmousedown = (e) => e.preventDefault();
          avatar.onclick = () => ProfileInfo(playerObjectId);
          const nick = document.createElement("span");
          createElement("span", { css: { marginLeft: "2px" }, text: user[PacketDataKeys_default.VIP] ? username + ` ${user[PacketDataKeys_default.VIP]}` : username, appendTo: nick });
          if (App_default.settings.data.hideUsername && username == App_default.user.username) nick.style.filter = "blur(5px)";
          nick.className = "black";
          nick.onclick = () => this.addNickToInput(username);
          const msg = document.createElement("span");
          msg.textContent = noXSS(text);
          msg.style.color = "black";
          msg.style.userSelect = "text";
          this.messagesElem.appendChild(div);
          this.lastMessage = { objectId, playerObjectId, divM };
          div.appendChild(avatar);
          div.appendChild(divM);
          divM.appendChild(nick);
          divM.appendChild(msg);
          this.addMessage({ isDate: true, [PacketDataKeys_default.TEXT]: `${formatDate(created)}`, [PacketDataKeys_default.ACCEPTED]: accepted, [PacketDataKeys_default.OBJECT_ID]: objectId }, deleteFirst);
        }
      } else {
        const div = document.createElement("div");
        div.textContent = noXSS(text);
        div.style.color = "black";
        div.style.userSelect = "text";
        if (!accepted) div.style.background = "#c5c5c5";
        div.style.textAlign = "right";
        div.style.padding = "3px";
        this.messagesElem.appendChild(div);
        this.lastMessageDate = { objectId, playerObjectId, elem: div };
      }
      if (this.messagesElem.scrollHeight - App_default.height - this.messagesElem.scrollTop < 75)
        this.messagesElem.scroll({ top: this.messagesElem.scrollHeight, behavior: "smooth" });
      if (deleteFirst && this.messagesElem.firstElementChild)
        this.messagesElem.removeChild(this.messagesElem.firstElementChild);
      this.messages++;
    }
    addNickToInput(username) {
      const isFocused = document.activeElement == this.input;
      if (this.input.value.includes(`[${username}]`)) {
        const posStart = this.input.value.indexOf(`[${username}]`);
        const posEnd = this.input.value.lastIndexOf(`[${username}]`);
        if (posEnd == 0) {
          this.input.value = this.input.value.replace(`[${username}] `, "");
        } else {
          if (this.input.value.substring(0, posStart).endsWith(" "))
            this.input.value = this.input.value.replace(` [${username}] `, "");
          else
            this.input.value = this.input.value.replace(`[${username}]`, "");
        }
      } else {
        if (["", " "].includes(this.input.value.substring((this.input.selectionStart ?? 1) - 1)))
          insertAtCaret(this.input, `[${username}] `);
        else
          insertAtCaret(this.input, ` [${username}] `);
      }
      if (isMobile()) this.input.focus();
    }
    sendMessage(message, options = {}) {
      if (message.startsWith(App_default.settings.data.game.barmanEffect)) {
        const symbols = "?!&@#%^~<>*";
        message = Array.from({ length: [...message].length - 1 }, () => symbols[Math.random() * symbols.length | 0]).join("");
      }
      App_default.server.send(PacketDataKeys_default.PRIVATE_CHAT_MESSAGE_CREATE, {
        [PacketDataKeys_default.FRIENDSHIP]: this.friendObjectId,
        [PacketDataKeys_default.MESSAGE]: {
          [PacketDataKeys_default.TEXT]: message,
          [PacketDataKeys_default.MESSAGE_STYLE]: 3,
          [PacketDataKeys_default.MESSAGE_STICKER]: false
        }
      });
    }
  };

  // game/src/dialog/Avatar.ts
  async function Avatar({ photo, playerObjectId }) {
    const box = new Box({ title: "\u0410\u0412\u0410\u0422\u0410\u0420\u041A\u0410", height: 350, canCloseAnywhere: true });
    const div = createElement("div", {
      css: {
        width: "100%",
        height: "100%"
      },
      appendTo: box.content
    });
    const img = createElement("img", {
      css: {
        width: "100%",
        height: "100%"
      },
      src: "",
      appendTo: div
    });
    if (photo) {
      getAvatarImg({ photo }).then((s) => img.src = s);
    } else if (playerObjectId) {
      getAvatarImg({ playerObjectId }).then((s) => img.src = s);
    }
    return await box.wait("close");
  }

  // game/src/dialog/ProfileInfo.ts
  function calculateStatsWithRoles(profile) {
    const mafiaRoles = [4 /* MAFIA */, 6 /* TERRORIST */, 9 /* BARMAN */, 11 /* INFORMER */];
    const peacefulRoles = [1 /* CIVILIAN */, 2 /* DOCTOR */, 3 /* SHERIFF */, 5 /* LOVER */, 7 /* JOURNALIST */, 8 /* BODYGUARD */, 10 /* SPY */];
    let gamesAsMafia = 0;
    let gamesAsPeaceful = 0;
    mafiaRoles.forEach((roleId) => {
      gamesAsMafia += profile.roleStats[roleId] || 0;
    });
    peacefulRoles.forEach((roleId) => {
      gamesAsPeaceful += profile.roleStats[roleId] || 0;
    });
    const totalGamesFromRoles = gamesAsMafia + gamesAsPeaceful;
    const totalWins = profile.winsAsPeaceful + profile.winsAsMafia;
    const overallWinRate = (totalWins * 100 / profile.playedGames).toFixed(2);
    const mafiaWinRatePercentOfTotalWins = (profile.winsAsMafia * 100 / totalWins).toFixed(1);
    const peacefulWinRatePercentOfTotalWins = (profile.winsAsPeaceful * 100 / totalWins).toFixed(1);
    const mafiaWinRatePercentOfGamesAsMafia = gamesAsMafia > 0 ? Math.round(profile.winsAsMafia * 100 / gamesAsMafia) : 0;
    const peacefulWinRatePercentOfGamesAsPeaceful = gamesAsPeaceful > 0 ? Math.round(profile.winsAsPeaceful * 100 / gamesAsPeaceful) : 0;
    return {
      totalWins: `(${overallWinRate}%) ${totalWins}`,
      winsAsMafia: `(${mafiaWinRatePercentOfTotalWins}%) ${profile.winsAsMafia}`,
      winsAsPeaceful: `(${peacefulWinRatePercentOfTotalWins}%) ${profile.winsAsPeaceful}`,
      gamesAsMafia,
      gamesAsPeaceful,
      mafiaWinRatePercentOfGamesAsMafia,
      // ≈41%
      peacefulWinRatePercentOfGamesAsPeaceful
      // ≈47%
    };
  }
  async function ProfileInfo(playerObjectId) {
    App_default.server.send(PacketDataKeys_default.GET_USER_PROFILE, {
      [PacketDataKeys_default.USER_RECEIVER]: playerObjectId,
      [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
      [PacketDataKeys_default.TOKEN]: App_default.user.token
    });
    let data;
    try {
      data = await App_default.server.awaitPacket(PacketDataKeys_default.USER_PROFILE, 3e3);
    } catch {
      return;
    }
    const zoom = getZoom();
    const box = new Box({ title: "\u041F\u0420\u041E\u0424\u0418\u041B\u042C", width: App_default.width / zoom / 0.85, height: App_default.height / zoom / 0.75, canCloseAnywhere: true });
    box.content.style.overflowY = "overlay";
    const ud = data[PacketDataKeys_default.USER_PROFILE];
    const room = ud[PacketDataKeys_default.ROOM];
    const pud = ud[PacketDataKeys_default.PROFILE_USER_DATA];
    const profile = {
      isOnline: pud[PacketDataKeys_default.IS_ONLINE],
      experience: pud[PacketDataKeys_default.EXPERIENCE],
      level: pud[PacketDataKeys_default.LEVEL],
      matchMakingScore: pud[PacketDataKeys_default.MATCH_MAKING_SCORE],
      nextLevelExperience: pud[PacketDataKeys_default.NEXT_LEVEL_EXPERIENCE],
      prevLevelExperience: pud[PacketDataKeys_default.PREVIOUS_LEVEL_EXPERIENCE],
      objectId: pud[PacketDataKeys_default.OBJECT_ID],
      playerObjectId: pud[PacketDataKeys_default.PLAYER_OBJECT_ID],
      photo: pud[PacketDataKeys_default.PHOTO],
      roleStats: pud[PacketDataKeys_default.PLAYER_ROLE_STATISTICS],
      sex: pud[PacketDataKeys_default.SEX],
      playedGames: pud[PacketDataKeys_default.PLAYED_GAMES],
      serverLanguage: pud[PacketDataKeys_default.SERVER_LANGUAGE],
      status: pud[PacketDataKeys_default.STATUS],
      updated: pud[PacketDataKeys_default.UPDATED],
      username: pud[PacketDataKeys_default.USERNAME],
      vip: pud[PacketDataKeys_default.VIP],
      winsAsMafia: pud[PacketDataKeys_default.WINS_AS_MAFIA],
      winsAsPeaceful: pud[PacketDataKeys_default.WINS_AS_PEACEFUL],
      sliver: ud[PacketDataKeys_default.USER_ACCOUNT_COINS][PacketDataKeys_default.SILVER_COINS],
      gold: ud[PacketDataKeys_default.USER_ACCOUNT_COINS][PacketDataKeys_default.GOLD_COINS],
      friend: ud[PacketDataKeys_default.FRIENDSHIP],
      friendFlag: ud[PacketDataKeys_default.FRIENDSHIP_FLAG]
    };
    const isMe = profile.playerObjectId == App_default.user.playerObjectId;
    let isViewingAvatar = false;
    const div = createElement("div", {
      css: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowY: "overlay",
        fontSize: "smaller"
      }
    });
    const rankEl = createElement("div", {
      css: {
        display: "flex",
        width: "100%",
        padding: "10px",
        alignItems: "center",
        color: "black"
      },
      appendTo: div
    });
    const rankImg = createElement("img", {
      width: 20,
      appendTo: rankEl
    });
    getTexture(`rank/rank${Math.round(profile.level / 2)}_36.png`).then((e) => rankImg.src = e);
    const rankLvl = createElement("span", { text: profile.level + "", appendTo: rankEl });
    const rankProgress = createElement("progress", {
      css: {
        width: `calc(100% - 140px)`,
        margin: "5px"
      },
      value: "0",
      appendTo: rankEl
    });
    rankProgress.max = profile.nextLevelExperience;
    rankProgress.value = profile.prevLevelExperience;
    const rankLvl2 = createElement("span", { appendTo: rankEl, text: `${profile.prevLevelExperience}/${profile.nextLevelExperience}` });
    const badge = createElement("div", {
      css: {
        width: "20px",
        minWidth: "20px",
        minHeight: "20px",
        maxWidth: "20px",
        maxHeight: "20px",
        boxSizing: "border-box",
        background: profile.isOnline ? "#3fe33f" : "#636363",
        border: "2px solid white",
        borderRadius: "100px",
        position: "relative",
        left: "-40px",
        top: "-80px"
      }
    });
    const avatar = createElement("img", {
      css: {
        borderRadius: "100%",
        margin: "5px",
        transition: ".5s",
        marginBottom: "-10px"
      },
      width: 100,
      height: 100
    });
    getAvatarImg(pud).then((e) => avatar.src = e);
    avatar.onmousedown = (e) => e.preventDefault();
    avatar.onclick = async () => {
      await Avatar({ photo: profile.photo, playerObjectId: profile.playerObjectId });
    };
    div.appendChild(avatar);
    div.appendChild(badge);
    function addH(text, userSelect = false) {
      const h = document.createElement("h4");
      if (userSelect) h.style.userSelect = "text";
      h.style.color = "black";
      h.style.margin = "5px";
      h.textContent = text;
      div.appendChild(h);
    }
    addH(profile.username, true);
    const btns = document.createElement("div");
    btns.style.width = "80%";
    btns.style.textAlign = "center";
    div.appendChild(btns);
    function addButton(text, callback) {
      const e = document.createElement("button");
      e.style.margin = "1px";
      e.textContent = text;
      if (callback) e.onclick = callback;
      else e.disabled = true;
      btns.appendChild(e);
    }
    if (!isMe) {
      if (!profile.friend) {
        addButton("\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u0440\u0443\u0437\u044C\u044F", async () => {
          const e = await ConfirmBox_default(`\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443 \u043D\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0434\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0432 \u0434\u0440\u0443\u0437\u044C\u044F?`, { title: `\u0414\u041E\u0411\u0410\u0412\u0418\u0422\u042C \u0412 \u0414\u0420\u0423\u0417\u042C\u042F` });
          if (e) {
            App_default.server.send(PacketDataKeys_default.ADD_FRIEND, {
              [PacketDataKeys_default.FRIEND_USER_OBJECT_ID]: playerObjectId
            });
            const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.ADD_FRIEND, PacketDataKeys_default.YOUR_FRIENDSHIP_LIST_FULL]);
            if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.YOUR_FRIENDSHIP_LIST_FULL) {
              MessageBox_default(`\u0421\u043F\u0438\u0441\u043E\u043A \u0432\u0430\u0448\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439 \u043F\u043E\u043B\u043E\u043D. \u0412\u044B \u0443\u0436\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u043B\u0438 ${data2[PacketDataKeys_default.FRIENDSHIP_LIST_LIMIT]} \u0434\u0440\u0443\u0437\u0435\u0439 \u0432 \u0441\u043F\u0438\u0441\u043E\u043A \u0434\u0440\u0443\u0437\u0435\u0439

\u0412\u044B \u0441\u043C\u043E\u0436\u0435\u0442\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C 200 \u0434\u0440\u0443\u0437\u0435\u0439, \u0435\u0441\u043B\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 VIP

\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u0432\u0430\u0448\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439`);
              return;
            }
            if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ADD_FRIEND) {
              box.destroy();
              ProfileInfo(playerObjectId);
            }
          }
        });
      } else if (profile.friendFlag == 2) {
        addButton("\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0434\u0440\u0443\u0436\u0431\u0443", async () => {
          const e = await ConfirmBox_default(`\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443 \u0432 \u0434\u0440\u0443\u0437\u044C\u044F \u043E\u0442 \u0434\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F?`, { title: `\u041F\u0420\u0418\u041D\u042F\u0422\u042C \u0414\u0420\u0423\u0416\u0411\u0423` });
          if (e) {
            App_default.server.send(PacketDataKeys_default.ADD_FRIEND, {
              [PacketDataKeys_default.FRIEND_USER_OBJECT_ID]: playerObjectId
            });
            const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.ADD_FRIEND, PacketDataKeys_default.YOUR_FRIENDSHIP_LIST_FULL]);
            if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.YOUR_FRIENDSHIP_LIST_FULL) {
              MessageBox_default(`\u0421\u043F\u0438\u0441\u043E\u043A \u0432\u0430\u0448\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439 \u043F\u043E\u043B\u043E\u043D. \u0412\u044B \u0443\u0436\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u043B\u0438 ${data2[PacketDataKeys_default.FRIENDSHIP_LIST_LIMIT]} \u0434\u0440\u0443\u0437\u0435\u0439 \u0432 \u0441\u043F\u0438\u0441\u043E\u043A \u0434\u0440\u0443\u0437\u0435\u0439

\u0412\u044B \u0441\u043C\u043E\u0436\u0435\u0442\u0435 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C 200 \u0434\u0440\u0443\u0437\u0435\u0439, \u0435\u0441\u043B\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 VIP

\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0441\u0432\u043E\u0431\u043E\u0434\u0438\u0442\u0435 \u0441\u043F\u0438\u0441\u043E\u043A \u0432\u0430\u0448\u0438\u0445 \u0434\u0440\u0443\u0437\u0435\u0439`);
              return;
            }
            if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.ADD_FRIEND) {
              box.destroy();
              ProfileInfo(playerObjectId);
            }
          }
        });
      } else if (profile.friendFlag == 1) {
        addButton("\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441", async () => {
          const e = await ConfirmBox_default(`\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u0440\u0443\u0436\u0431\u044B?`, { title: `\u041E\u0422\u041C\u0415\u041D\u0418\u0422\u042C \u0417\u0410\u041F\u0420\u041E\u0421` });
          if (e) {
            App_default.server.send(PacketDataKeys_default.REMOVE_FRIEND, {
              [PacketDataKeys_default.FRIEND_USER_OBJECT_ID]: playerObjectId
            });
            const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.REMOVE_FRIEND]);
            if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.REMOVE_FRIEND) {
              box.destroy();
              ProfileInfo(playerObjectId);
            }
          }
        });
      }
      if (profile.friendFlag == 3) {
        addButton("\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0434\u0440\u0443\u0436\u0431\u0443", async () => {
          const e = await ConfirmBox_default(`\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438\u0437 \u0434\u0440\u0443\u0437\u0435\u0439? \u0412\u0441\u0435 \u043B\u0438\u0447\u043D\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0442\u0430\u043A-\u0436\u0435 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B.`, { title: `\u0423\u0414\u0410\u041B\u0418\u0422\u042C \u0418\u0417 \u0414\u0420\u0423\u0417\u0415\u0419`, height: 175 });
          if (e) {
            App_default.server.send(PacketDataKeys_default.REMOVE_FRIEND, {
              [PacketDataKeys_default.FRIEND_USER_OBJECT_ID]: playerObjectId
            });
            const data2 = await App_default.server.awaitPacket([PacketDataKeys_default.REMOVE_FRIEND]);
            if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.REMOVE_FRIEND) {
              box.destroy();
              ProfileInfo(playerObjectId);
            }
          }
        });
        addButton("\u041B\u0438\u0447\u043D\u044B\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F", async () => {
          box.destroy();
          App_default.screen = new PrivateChat(profile.friend, playerObjectId, pud);
        });
      }
    }
    if (room) {
      if (room[PacketDataKeys_default.SAME_ROOM] && !isMe)
        addButton("\u0412\u044B\u0433\u043D\u0430\u0442\u044C", async () => {
          const c = await ConfirmBox_default(`\u0415\u0441\u043B\u0438 \u0432\u0441\u0435 \u043F\u0440\u043E\u0433\u043E\u043B\u043E\u0441\u0443\u044E\u0442 \u0437\u0430 \u0438\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438\u0433\u0440\u043E\u043A\u0430 \u0438\u0437 \u043A\u043E\u043C\u043D\u0430\u0442\u044B, \u044D\u0442\u043E \u0431\u0443\u0434\u0435\u0442 \u0441\u0442\u043E\u0438\u0442\u044C \u0432\u0430\u043C 200 \u0441\u0435\u0440\u0435\u0431\u0440\u044F\u043D\u044B\u0445 \u043C\u043E\u043D\u0435\u0442`, { title: `\u0412\u042B\u0413\u041D\u0410\u0422\u042C \u0418\u0413\u0420\u041E\u041A\u0410`, height: 180 });
          if (c) {
            App_default.server.send(PacketDataKeys_default.KICK_USER, {
              [PacketDataKeys_default.ROOM_OBJECT_ID]: room[PacketDataKeys_default.OBJECT_ID],
              [PacketDataKeys_default.PLAYER_OBJECT_ID]: playerObjectId
            });
            box.destroy();
          }
        });
      addH(`\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u0435\u0442 \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0435`);
      const roomElem = Rooms.getRoomElement(room);
      roomElem.onJoin(() => box.close());
      roomElem.elem.style.width = "90%";
      div.appendChild(roomElem.elem);
    }
    if (!isMe) addButton("\u041F\u043E\u0434\u0430\u0442\u044C \u0436\u0430\u043B\u043E\u0431\u0443", async () => {
      "MAKE_COMPLAINT";
      const w = new Box({ title: "\u041F\u041E\u0414\u0410\u0422\u042C \u0416\u0410\u041B\u041E\u0411\u0423", height: 200, canCloseAnywhere: true });
      const div2 = createElement("div", {
        css: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          alignItems: "center",
          height: "100%",
          color: "black"
        }
      });
      const input = createElement("input", { type: "text", placeholder: "\u041F\u0440\u0438\u0447\u0438\u043D\u0430" });
      const btn = createElement("button", { text: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C", css: { width: "100%" } });
      btn.onclick = () => {
        App_default.server.send(PacketDataKeys_default.MAKE_COMPLAINT, {
          [PacketDataKeys_default.REASON]: input.value,
          [PacketDataKeys_default.PLAYER_OBJECT_ID]: profile.playerObjectId
        });
        w.close();
      };
      div2.appendChild(createElement("div", { text: `\u041F\u043E\u0434\u0430\u0442\u044C \u0436\u0430\u043B\u043E\u0431\u0443 \u043D\u0430 \u0438\u0433\u0440\u043E\u043A\u0430: [${profile.username}]` }));
      div2.appendChild(createElement("div", { text: `\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u0443` }));
      div2.appendChild(input);
      div2.appendChild(btn);
      w.content.appendChild(div2);
    });
    addH(`\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430`);
    const stat = document.createElement("div");
    stat.style.display = "flex";
    stat.style.flexDirection = "column";
    stat.style.alignItems = "stretch";
    stat.style.width = "95%";
    div.appendChild(stat);
    function add(stat2, text, value) {
      const d = document.createElement("div");
      d.style.color = "black";
      d.style.background = "rgb(189 184 184)";
      d.style.padding = "5px";
      d.style.margin = "1px";
      d.style.borderRadius = "5px";
      const k = document.createElement("span");
      k.textContent = `${text}:`;
      const v = document.createElement("span");
      v.textContent = value;
      v.style.float = "right";
      v.style.userSelect = "text";
      d.appendChild(k);
      d.appendChild(v);
      stat2.appendChild(d);
    }
    const dataStats = calculateStatsWithRoles(profile);
    add(stat, "\u0421\u044B\u0433\u0440\u0430\u043D\u043E \u0438\u0433\u0440", profile.playedGames);
    add(stat, "\u0421\u044B\u0433\u0440\u0430\u043D\u043E \u0438\u0433\u0440 \u0437\u0430 \u041C\u0430\u0444\u0438\u044E", dataStats.gamesAsMafia);
    add(stat, "\u0421\u044B\u0433\u0440\u0430\u043D\u043E \u0438\u0433\u0440 \u0437\u0430 \u041C\u0438\u0440\u043D\u044B\u0445", dataStats.gamesAsPeaceful);
    add(stat, "\u0412\u0441\u0435\u0433\u043E \u043F\u043E\u0431\u0435\u0434", dataStats.totalWins);
    add(stat, "\u041F\u043E\u0431\u0435\u0434 \u0437\u0430 \u041C\u0430\u0444\u0438\u044E", dataStats.winsAsMafia);
    add(stat, "\u041F\u043E\u0431\u0435\u0434 \u0437\u0430 \u041C\u0438\u0440\u043D\u044B\u0445", dataStats.winsAsPeaceful);
    add(stat, "M/M", (Number(profile.winsAsPeaceful) / Number(profile.winsAsMafia)).toFixed(2));
    addH(`\u0421\u044B\u0433\u0440\u0430\u043D\u043D\u044B\u0435 \u0440\u043E\u043B\u0438`);
    const statRoles = document.createElement("div");
    statRoles.style.display = "flex";
    statRoles.style.flexDirection = "row";
    statRoles.style.flexWrap = "wrap";
    statRoles.style.alignItems = "stretch";
    statRoles.style.justifyContent = "center";
    statRoles.style.width = "95%";
    function addRole(id) {
      const d = document.createElement("div");
      d.style.color = "black";
      d.style.background = "rgb(189 184 184)";
      d.style.padding = "5px";
      d.style.margin = "1px";
      d.style.borderRadius = "5px";
      const img = document.createElement("img");
      fs_default.loadImageAsDataURL(`${App_default.config.path}/assets/textures/roles/${id}.png`).then((e) => img.src = e);
      img.width = 40;
      img.height = 55;
      img.onmousedown = (e) => e.preventDefault();
      const v = document.createElement("div");
      v.textContent = profile.roleStats[id];
      v.style.textAlign = "center";
      d.appendChild(img);
      d.appendChild(v);
      statRoles.appendChild(d);
    }
    div.appendChild(statRoles);
    for (let i = 1; i < 11; i++) addRole(i);
    addH(`\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F`);
    const statDev = document.createElement("div");
    statDev.style.display = "flex";
    statDev.style.flexDirection = "column";
    statDev.style.alignItems = "stretch";
    statDev.style.width = "95%";
    add(statDev, "\u0421\u0435\u0440\u0435\u0431\u0440\u043E", profile.sliver);
    if (typeof profile.gold == "number") add(statDev, "\u0417\u043E\u043B\u043E\u0442\u043E", profile.gold);
    add(statDev, "\u041F\u043E\u043B", profile.sex == 1 /* WOMEN */ ? "\u0416\u0435\u043D\u0441\u043A\u0438\u0439" : "\u041C\u0443\u0436\u0441\u043A\u043E\u0439");
    add(statDev, `player object id`, playerObjectId);
    div.appendChild(statDev);
    box.content.appendChild(div);
    return await box.wait("destroy");
  }

  // game/src/screen/GlobalChat.ts
  var GlobalChat = class extends Screen {
    // хз как назвать
    listPlayersFromInput;
    showListPlayersFromInput = false;
    playersListElem;
    messagesElem;
    input;
    constructor() {
      super("GlobalChat");
      App_default.title = "\u041E\u0431\u0449\u0438\u0439 \u0447\u0430\u0442";
      (async () => this.element.style.background = `url(${await getBackgroundImg("day3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const logo = document.createElement("label");
      logo.textContent = "\u041E\u0431\u0449\u0438\u0439 \u0447\u0430\u0442";
      header.appendChild(logo);
      this.init();
    }
    async init() {
      App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_CHAT, {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token
      });
      this.listPlayersFromInput = createElement("div", {
        css: {
          position: "absolute",
          background: "rgba(255,255,255,.5)"
        }
      });
      this.element.appendChild(this.listPlayersFromInput);
      this.playersListElem = createElement("div", {
        css: {
          height: "155px",
          overflow: "overlay",
          margin: "10px",
          outline: "2px solid #c0c0c0",
          borderRadius: "3px",
          background: "rgba(255,255,255,.5)",
          display: "flex",
          flexWrap: "wrap",
          flexDirection: "column"
        },
        appendTo: this.element
      });
      this.messagesElem = createElement("div", {
        css: {
          height: App_default.height - (isMobile() ? 270 : 250) + "px",
          textAlign: "center",
          overflowX: "hidden",
          overflowY: "overlay",
          margin: "10px 10px 5px 10px",
          outline: "2px solid #c0c0c0",
          borderRadius: "3px",
          background: "rgba(255,255,255,.5)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start"
        },
        appendTo: this.element
      });
      const data = await App_default.server.awaitPacket(PacketDataKeys_default.MESSAGES);
      for (const m of data[PacketDataKeys_default.MESSAGES]) this.addMessage(m, false);
      this.messagesElem.scrollTop = this.messagesElem.scrollHeight;
      const footer = createElement("div", {
        css: {
          display: "flex",
          flexDirection: "column",
          width: "100%"
        },
        appendTo: this.element
      });
      const footer2 = createElement("div", {
        css: {
          display: "flex",
          width: "100%"
        },
        appendTo: footer
      });
      this.input = document.createElement("input");
      this.input.className = "input-chat";
      this.input.type = `text`;
      this.input.placeholder = `\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435`;
      this.input.onkeydown = (e) => {
        if (e.key == "Enter" && this.input.value != "") {
          const msg = this.input.value;
          this.input.value = "";
          this.sendMessage(msg);
        }
      };
      this.input.oninput = () => {
        const winZoom = App_default.zoom;
        const zoom = getZoom();
        const e = this.input.value.substring((this.input.selectionStart ?? 1) - 1);
        if (e == "@") {
          this.showListPlayersFromInput = true;
          this.listPlayersFromInput.style.display = "block";
          this.listPlayersFromInput.style.left = (this.input.offsetLeft + this.input.offsetWidth - 10) / winZoom / zoom + "px";
          this.listPlayersFromInput.style.top = (this.input.offsetTop + 20) / winZoom / zoom + "px";
        } else if (e == " ") {
          this.showListPlayersFromInput = false;
          this.listPlayersFromInput.style.display = "none";
        }
      };
      const emojiPanel = createElement("div", {
        css: {
          display: "none"
        },
        appendTo: footer
      });
      for (const e of ["sm1", "sm2", "sm3", "sm4", "sm5", "sm6"]) {
        const img = createElement("img", {
          width: 50,
          height: 50,
          css: {},
          appendTo: emojiPanel
        });
        getTexture(`emoji/${e}.png`).then((e2) => img.src = e2);
        img.onclick = () => {
          insertAtCaret(this.input, `:${e}:`);
        };
      }
      const emojiBtn = createElement("img", {
        width: isMobile() ? 40 : 25,
        height: isMobile() ? 40 : 25,
        css: {},
        appendTo: footer2
      });
      getTexture("emoji/sm1.png").then((e) => emojiBtn.src = e);
      emojiBtn.onclick = () => {
        emojiPanel.style.display = emojiPanel.style.display == "none" ? "block" : "none";
        if (emojiPanel.style.display == "block") {
          this.messagesElem.style.height = App_default.height - (isMobile() ? 270 : 250) - 60 + "px";
        } else {
          this.messagesElem.style.height = App_default.height - (isMobile() ? 270 : 250) + "px";
        }
      };
      this.on("keydown", (e) => e.key == "Enter" && this.input.focus());
      footer2.appendChild(this.input);
      this.on("message", (data2) => {
        if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.MESSAGE) {
          this.addMessage(data2[PacketDataKeys_default.MESSAGE]);
        } else if (data2[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USERS) {
          this.updateUsers(data2[PacketDataKeys_default.USERS]);
        }
      });
      this.on("resize", () => {
        this.messagesElem.style.height = App_default.height - (isMobile() ? 270 : 250) + "px";
      });
      this.on("back", () => {
        App_default.screen = new Dashboard();
      });
    }
    joinLeaveMessages = {};
    lastMessage;
    addMessage(m, deleteFirst = true) {
      const text = m[PacketDataKeys_default.TEXT];
      const type = m[PacketDataKeys_default.MESSAGE_TYPE];
      const sticker = m[PacketDataKeys_default.MESSAGE_STICKER];
      const user = m[PacketDataKeys_default.USER];
      const objectId = user ? user[PacketDataKeys_default.OBJECT_ID] : "";
      const playerObjectId = user ? user[PacketDataKeys_default.PLAYER_OBJECT_ID] : "";
      const username = user?.[PacketDataKeys_default.USERNAME] ?? "";
      if (user ? type != 2 && type != 3 : user) {
        if (this.lastMessage && this.lastMessage.divM && this.lastMessage.user[PacketDataKeys_default.USERNAME] == user[PacketDataKeys_default.USERNAME]) {
          const msg = document.createElement("span");
          let cleanText = users_default[objectId] == "dev" ? text : noXSS(text);
          if (text.includes(`[${App_default.user.username}]`))
            cleanText = cleanText.replaceAll(`${App_default.user.username}`, `<span style="${App_default.settings.data.hideUsername ? "filter: blur(5px)" : "color: #ab1457; font-weight: bold"}">${App_default.user.username}</span>`);
          processEmojis(msg, cleanText);
          msg.className = "black";
          msg.style.userSelect = "text";
          this.lastMessage.divM.appendChild(msg);
        } else {
          const div = document.createElement("div");
          div.style.display = "flex";
          div.style.textAlign = "left";
          const divM = document.createElement("div");
          divM.style.display = "flex";
          divM.style.flexDirection = "column";
          divM.style.justifyContent = "center";
          divM.style.wordBreak = "auto-phrase";
          const avatar = document.createElement("img");
          getAvatarImg(user).then((e) => avatar.src = e);
          avatar.style.borderRadius = "100%";
          avatar.width = 35;
          avatar.height = 35;
          avatar.style.margin = "5px";
          avatar.onmousedown = (e) => e.preventDefault();
          avatar.onclick = () => ProfileInfo(playerObjectId);
          const nick = document.createElement("span");
          createElement("span", { css: { marginLeft: "2px" }, text: user[PacketDataKeys_default.VIP] ? username + ` ${user[PacketDataKeys_default.VIP]}` : username, appendTo: nick });
          if (username == App_default.user.username && App_default.settings.data.hideUsername) nick.style.filter = "blur(5px)";
          nick.className = "black";
          nick.onclick = () => this.addNickToInput(username);
          const msg = document.createElement("span");
          let cleanText = users_default[objectId] == "dev" ? text : noXSS(text);
          if (text.includes(`[${App_default.user.username}]`))
            cleanText = cleanText.replaceAll(`${App_default.user.username}`, `<span style="${App_default.settings.data.hideUsername ? "filter: blur(5px)" : "color: #ab1457; font-weight: bold"}">${App_default.user.username}</span>`);
          processEmojis(msg, cleanText);
          msg.style.color = type == 9 ? "#186400" : type == 11 ? "gray" : type == 17 ? "#113B81" : type == 27 ? "#940000" : "black";
          msg.style.userSelect = "text";
          div.appendChild(avatar);
          div.appendChild(divM);
          divM.appendChild(nick);
          divM.appendChild(msg);
          this.messagesElem.appendChild(div);
          this.lastMessage = { user, divM };
        }
      } else {
        const div = document.createElement("div");
        const nickElement = `<span style="${text == App_default.user.username && App_default.settings.data.hideUsername ? "filter: blur(5px)" : ""}">${username}</span>`;
        if (type == 2 || type == 3) div.innerHTML = type == 2 ? `\u0418\u0433\u0440\u043E\u043A ${nickElement} \u0432\u043E\u0448\u0451\u043B` : `\u0418\u0433\u0440\u043E\u043A ${nickElement} \u0432\u044B\u0448\u0435\u043B`;
        else div.textContent = noXSS(text);
        div.style.color = type == 2 ? "#22640A" : type == 3 ? "#940000" : "black";
        div.style.userSelect = "text";
        div.style.margin = "3px";
        this.messagesElem.appendChild(div);
        this.lastMessage = { user: void 0, divM: void 0 };
        if (type == 2 || type == 3) {
          if (this.joinLeaveMessages[username])
            this.messagesElem.removeChild(this.joinLeaveMessages[username]);
          this.joinLeaveMessages[username] = div;
        }
      }
      if (this.messagesElem.scrollHeight - App_default.height - this.messagesElem.scrollTop < 75)
        this.messagesElem.scroll({ top: this.messagesElem.scrollHeight, behavior: "smooth" });
      if (deleteFirst && this.messagesElem.firstElementChild)
        this.messagesElem.removeChild(this.messagesElem.firstElementChild);
    }
    addNickToInput(username) {
      const isFocused = document.activeElement == this.input;
      if (this.input.value.includes(`[${username}]`)) {
        const posStart = this.input.value.indexOf(`[${username}]`);
        const posEnd = this.input.value.lastIndexOf(`[${username}]`);
        if (posEnd == 0) {
          this.input.value = this.input.value.replace(`[${username}] `, "");
        } else {
          if (this.input.value.substring(0, posStart).endsWith(" "))
            this.input.value = this.input.value.replace(` [${username}] `, "");
          else
            this.input.value = this.input.value.replace(`[${username}]`, "");
        }
      } else {
        if (["", " "].includes(this.input.value.substring((this.input.selectionStart ?? 1) - 1)))
          insertAtCaret(this.input, `[${username}] `);
        else
          insertAtCaret(this.input, ` [${username}] `);
      }
      if (isMobile()) this.input.focus();
    }
    sendMessage(message, options = {}) {
      if (message.startsWith(App_default.settings.data.game.barmanEffect)) {
        const symbols = "?!&@#%^~<>*";
        message = Array.from({ length: [...message].length - 1 }, () => symbols[Math.random() * symbols.length | 0]).join("");
      }
      if (CommandManager_default.executeCommand(message)) return;
      App_default.server.send(PacketDataKeys_default.CHAT_MESSAGE_CREATE, {
        [PacketDataKeys_default.MESSAGE]: {
          [PacketDataKeys_default.MESSAGE_STYLE]: options.messageStyle ?? 0,
          [PacketDataKeys_default.MESSAGE_STICKER]: options.messageSticker ?? false,
          [PacketDataKeys_default.TEXT]: message
        }
      });
    }
    updateUsers(users) {
      this.playersListElem.innerHTML = "";
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const username = user[PacketDataKeys_default.USERNAME];
        const playerUser = user[PacketDataKeys_default.PLAYER_USER];
        const playerObjectId = user[PacketDataKeys_default.PLAYER_OBJECT_ID];
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.textAlign = "left";
        div.style.alignItems = "center";
        const avatar = document.createElement("img");
        getAvatarImg(user).then((e) => avatar.src = e);
        avatar.style.borderRadius = "100%";
        avatar.width = avatar.height = 25;
        avatar.style.margin = "5px";
        avatar.onmousedown = (e) => e.preventDefault();
        avatar.onclick = () => ProfileInfo(playerObjectId);
        const nick = document.createElement("span");
        createElement("span", { css: { marginLeft: "2px" }, text: user[PacketDataKeys_default.VIP] ? username + ` ${user[PacketDataKeys_default.VIP]}` : username, appendTo: nick });
        if (username == App_default.user.username && App_default.settings.data.hideUsername) nick.style.filter = "blur(5px)";
        nick.className = "black";
        nick.onclick = () => this.addNickToInput(username);
        div.appendChild(avatar);
        div.appendChild(nick);
        this.playersListElem.appendChild(div);
      }
    }
  };

  // game/src/screen/Settings.ts
  var Settings = class extends Screen {
    constructor() {
      super("Settings");
      this.element.style.overflow = "hidden";
      App_default.title = "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const title = document.createElement("label");
      title.textContent = "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438";
      header.appendChild(title);
      this.on("back", () => {
        App_default.screen = new Dashboard();
      });
      this.init();
    }
    init() {
      const e = document.createElement("div");
      e.style.display = "flex";
      e.style.padding = "5px";
      e.style.flexDirection = "column";
      function addCheckbox(text, onChange, value = false) {
        const d = document.createElement("div");
        d.style.borderRadius = "10px";
        d.style.background = "gray";
        d.style.height = "30px";
        d.style.padding = "5px";
        d.style.margin = "2px";
        d.style.display = "flex";
        d.style.alignItems = "center";
        d.style.justifyContent = "space-between";
        e.appendChild(d);
        const t = document.createElement("span");
        t.className = "black";
        t.style.marginLeft = "10px";
        t.innerHTML = text.replaceAll("\n", "<br/>");
        d.appendChild(t);
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = value;
        cb.style.zoom = "1.5";
        cb.onchange = () => onChange(cb.checked);
        d.appendChild(cb);
      }
      function addInput(text, onChange, value = "", placeholder = "") {
        const d = document.createElement("div");
        d.style.borderRadius = "10px";
        d.style.background = "gray";
        d.style.height = "30px";
        d.style.padding = "5px";
        d.style.margin = "2px";
        d.style.display = "flex";
        d.style.alignItems = "center";
        d.style.justifyContent = "space-between";
        e.appendChild(d);
        const t = document.createElement("span");
        t.className = "black";
        t.style.marginLeft = "10px";
        t.textContent = text;
        d.appendChild(t);
        const inp = document.createElement("input");
        inp.value = value;
        inp.placeholder = placeholder;
        inp.onchange = () => onChange(inp.value);
        d.appendChild(inp);
      }
      function addSlider(text, onChange, min = 1, max = 10, value = 1, step = 1) {
        const d = document.createElement("div");
        d.style.borderRadius = "10px";
        d.style.background = "gray";
        d.style.height = "30px";
        d.style.padding = "5px";
        d.style.margin = "2px";
        d.style.display = "flex";
        d.style.alignItems = "center";
        d.style.justifyContent = "space-between";
        e.appendChild(d);
        const t = document.createElement("span");
        t.className = "black";
        t.style.marginLeft = "10px";
        t.textContent = text;
        d.appendChild(t);
        const cb = document.createElement("input");
        cb.type = "range";
        cb.min = min + "";
        cb.max = max + "";
        cb.step = step + "";
        cb.value = value + "";
        cb.onchange = () => onChange(Number(cb.value));
        d.appendChild(cb);
      }
      function addSelect(text, values, onClick) {
      }
      function addButton(text, btnText, onClick) {
        const d = document.createElement("div");
        d.style.borderRadius = "10px";
        d.style.background = "gray";
        d.style.height = "30px";
        d.style.padding = "5px";
        d.style.margin = "2px";
        d.style.display = "flex";
        d.style.alignItems = "center";
        d.style.justifyContent = "space-between";
        e.appendChild(d);
        const t = document.createElement("span");
        t.className = "black";
        t.style.marginLeft = "10px";
        t.textContent = text;
        d.appendChild(t);
        const btn = document.createElement("button");
        btn.textContent = btnText;
        btn.onclick = onClick;
        d.appendChild(btn);
      }
      addButton("\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435", "\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C", () => MessageBox_default("\u0421\u043A\u043E\u0440\u043E.."));
      addSlider("\u041C\u0430\u0441\u0448\u0442\u0430\u0431", (v) => {
        App_default.settings.data.window.zoom = v;
        App_default.element.style.zoom = v + "";
      }, isMobile() ? 0.4 : 0.3, isMobile() ? 0.9 : 1.5, App_default.settings.data.window.zoom, 0.1);
      addInput("\u041E\u043F\u044C\u044F\u043D\u0435\u043D\u0438\u0435 \u0441", (v) => {
        App_default.settings.data.game.barmanEffect = v;
      }, App_default.settings.data.game.barmanEffect);
      addCheckbox('\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 "\u0412\u044B \u0443\u043C\u0435\u0440\u043B\u0438"?', (v) => {
        App_default.settings.data.game.showYouDiedMessage = v;
      }, App_default.settings.data.game.showYouDiedMessage);
      addCheckbox("\u0423\u0434\u0430\u043B\u044F\u0442\u044C \u0432\u0441\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043F\u043E\u0441\u043B\u0435 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438\u0433\u0440\u044B?", (v) => {
        App_default.settings.data.game.clearMessages = v;
      }, App_default.settings.data.game.clearMessages);
      addCheckbox("\u0425\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0441\u0442\u043E\u0440\u0438\u044E \u043F\u043E\u0441\u043B\u0435 \u0438\u0433\u0440\u044B?", (v) => {
        App_default.settings.data.game.saveHistory = v;
      }, App_default.settings.data.game.saveHistory);
      addCheckbox("\u0421\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043D\u0438\u043A\u043D\u0435\u0439\u043C \u0432\u0435\u0437\u0434\u0435", (v) => {
        App_default.settings.data.hideUsername = v;
      }, App_default.settings.data.hideUsername);
      addCheckbox("\u0420\u0435\u0436\u0438\u043C \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430", (v) => {
        App_default.settings.data.developer = v;
      }, App_default.settings.data.developer);
      this.element.appendChild(e);
    }
  };

  // game/src/screen/Matchmaking.ts
  var Matchmaking = class extends Screen {
    online = 0;
    el;
    constructor() {
      super("Matchmaking");
      App_default.title = "\u0421\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const titleElem = document.createElement("label");
      titleElem.textContent = "\u0421\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439";
      header.appendChild(titleElem);
      this.on("back", () => {
        App_default.screen = new Dashboard();
      });
      this.init();
    }
    async init() {
      App_default.server.send("mmgsk", {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token
      });
      App_default.server.send("mmguiabk", { mmbpa: 12 });
      App_default.server.awaitPacket("mmuiabk").then((e) => this.online = e.mmuiabk);
      const data = await App_default.server.awaitPacket(["mmms", "mmrr", "mmag"]);
      if (data.ty == "mmrr") {
        App_default.screen = new Room(data.rr.o, {
          isMM: true,
          sendRoomEnter: false,
          dontWaitForAnswer: true,
          selectedRoles: data.rr.sr
        });
        return;
      }
      if (data.ty == "mmsr") {
        this.selectRole(data.mmlt, data.mmcusr);
        return;
      }
      this.search(data);
    }
    async search(data) {
      this.removeInterval("selection");
      this.removeInterval("search");
      this.removeByKey("search");
      let isSearching = false, isAccepting = false, timer = 0, roomMM = false;
      this.el = createElement("div", {
        css: {
          display: "flex",
          flexDirection: "column",
          padding: "20px"
        },
        appendTo: this.element
      });
      const info = createElement("div", {
        text: "\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u044E\u0442: " + this.online,
        css: {
          margin: "5px"
        },
        appendTo: this.el
      });
      const btn = createElement("button", { text: "\u041D\u0430\u0447\u0430\u0442\u044C \u043F\u043E\u0438\u0441\u043A", appendTo: this.el });
      const btn2 = createElement("button", { text: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u0432 \u0438\u0433\u0440\u0443", appendTo: this.el, hide: true });
      if (data.ty == "mmag") {
        timer = data.mmlt;
        isAccepting = true;
        btn.innerHTML = `\u041F\u0440\u0438\u043D\u044F\u0442\u044C (${timer})`;
        info.innerText = `\u041F\u0440\u0438\u043D\u044F\u043B\u0438: ${data.mmagua}`;
      }
      this.setInterval("search", () => {
        if (!isAccepting) return;
        try {
          timer--;
          btn.innerHTML = `\u041F\u0440\u0438\u043D\u044F\u0442\u044C (${timer})`;
        } catch {
        }
      }, 1e3);
      if (data.mmms) {
        if (data.mmms.mmuir) {
          btn2.style.display = "block";
          btn2.onclick = () => {
            App_default.server.send("mmrtr", {});
          };
          roomMM = true;
        }
      }
      btn.onclick = async () => {
        if (isAccepting) {
          App_default.server.send("mmag", {});
          btn.disabled = true;
          return;
        }
        if (isSearching) {
          App_default.server.send("mmruk", {});
          App_default.server.send("mmguiabk", { mmbpa: 12 });
          btn.innerHTML = "\u041D\u0430\u0447\u0430\u0442\u044C \u043F\u043E\u0438\u0441\u043A";
          info.innerText = "\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u044E\u0442: " + this.online;
          if (roomMM)
            btn2.style.display = "block";
        } else {
          App_default.server.send("mmauk", { mmbpa: 12 });
          btn.innerHTML = "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0438\u0441\u043A";
          info.innerText = "\u0412 \u043F\u043E\u0438\u0441\u043A\u0435..";
          btn2.style.display = "none";
        }
        isSearching = !isSearching;
      };
      this.on("message", (d) => {
        if (d[PacketDataKeys_default.TYPE] == "mmfun") {
          info.innerText = "\u041D\u0430\u0439\u0434\u0435\u043D\u043E \u0438\u0433\u0440\u043E\u043A\u043E\u0432 (" + d.mmfun + "/12)";
        } else if (d[PacketDataKeys_default.TYPE] == "mmuiabk") {
          this.online = d.mmuiabk;
          if (!isSearching) info.innerText = "\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u044E\u0442: " + this.online;
        } else if (d[PacketDataKeys_default.TYPE] == "mmag") {
          isAccepting = true;
          btn.innerHTML = "\u041F\u0440\u0438\u043D\u044F\u0442\u044C";
          info.innerText = "\u041F\u0440\u0438\u043D\u044F\u043B\u0438: 0";
        } else if (d[PacketDataKeys_default.TYPE] == "mmagu") {
          info.innerText = "\u041F\u0440\u0438\u043D\u044F\u043B\u0438: " + d.mmagua;
        } else if (d[PacketDataKeys_default.TYPE] == "mmsr") {
          this.selectRole(d.mmlt, d.mmcusr);
        } else if (d[PacketDataKeys_default.TYPE] == "mmib") {
          const type = d.mmbt;
          const timeout = d.mmbut;
          const reason = type == 1 ? `\u0412\u044B \u043D\u0435 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u043B\u0438\u0441\u044C \u043A \u043F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0439 \u0438\u0433\u0440\u0435` : `\u0442\u0438\u043F \u043F\u0440\u0438\u0447\u0438\u043D\u044B: ${type}`;
          isSearching = false;
          btn.innerHTML = "\u041D\u0430\u0447\u0430\u0442\u044C \u043F\u043E\u0438\u0441\u043A";
          info.innerText = "\u0421\u0435\u0439\u0447\u0430\u0441 \u0438\u0433\u0440\u0430\u044E\u0442: " + this.online;
          MessageBox_default(`\u041F\u043E\u0438\u0441\u043A \u0438\u0433\u0440 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D.

${reason}

\u041E\u0441\u0442\u0430\u0432\u0448\u0435\u0435\u0441\u044F \u0432\u0440\u0435\u043C\u044F \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438:
${format_default(timeout, "genitive")}`, { height: 250 });
        } else if (d[PacketDataKeys_default.TYPE] == "mmrr") {
          const room = {
            objectId: d[PacketDataKeys_default.OBJECT_ID]
          };
          App_default.server.send("mmruk", {});
          App_default.screen = new Room(room.objectId, {
            isMM: true,
            sendRoomEnter: false,
            dontWaitForAnswer: true
          });
        }
      }).key("search");
    }
    async selectRole(timer = 30, roles = []) {
      const self2 = this;
      this.removeInterval("search");
      this.removeInterval("selection");
      this.removeByKey("search");
      try {
        this.el.remove();
      } catch {
      }
      this.el = createElement("div", {
        css: {
          display: "flex",
          flexDirection: "column",
          padding: "20px"
        },
        appendTo: this.element
      });
      const info = createElement("div", {
        text: "" + timer,
        css: {
          margin: "5px"
        },
        appendTo: this.el
      });
      const eroles = {};
      function addRole(role) {
        const e = createElement("div", {
          css: {
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: "5px",
            margin: "3px",
            borderRadius: "5px",
            background: "linear-gradient(90deg, transparent, #81be81)"
          },
          appendTo: self2.el
        });
        const img = createElement("img", {
          width: 30,
          appendTo: e
        });
        const inp = createElement("input", {
          type: "checkbox",
          css: {
            zoom: 2
          },
          checked: true,
          appendTo: e
        });
        const span = createElement("span", {
          text: RuRoles[role - 1],
          css: {
            marginLeft: "5px"
          },
          appendTo: e
        });
        const right = createElement("span", {
          text: "12 / 12",
          css: {
            marginLeft: "5px",
            marginRight: "0 auto"
          },
          appendTo: e
        });
        inp.onchange = () => {
          if (inp.checked) {
            App_default.server.send("mmsr", { r: role });
          } else {
            App_default.server.send("mmusr", { r: role });
          }
        };
        getRoleImg(role).then((e2) => img.src = e2);
        eroles[role + ""] = { element: e, right, many: 12 };
      }
      addRole(6 /* TERRORIST */);
      addRole(9 /* BARMAN */);
      addRole(11 /* INFORMER */);
      addRole(2 /* DOCTOR */);
      addRole(5 /* LOVER */);
      addRole(7 /* JOURNALIST */);
      addRole(8 /* BODYGUARD */);
      addRole(10 /* SPY */);
      this.setInterval("selection", () => {
        try {
          timer--;
          info.innerHTML = "" + timer;
        } catch {
        }
      }, 1e3);
      this.on("message", (d) => {
        if (d[PacketDataKeys_default.TYPE] == "mmrc") {
          for (let r in d.mmrc) {
            const i = d.mmrc[r];
            const e = eroles[r];
            if (e) {
              e.many = i;
              if (e.many > 5) {
                e.element.style.background = "linear-gradient(90deg, transparent, #81be81)";
              } else {
                e.element.style.background = "linear-gradient(90deg, transparent, #c05656)";
              }
              e.right.innerHTML = `${i} / 12`;
            }
          }
        } else if (d[PacketDataKeys_default.TYPE] == "mmrr") {
          const room = {
            objectId: d[PacketDataKeys_default.OBJECT_ID]
          };
          App_default.server.send("mmruk", {});
          App_default.screen = new Room(room.objectId, {
            isMM: true,
            sendRoomEnter: false,
            dontWaitForAnswer: true
          });
        }
      });
    }
  };

  // game/src/screen/Backpack.ts
  function formatSeconds2(totalSeconds, pad = false) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = totalSeconds % 60;
    const f = (n) => pad ? n.toString().padStart(2, "0") : n;
    return `${f(hours)}\u0447. ${f(minutes)}\u043C. ${f(seconds)}\u0441.`;
  }
  var emojis = ["1", "\u231A", "\u231B", "\u23F0", "\u23F3", "\u2600", "\u2601", "\u2614", "\u260E", "\u2615", "\u261D", "\u263A", "\u2648", "\u2649", "\u264A", "\u264B", "\u264C", "\u264D", "\u264E", "\u264F", "\u2650", "\u2651", "\u2652", "\u2653", "\u2660", "\u2663", "\u2665", "\u2666", "\u2693", "\u26A1", "\u26BD", "\u26BE", "\u26D4", "\u26C5", "\u26EA", "\u26F2", "\u26F3", "\u26F5", "\u26FD", "\u26FA", "\u270A", "\u270B", "\u270C", "\u2744", "\u2764", "\u2B50", "\u{1F300}", "\u{1F301}", "\u{1F302}", "\u{1F303}", "\u{1F304}", "\u{1F305}", "\u{1F306}", "\u{1F307}", "\u{1F308}", "\u{1F309}", "\u{1F30A}", "\u{1F30B}", "\u{1F30C}", "\u{1F30D}", "\u{1F30E}", "\u{1F30F}", "\u{1F310}", "\u{1F311}", "\u{1F312}", "\u{1F313}", "\u{1F314}", "\u{1F315}", "\u{1F316}", "\u{1F317}", "\u{1F318}", "\u{1F319}", "\u{1F31A}", "\u{1F31B}", "\u{1F31C}", "\u{1F31D}", "\u{1F31E}", "\u{1F31F}", "\u{1F320}", "\u{1F321}", "\u{1F324}", "\u{1F325}", "\u{1F326}", "\u{1F327}", "\u{1F328}", "\u{1F329}", "\u{1F32A}", "\u{1F32B}", "\u{1F32C}", "\u{1F32D}", "\u{1F32E}", "\u{1F32F}", "\u{1F335}", "\u{1F336}", "\u{1F337}", "\u{1F338}", "\u{1F339}", "\u{1F33A}", "\u{1F33B}", "\u{1F33C}", "\u{1F33D}", "\u{1F33E}", "\u{1F33F}", "\u{1F340}", "\u{1F341}", "\u{1F342}", "\u{1F343}", "\u{1F344}", "\u{1F345}", "\u{1F346}", "\u{1F347}", "\u{1F348}", "\u{1F349}", "\u{1F34A}", "\u{1F34B}", "\u{1F34C}", "\u{1F34D}", "\u{1F34E}", "\u{1F34F}", "\u{1F350}", "\u{1F351}", "\u{1F352}", "\u{1F353}", "\u{1F354}", "\u{1F355}", "\u{1F356}", "\u{1F357}", "\u{1F358}", "\u{1F359}", "\u{1F35A}", "\u{1F35B}", "\u{1F35C}", "\u{1F35D}", "\u{1F35E}", "\u{1F35F}", "\u{1F360}", "\u{1F361}", "\u{1F362}", "\u{1F363}", "\u{1F364}", "\u{1F365}", "\u{1F366}", "\u{1F367}", "\u{1F368}", "\u{1F369}", "\u{1F36A}", "\u{1F36B}", "\u{1F36C}", "\u{1F36D}", "\u{1F36E}", "\u{1F36F}", "\u{1F370}", "\u{1F371}", "\u{1F372}", "\u{1F373}", "\u{1F374}", "\u{1F375}", "\u{1F376}", "\u{1F377}", "\u{1F378}", "\u{1F379}", "\u{1F37A}", "\u{1F37B}", "\u{1F37C}", "\u{1F37D}", "\u{1F37E}", "\u{1F37F}", "\u{1F380}", "\u{1F381}", "\u{1F382}", "\u{1F383}", "\u{1F384}", "\u{1F385}", "\u{1F386}", "\u{1F387}", "\u{1F388}", "\u{1F389}", "\u{1F38A}", "\u{1F38B}", "\u{1F38C}", "\u{1F38D}", "\u{1F38E}", "\u{1F38F}", "\u{1F390}", "\u{1F391}", "\u{1F392}", "\u{1F393}", "\u{1F396}", "\u{1F397}", "\u{1F399}", "\u{1F39A}", "\u{1F39B}", "\u{1F39E}", "\u{1F39F}", "\u{1F3A0}", "\u{1F3A1}", "\u{1F3A2}", "\u{1F3A3}", "\u{1F3A4}", "\u{1F3A5}", "\u{1F3A6}", "\u{1F3A7}", "\u{1F3A8}", "\u{1F3A9}", "\u{1F3AA}", "\u{1F3AB}", "\u{1F3AC}", "\u{1F3AD}", "\u{1F3AE}", "\u{1F3AF}", "\u{1F3B0}", "\u{1F3B1}", "\u{1F3B2}", "\u{1F3B3}", "\u{1F3B4}", "\u{1F3B5}", "\u{1F3B6}", "\u{1F3B7}", "\u{1F3B8}", "\u{1F3B9}", "\u{1F3BA}", "\u{1F3BB}", "\u{1F3BC}", "\u{1F3BD}", "\u{1F3BE}", "\u{1F3BF}", "\u{1F3C0}", "\u{1F3C1}", "\u{1F3C2}", "\u{1F3C3}", "\u{1F3C4}", "\u{1F3C5}", "\u{1F3C6}", "\u{1F3C7}", "\u{1F3C8}", "\u{1F3C9}", "\u{1F3CA}", "\u{1F3CB}", "\u{1F3CC}", "\u{1F3CD}", "\u{1F3CE}", "\u{1F3CF}", "\u{1F3D0}", "\u{1F3D1}", "\u{1F3D2}", "\u{1F3D3}", "\u{1F3D4}", "\u{1F3D5}", "\u{1F3D6}", "\u{1F3D7}", "\u{1F3D8}", "\u{1F3D9}", "\u{1F3DA}", "\u{1F3DB}", "\u{1F3DC}", "\u{1F3DD}", "\u{1F3DE}", "\u{1F3DF}", "\u{1F3E0}", "\u{1F3E1}", "\u{1F3E2}", "\u{1F3E3}", "\u{1F3E4}", "\u{1F3E5}", "\u{1F3E6}", "\u{1F3E7}", "\u{1F3E8}", "\u{1F3E9}", "\u{1F3EA}", "\u{1F3EB}", "\u{1F3EC}", "\u{1F3ED}", "\u{1F3EE}", "\u{1F3EF}", "\u{1F3F0}", "\u{1F3F3}", "\u{1F3F4}", "\u{1F3F5}", "\u{1F3F7}", "\u{1F3F8}", "\u{1F3F9}", "\u{1F3FA}", "\u{1F400}", "\u{1F401}", "\u{1F402}", "\u{1F403}", "\u{1F404}", "\u{1F405}", "\u{1F406}", "\u{1F407}", "\u{1F408}", "\u{1F409}", "\u{1F40A}", "\u{1F40B}", "\u{1F40C}", "\u{1F40D}", "\u{1F40E}", "\u{1F40F}", "\u{1F410}", "\u{1F411}", "\u{1F412}", "\u{1F413}", "\u{1F414}", "\u{1F415}", "\u{1F416}", "\u{1F417}", "\u{1F418}", "\u{1F419}", "\u{1F41A}", "\u{1F41B}", "\u{1F41C}", "\u{1F41D}", "\u{1F41E}", "\u{1F41F}", "\u{1F420}", "\u{1F421}", "\u{1F422}", "\u{1F423}", "\u{1F424}", "\u{1F425}", "\u{1F426}", "\u{1F427}", "\u{1F428}", "\u{1F429}", "\u{1F42A}", "\u{1F42B}", "\u{1F42C}", "\u{1F42D}", "\u{1F42E}", "\u{1F42F}", "\u{1F430}", "\u{1F431}", "\u{1F432}", "\u{1F433}", "\u{1F434}", "\u{1F435}", "\u{1F436}", "\u{1F437}", "\u{1F438}", "\u{1F439}", "\u{1F43A}", "\u{1F43B}", "\u{1F43C}", "\u{1F43D}", "\u{1F43E}", "\u{1F43F}", "\u{1F440}", "\u{1F441}", "\u{1F442}", "\u{1F443}", "\u{1F444}", "\u{1F445}", "\u{1F446}", "\u{1F447}", "\u{1F448}", "\u{1F449}", "\u{1F44A}", "\u{1F44B}", "\u{1F44C}", "\u{1F44D}", "\u{1F44E}", "\u{1F44F}", "\u{1F450}", "\u{1F451}", "\u{1F452}", "\u{1F453}", "\u{1F454}", "\u{1F455}", "\u{1F456}", "\u{1F457}", "\u{1F458}", "\u{1F459}", "\u{1F45A}", "\u{1F45B}", "\u{1F45C}", "\u{1F45D}", "\u{1F45E}", "\u{1F45F}", "\u{1F460}", "\u{1F461}", "\u{1F462}", "\u{1F463}", "\u{1F464}", "\u{1F465}", "\u{1F466}", "\u{1F467}", "\u{1F468}", "\u{1F469}", "\u{1F46A}", "\u{1F46B}", "\u{1F46C}", "\u{1F46D}", "\u{1F46E}", "\u{1F46F}", "\u{1F470}", "\u{1F471}", "\u{1F472}", "\u{1F473}", "\u{1F474}", "\u{1F475}", "\u{1F476}", "\u{1F477}", "\u{1F478}", "\u{1F479}", "\u{1F47A}", "\u{1F47B}", "\u{1F47C}", "\u{1F47D}", "\u{1F47E}", "\u{1F47F}", "\u{1F480}", "\u{1F481}", "\u{1F482}", "\u{1F483}", "\u{1F484}", "\u{1F485}", "\u{1F486}", "\u{1F487}", "\u{1F488}", "\u{1F489}", "\u{1F48A}", "\u{1F48B}", "\u{1F48C}", "\u{1F48D}", "\u{1F48E}", "\u{1F48F}", "\u{1F490}", "\u{1F491}", "\u{1F492}", "\u{1F493}", "\u{1F494}", "\u{1F495}", "\u{1F496}", "\u{1F497}", "\u{1F498}", "\u{1F499}", "\u{1F49A}", "\u{1F49B}", "\u{1F49C}", "\u{1F49D}", "\u{1F49E}", "\u{1F49F}", "\u{1F4A0}", "\u{1F4A1}", "\u{1F4A2}", "\u{1F4A3}", "\u{1F4A4}", "\u{1F4A5}", "\u{1F4A6}", "\u{1F4A7}", "\u{1F4A8}", "\u{1F4A9}", "\u{1F4AA}", "\u{1F4AB}", "\u{1F4AC}", "\u{1F4AD}", "\u{1F4AE}", "\u{1F4AF}", "\u{1F4B0}", "\u{1F4B1}", "\u{1F4B2}", "\u{1F4B3}", "\u{1F4B4}", "\u{1F4B5}", "\u{1F4B6}", "\u{1F4B7}", "\u{1F4B8}", "\u{1F4B9}", "\u{1F4BA}", "\u{1F4BB}", "\u{1F4BC}", "\u{1F4BD}", "\u{1F4BE}", "\u{1F4BF}", "\u{1F4C0}", "\u{1F4C1}", "\u{1F4C2}", "\u{1F4C3}", "\u{1F4C4}", "\u{1F4C5}", "\u{1F4C6}", "\u{1F4C7}", "\u{1F4C8}", "\u{1F4C9}", "\u{1F4CA}", "\u{1F4CB}", "\u{1F4CC}", "\u{1F4CD}", "\u{1F4CE}", "\u{1F4CF}", "\u{1F4D0}", "\u{1F4D1}", "\u{1F4D2}", "\u{1F4D3}", "\u{1F4D4}", "\u{1F4D5}", "\u{1F4D6}", "\u{1F4D7}", "\u{1F4D8}", "\u{1F4D9}", "\u{1F4DA}", "\u{1F4DB}", "\u{1F4DC}", "\u{1F4DD}", "\u{1F4DE}", "\u{1F4DF}", "\u{1F4E0}", "\u{1F4E1}", "\u{1F4E2}", "\u{1F4E3}", "\u{1F4E4}", "\u{1F4E5}", "\u{1F4E6}", "\u{1F4E7}", "\u{1F4E8}", "\u{1F4E9}", "\u{1F4EA}", "\u{1F4EB}", "\u{1F4EC}", "\u{1F4ED}", "\u{1F4EE}", "\u{1F4EF}", "\u{1F4F0}", "\u{1F4F1}", "\u{1F4F2}", "\u{1F4F3}", "\u{1F4F4}", "\u{1F4F5}", "\u{1F4F6}", "\u{1F4F7}", "\u{1F4F8}", "\u{1F4F9}", "\u{1F4FA}", "\u{1F4FB}", "\u{1F4FC}", "\u{1F4FD}", "\u{1F4FF}", "\u{1F50A}", "\u{1F50B}", "\u{1F51E}", "\u{1F525}", "\u{1F526}", "\u{1F527}", "\u{1F528}", "\u{1F529}", "\u{1F52A}", "\u{1F52B}", "\u{1F52C}", "\u{1F52D}", "\u{1F52E}", "\u{1F52F}", "\u{1F54A}", "\u{1F54B}", "\u{1F54C}", "\u{1F54D}", "\u{1F54E}", "\u{1F56F}", "\u{1F570}", "\u{1F574}", "\u{1F575}", "\u{1F576}", "\u{1F577}", "\u{1F578}", "\u{1F579}", "\u{1F57A}", "\u{1F590}", "\u{1F596}", "\u{1F5A4}", "\u{1F5E1}", "\u{1F5DC}", "\u{1F5DD}", "\u{1F5DE}", "\u{1F5FB}", "\u{1F5FC}", "\u{1F5FD}", "\u{1F5FF}", "\u{1F600}", "\u{1F601}", "\u{1F602}", "\u{1F603}", "\u{1F604}", "\u{1F605}", "\u{1F606}", "\u{1F607}", "\u{1F608}", "\u{1F609}", "\u{1F60A}", "\u{1F60B}", "\u{1F60C}", "\u{1F60D}", "\u{1F60E}", "\u{1F60F}", "\u{1F610}", "\u{1F611}", "\u{1F612}", "\u{1F613}", "\u{1F614}", "\u{1F615}", "\u{1F616}", "\u{1F617}", "\u{1F618}", "\u{1F619}", "\u{1F61A}", "\u{1F61B}", "\u{1F61C}", "\u{1F61D}", "\u{1F61E}", "\u{1F61F}", "\u{1F620}", "\u{1F621}", "\u{1F622}", "\u{1F623}", "\u{1F624}", "\u{1F625}", "\u{1F626}", "\u{1F627}", "\u{1F628}", "\u{1F629}", "\u{1F62A}", "\u{1F62B}", "\u{1F62C}", "\u{1F62D}", "\u{1F62E}", "\u{1F62F}", "\u{1F630}", "\u{1F631}", "\u{1F632}", "\u{1F633}", "\u{1F634}", "\u{1F635}", "\u{1F636}", "\u{1F637}", "\u{1F638}", "\u{1F639}", "\u{1F63A}", "\u{1F63B}", "\u{1F63C}", "\u{1F63D}", "\u{1F63E}", "\u{1F63F}", "\u{1F640}", "\u{1F641}", "\u{1F642}", "\u{1F643}", "\u{1F644}", "\u{1F645}", "\u{1F646}", "\u{1F647}", "\u{1F648}", "\u{1F649}", "\u{1F64A}", "\u{1F64B}", "\u{1F64C}", "\u{1F64D}", "\u{1F64E}", "\u{1F64F}", "\u{1F680}", "\u{1F681}", "\u{1F682}", "\u{1F683}", "\u{1F684}", "\u{1F685}", "\u{1F686}", "\u{1F687}", "\u{1F688}", "\u{1F689}", "\u{1F68A}", "\u{1F68B}", "\u{1F68C}", "\u{1F68D}", "\u{1F68E}", "\u{1F68F}", "\u{1F690}", "\u{1F691}", "\u{1F692}", "\u{1F693}", "\u{1F694}", "\u{1F695}", "\u{1F696}", "\u{1F697}", "\u{1F698}", "\u{1F699}", "\u{1F69A}", "\u{1F69B}", "\u{1F69C}", "\u{1F69D}", "\u{1F69E}", "\u{1F69F}", "\u{1F6A0}", "\u{1F6A1}", "\u{1F6A2}", "\u{1F6A3}", "\u{1F6A4}", "\u{1F6A5}", "\u{1F6A6}", "\u{1F6A7}", "\u{1F6A8}", "\u{1F6A9}", "\u{1F6AA}", "\u{1F6AB}", "\u{1F6AC}", "\u{1F6AD}", "\u{1F6AE}", "\u{1F6AF}", "\u{1F6B0}", "\u{1F6B1}", "\u{1F6B2}", "\u{1F6B3}", "\u{1F6B4}", "\u{1F6B5}", "\u{1F6B6}", "\u{1F6B7}", "\u{1F6B8}", "\u{1F6B9}", "\u{1F6BA}", "\u{1F6BB}", "\u{1F6BC}", "\u{1F6BD}", "\u{1F6BE}", "\u{1F6BF}", "\u{1F6C0}", "\u{1F6C1}", "\u{1F6C2}", "\u{1F6C3}", "\u{1F6C4}", "\u{1F6C5}", "\u{1F6CB}", "\u{1F6CC}", "\u{1F6CD}", "\u{1F6CE}", "\u{1F6CF}", "\u{1F6D0}", "\u{1F6D1}", "\u{1F6D2}", "\u{1F6D5}", "\u{1F6D6}", "\u{1F6D7}", "\u{1F6E0}", "\u{1F6E1}", "\u{1F6E2}", "\u{1F6E3}", "\u{1F6E4}", "\u{1F6E5}", "\u{1F6E9}", "\u{1F6EB}", "\u{1F6EC}", "\u{1F6F0}", "\u{1F6F3}", "\u{1F6F4}", "\u{1F6F5}", "\u{1F6F6}", "\u{1F6F7}", "\u{1F6F8}", "\u{1F6F9}", "\u{1F6FA}", "\u{1F6FB}", "\u{1F6FC}", "\u{1F7E0}", "\u{1F7E1}", "\u{1F7E2}", "\u{1F7E3}", "\u{1F7E4}", "\u{1F7E5}", "\u{1F7E6}", "\u{1F7E7}", "\u{1F7E8}", "\u{1F7E9}", "\u{1F7EA}", "\u{1F7EB}", "\u{1F90C}", "\u{1F90D}", "\u{1F90E}", "\u{1F90F}", "\u{1F910}", "\u{1F911}", "\u{1F912}", "\u{1F913}", "\u{1F914}", "\u{1F915}", "\u{1F916}", "\u{1F917}", "\u{1F918}", "\u{1F919}", "\u{1F91A}", "\u{1F91B}", "\u{1F91C}", "\u{1F91D}", "\u{1F91E}", "\u{1F91F}", "\u{1F920}", "\u{1F921}", "\u{1F922}", "\u{1F923}", "\u{1F924}", "\u{1F925}", "\u{1F926}", "\u{1F927}", "\u{1F928}", "\u{1F929}", "\u{1F92A}", "\u{1F92B}", "\u{1F92C}", "\u{1F92D}", "\u{1F92E}", "\u{1F92F}", "\u{1F930}", "\u{1F931}", "\u{1F932}", "\u{1F933}", "\u{1F934}", "\u{1F935}", "\u{1F936}", "\u{1F937}", "\u{1F938}", "\u{1F939}", "\u{1F93A}", "\u{1F93C}", "\u{1F93D}", "\u{1F93E}", "\u{1F93F}", "\u{1F940}", "\u{1F941}", "\u{1F942}", "\u{1F943}", "\u{1F944}", "\u{1F945}", "\u{1F947}", "\u{1F948}", "\u{1F949}", "\u{1F94A}", "\u{1F94B}", "\u{1F94C}", "\u{1F94D}", "\u{1F94E}", "\u{1F94F}", "\u{1F950}", "\u{1F951}", "\u{1F952}", "\u{1F953}", "\u{1F954}", "\u{1F955}", "\u{1F956}", "\u{1F957}", "\u{1F958}", "\u{1F959}", "\u{1F95A}", "\u{1F95B}", "\u{1F95C}", "\u{1F95D}", "\u{1F95E}", "\u{1F95F}", "\u{1F960}", "\u{1F961}", "\u{1F962}", "\u{1F963}", "\u{1F964}", "\u{1F965}", "\u{1F966}", "\u{1F967}", "\u{1F968}", "\u{1F969}", "\u{1F96A}", "\u{1F96B}", "\u{1F96C}", "\u{1F96D}", "\u{1F96E}", "\u{1F96F}", "\u{1F970}", "\u{1F971}", "\u{1F972}", "\u{1F973}", "\u{1F974}", "\u{1F975}", "\u{1F976}", "\u{1F977}", "\u{1F978}", "\u{1F97A}", "\u{1F97B}", "\u{1F97C}", "\u{1F97D}", "\u{1F97E}", "\u{1F97F}", "\u{1F980}", "\u{1F981}", "\u{1F982}", "\u{1F983}", "\u{1F984}", "\u{1F985}", "\u{1F986}", "\u{1F987}", "\u{1F988}", "\u{1F989}", "\u{1F98A}", "\u{1F98B}", "\u{1F98C}", "\u{1F98D}", "\u{1F98E}", "\u{1F98F}", "\u{1F990}", "\u{1F991}", "\u{1F992}", "\u{1F993}", "\u{1F994}", "\u{1F995}", "\u{1F996}", "\u{1F997}", "\u{1F998}", "\u{1F999}", "\u{1F99A}", "\u{1F99B}", "\u{1F99C}", "\u{1F99D}", "\u{1F99E}", "\u{1F99F}", "\u{1F9A0}", "\u{1F9A1}", "\u{1F9A2}", "\u{1F9A3}", "\u{1F9A4}", "\u{1F9A5}", "\u{1F9A6}", "\u{1F9A7}", "\u{1F9A8}", "\u{1F9A9}", "\u{1F9AA}", "\u{1F9AB}", "\u{1F9AC}", "\u{1F9AD}", "\u{1F9AE}", "\u{1F9AF}", "\u{1F9B4}", "\u{1F9B5}", "\u{1F9B6}", "\u{1F9B7}", "\u{1F9B8}", "\u{1F9B9}", "\u{1F9BA}", "\u{1F9BB}", "\u{1F9BC}", "\u{1F9BD}", "\u{1F9BE}", "\u{1F9BF}", "\u{1F9C0}", "\u{1F9C1}", "\u{1F9C2}", "\u{1F9C3}", "\u{1F9C4}", "\u{1F9C5}", "\u{1F9C6}", "\u{1F9C7}", "\u{1F9C8}", "\u{1F9C9}", "\u{1F9CA}", "\u{1F9CB}", "\u{1F9CD}", "\u{1F9CE}", "\u{1F9CF}", "\u{1F9D0}", "\u{1F9D1}", "\u{1F9D2}", "\u{1F9D3}", "\u{1F9D4}", "\u{1F9D5}", "\u{1F9D6}", "\u{1F9D7}", "\u{1F9D8}", "\u{1F9D9}", "\u{1F9DA}", "\u{1F9DB}", "\u{1F9DC}", "\u{1F9DD}", "\u{1F9DE}", "\u{1F9DF}", "\u{1F9E0}", "\u{1F9E1}", "\u{1F9E2}", "\u{1F9E3}", "\u{1F9E4}", "\u{1F9E5}", "\u{1F9E6}", "\u{1F9E7}", "\u{1F9E8}", "\u{1F9E9}", "\u{1F9EA}", "\u{1F9EB}", "\u{1F9EC}", "\u{1F9ED}", "\u{1F9EE}", "\u{1F9EF}", "\u{1F9F0}", "\u{1F9F1}", "\u{1F9F2}", "\u{1F9F3}", "\u{1F9F4}", "\u{1F9F5}", "\u{1F9F6}", "\u{1F9F7}", "\u{1F9F8}", "\u{1F9F9}", "\u{1F9FA}", "\u{1F9FB}", "\u{1F9FC}", "\u{1F9FD}", "\u{1F9FE}", "\u{1F9FF}", "\u{1FA70}", "\u{1FA71}", "\u{1FA72}", "\u{1FA73}", "\u{1FA74}", "\u{1FA78}", "\u{1FA79}", "\u{1FA7A}", "\u{1FA80}", "\u{1FA81}", "\u{1FA82}", "\u{1FA83}", "\u{1FA84}", "\u{1FA85}", "\u{1FA86}", "\u{1FA90}", "\u{1FA91}", "\u{1FA92}", "\u{1FA93}", "\u{1FA94}", "\u{1FA95}", "\u{1FA96}", "\u{1FA97}", "\u{1FA98}", "\u{1FA99}", "\u{1FA9A}", "\u{1FA9B}", "\u{1FA9C}", "\u{1FA9D}", "\u{1FA9E}", "\u{1FA9F}", "\u{1FAA0}", "\u{1FAA1}", "\u{1FAA2}", "\u{1FAA3}", "\u{1FAA4}", "\u{1FAA5}", "\u{1FAA6}", "\u{1FAA7}", "\u{1FAA8}", "\u{1FAB0}", "\u{1FAB1}", "\u{1FAB2}", "\u{1FAB3}", "\u{1FAB4}", "\u{1FAB5}", "\u{1FAB6}", "\u{1FAC0}", "\u{1FAC1}", "\u{1FAC2}", "\u{1FAD0}", "\u{1FAD1}", "\u{1FAD2}", "\u{1FAD3}", "\u{1FAD4}", "\u{1FAD5}", "\u{1FAD6}"];
  var Backpack = class extends Screen {
    div;
    constructor() {
      super("Backpack");
      App_default.title = "\u0420\u044E\u043A\u0437\u0430\u043A";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const back = document.createElement("button");
      back.className = "back";
      back.onclick = () => this.emit("back");
      header.appendChild(back);
      const backImg = document.createElement("img");
      backImg.width = 24;
      getTexture(`ui/Jb.png`).then((e) => backImg.src = e);
      back.appendChild(backImg);
      const titleElem = document.createElement("label");
      titleElem.textContent = "\u0420\u044E\u043A\u0437\u0430\u043A";
      header.appendChild(titleElem);
      this.on("back", () => {
        App_default.screen = new Dashboard();
      });
      this.init();
    }
    async init() {
      this.div = createElement("div", {
        css: {
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "10px"
        }
      });
      this.element.appendChild(this.div);
      this.update();
    }
    async update() {
      this.call("update_backpack");
      App_default.server.send("bpg", {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token
      });
      const d = await App_default.server.awaitPacket("bpg");
      const data = d.bp;
      const baits = data.baits;
      const bits = data.bits;
      const bds = data.bds;
      const bads = data.bads;
      const maxSize = data.bps;
      if (baits && baits.length > 0) {
        createElement("span", { text: `\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u044B`, appendTo: this.div });
        baits.forEach(async (bait) => {
          const id = bait.aio;
          const itmt = bait.itmt;
          const baitEl = createElement("div", {
            css: {
              display: "flex",
              flexDirection: "column",
              background: "#f4f4f433",
              borderRadius: "5px",
              padding: "10px",
              color: "white",
              gap: "5px"
            },
            appendTo: this.div
          });
          if (itmt == 0) {
            const emoji = bait.itmsps["1"] == 1 ? "\u{1F451}" : emojis[bait.itmsps["1"]];
            const title = createElement("span", { text: `VIP-\u0430\u043A\u043A\u0430\u0443\u043D\u0442 (${emoji})`, appendTo: baitEl });
            if (bait.iea > 0) {
              let show = bait.itmsps["0"] == 0;
              const da = createElement("div", { text: `\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u043D\u0430\u0447\u043E\u043A: `, appendTo: baitEl });
              const options = emojis.map((e, i) => `<option value="${i}" ${bait.itmsps["1"] == i ? "selected" : ""}>${i == 0 ? "\u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E" : e}</option>`).join("");
              const select = createElement("select", {
                html: options,
                appendTo: da
              });
              select.onchange = async () => {
                App_default.server.send("baied", {
                  bied: {
                    bio: id,
                    itmps: {
                      "1": parseInt(select.value)
                    }
                  }
                });
                await App_default.server.awaitPacket("baiedd");
                title.innerText = `VIP-\u0430\u043A\u043A\u0430\u0443\u043D\u0442 (${emojis[select.value]})`;
              };
              const vbtn = createElement("button", {
                text: !show ? "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0438\u043A\u043E\u043D\u043A\u0443" : "\u0421\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0438\u043A\u043E\u043D\u043A\u0443",
                appendTo: baitEl
              });
              vbtn.onclick = async () => {
                App_default.server.send("baied", {
                  bied: {
                    bio: id,
                    itmps: {
                      "0": show ? 1 : 0
                    }
                  }
                });
                await App_default.server.awaitPacket("baiedd");
                show = !show;
                vbtn.innerText = !show ? "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0438\u043A\u043E\u043D\u043A\u0443" : "\u0421\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0438\u043A\u043E\u043D\u043A\u0443";
              };
            } else {
              const vbtn = createElement("button", {
                text: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C",
                appendTo: baitEl
              });
              App_default.server.send("bairm", {
                birm: {
                  bio: id
                }
              });
              await App_default.server.awaitPacket("bairmd");
              this.update();
            }
            const timer = createElement("span", { text: formatSeconds2(bait.iea), appendTo: baitEl });
            if (bait.iea > 0) {
              this.setInterval("bait_timer_" + id, () => {
                if (bait.iea < 1) return;
                timer.innerText = formatSeconds2(--bait.iea);
              }, 1e3);
              this.once("update_backpack", () => {
                this.removeInterval("bait_timer_" + id);
              });
            }
          }
        });
      }
      const size = (bits ? bits.length : 0) + (bds ? bds.length : 0) + (bads ? bads.length : 0);
      createElement("span", { text: `\u0423 \u0432\u0430\u0441: ${size} \u043F\u0440\u0435\u0434\u043C\u0435\u0442${size % 100 > 10 && size % 100 < 20 ? "\u043E\u0432" : [0, 1].includes(size % 10) ? size % 10 == 1 ? "" : "\u043E\u0432" : "\u0430"}`, appendTo: this.div });
      createElement("span", { text: `\u0420\u0430\u0437\u043C\u0435\u0440: ${maxSize} \u044F\u0447\u0435\u0435\u043A`, css: { fontSize: "smaller" }, appendTo: this.div });
      if (bits) {
        for (let i = 0; i < bits.length; i++) {
          const bio = bits[i];
          const button = createElement("button", {
            text: "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C VIP-\u0430\u043A\u043A\u0430\u0443\u043D\u0442",
            appendTo: this.div
          });
          button.onclick = async () => {
            App_default.server.send("bia", { bio });
            await App_default.server.awaitPacket("biad");
          };
        }
      }
      createElement("span", { text: `\u041D\u0435 \u0432\u0441\u0435 \u0435\u0441\u0442\u044C, \u0441\u043A\u043E\u0440\u043E \u0440\u044E\u043A\u0437\u0430\u043A \u0431\u0443\u0434\u0435\u0442 \u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0442\u044C\u0441\u044F`, css: { fontSize: "smaller" }, appendTo: this.div });
    }
  };

  // game/src/screen/Dashboard.ts
  function pngToJpgBase64(file, quality = 0.9) {
    return new Promise((resolve, reject) => {
      if (file.type != "image/png") {
        reject(new Error("\u0424\u0430\u0439\u043B \u043D\u0435 PNG"));
        return;
      }
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
      };
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const jpgBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(jpgBase64);
      };
      img.onerror = () => reject(new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F"));
      reader.onerror = () => reject(new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0447\u0442\u0435\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u0430"));
      reader.readAsDataURL(file);
    });
  }
  var Dashboard = class _Dashboard extends Screen {
    constructor() {
      super("Dashboard");
      App_default.title = "\u041C\u0435\u043D\u044E";
      (async () => this.element.style.background = `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`)();
      const header = document.createElement("div");
      header.className = "header";
      this.element.appendChild(header);
      const logo = document.createElement("label");
      logo.textContent = "\u0411\u0430\u0444\u0438\u044F \u043E\u043D\u043B\u0430\u0439\u043D";
      header.appendChild(logo);
      this.on("back", () => App_default.destroy());
      this.init();
    }
    async init() {
      let changedAvatar = false;
      const div = createElement("div", {
        css: {
          textAlign: "center",
          fontSize: "smaller"
        }
      });
      this.element.appendChild(div);
      function updateInfo() {
        nick.textContent = App_default.user.username;
        getTexture(`rank/rank${Math.round(App_default.user.level / 2)}_36.png`).then((e) => rankImg.src = e);
        getAvatarImg({
          [PacketDataKeys_default.PLAYER_OBJECT_ID]: App_default.user.playerObjectId,
          [PacketDataKeys_default.PHOTO]: App_default.user.photo
        }).then((e) => {
          if (changedAvatar) return;
          changedAvatar = true;
          avatar.src = e;
        });
        rankLvl.textContent = `${App_default.user.level}`;
        rankProgress.max = App_default.user.nextLevelExperience;
        rankProgress.value = App_default.user.previousLevelExperience;
        rankLvl2.textContent = `${App_default.user.previousLevelExperience}/${App_default.user.nextLevelExperience}`;
      }
      const rankEl = createElement("div", {
        css: {
          display: "flex",
          width: "100%",
          padding: "10px",
          alignItems: "center"
        },
        appendTo: div
      });
      const rankImg = createElement("img", {
        width: 20,
        appendTo: rankEl
      });
      const rankLvl = createElement("span", { appendTo: rankEl });
      const rankProgress = createElement("progress", {
        css: {
          width: `calc(100% - 220px)`,
          margin: "5px"
        },
        value: "0",
        appendTo: rankEl
      });
      const rankLvl2 = createElement("span", { appendTo: rankEl });
      const btnSettings = createElement("button", { css: { width: "40px", height: "30px", lineHeight: "38px", padding: "0" }, appendTo: rankEl });
      const btnIconSettings = createElement("img", { width: 20, appendTo: btnSettings });
      getTexture("ui/ei.png").then((e) => btnIconSettings.src = e);
      btnSettings.onclick = () => App_default.screen = new Settings();
      const btnProfile = createElement("button", { css: { width: "40px", height: "30px", lineHeight: "38px", padding: "0" }, appendTo: rankEl });
      const btnIconProfile = createElement("img", { width: 20, appendTo: btnProfile });
      getTexture("ui/f-.png").then((e) => btnIconProfile.src = e);
      btnProfile.onclick = () => ProfileInfo(App_default.user.playerObjectId);
      const avatar = createElement("img", {
        css: {
          borderRadius: "100%",
          margin: "5px"
        },
        width: 100,
        height: 100
      });
      const nick = document.createElement("span");
      avatar.onclick = async () => {
        App_default.server.send(PacketDataKeys_default.USER_GET_DEFAULT_PHOTOS, {});
        const data2 = await App_default.server.awaitPacket(PacketDataKeys_default.USER_DEFAULT_PHOTOS);
        const photos = data2[PacketDataKeys_default.USER_DEFAULT_PHOTOS][PacketDataKeys_default.USER_DEFAULT_PHOTOS_IDS];
        photos.sort((a, b) => {
          const [ta, na] = [a[0], Number(a.slice(1))];
          const [tb, nb] = [b[0], Number(b.slice(1))];
          if (ta !== tb) return ta === "m" ? -1 : 1;
          return na - nb;
        });
        const box = new Box({ title: "\u0424\u041E\u0422\u041E \u041F\u0420\u041E\u0424\u0418\u041B\u042F", width: 325, height: 270, canCloseAnywhere: true });
        const e = createElement("div", {
          css: {
            display: "flex",
            padding: "5px",
            alignItems: "center",
            flexDirection: "column",
            gap: "3px"
          }
        });
        box.content.appendChild(e);
        const btnDeleteAva = document.createElement("button");
        btnDeleteAva.textContent = "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0443";
        btnDeleteAva.onclick = async () => {
          if (!await ConfirmBox_default("\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0444\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F?", { btnYes: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" })) return;
          App_default.server.send(PacketDataKeys_default.REMOVE_PHOTO, {
            [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
            // [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
            [PacketDataKeys_default.TOKEN]: App_default.user.token
          });
          const data3 = await App_default.server.awaitPacket([
            PacketDataKeys_default.DASHBOARD,
            PacketDataKeys_default.REMOVE_PHOTO
          ]);
          delete App_default.resources[`avatars_${App_default.user.objectId}`];
          App_default.user.photo = data3 ? data3.db && data3.db?.du?.ph || "1" : "1";
          await box.close();
          App_default.screen = new _Dashboard();
        };
        e.appendChild(btnDeleteAva);
        const btnUpload = document.createElement("button");
        btnUpload.textContent = "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C";
        btnUpload.onclick = () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/png, image/jpeg";
          input.style.display = "none";
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            if (!["image/png", "image/jpeg"].includes(file.type)) {
              MessageBox_default("\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B \u0442\u043E\u043B\u044C\u043A\u043E PNG \u0438 JPG");
              return;
            }
            let base64;
            try {
              if (file.type == "image/png") {
                const jpgDataUrl = await pngToJpgBase64(file);
                base64 = jpgDataUrl.split(",")[1];
              } else {
                base64 = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result.split(",")[1]);
                  reader.onerror = () => reject();
                  reader.readAsDataURL(file);
                });
              }
            } catch {
              MessageBox_default("\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F");
              return;
            }
            App_default.server.send(PacketDataKeys_default.UPLOAD_PHOTO, {
              [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
              // [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
              [PacketDataKeys_default.TOKEN]: App_default.user.token,
              [PacketDataKeys_default.FILE]: base64
            });
            const data3 = await App_default.server.awaitPacket([
              PacketDataKeys_default.DASHBOARD,
              PacketDataKeys_default.WRONG_FILE_TYPE
            ]);
            if (data3[PacketDataKeys_default.TYPE] == PacketDataKeys_default.WRONG_FILE_TYPE) {
              MessageBox_default("\u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B \u0442\u043E\u043B\u044C\u043A\u043E PNG \u0438 JPG");
              return;
            }
            delete App_default.resources[`avatars_${App_default.user.objectId}`];
            App_default.user.photo = data3 ? data3.db && data3.db?.du?.ph || "1" : "1";
            await box.close();
            App_default.screen = new _Dashboard();
          };
          document.body.appendChild(input);
          input.click();
          input.remove();
        };
        e.appendChild(btnUpload);
        const orList = createElement("span", {
          css: {
            padding: "10px",
            color: "black"
          },
          text: "\u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430:"
        });
        e.appendChild(orList);
        const images = createElement("div", {
          css: {
            display: "flex",
            flexWrap: "wrap",
            width: "300px",
            height: "100px",
            background: "#969696",
            borderRadius: "10px",
            overflowY: "overlay",
            padding: "5px"
          }
        });
        for (const p of photos) {
          const img = document.createElement("img");
          img.src = `https://dottap.com/mafia/profile_photo/default/${p}.jpg`;
          img.width = img.height = 50;
          img.style.borderRadius = "100%";
          img.style.padding = "2px";
          img.onmousedown = (e2) => e2.preventDefault();
          img.onclick = async () => {
            App_default.server.send("ussdph", {
              [PacketDataKeys_default.PHOTO]: p,
              [PacketDataKeys_default.PLAYER_OBJECT_ID]: App_default.user.playerObjectId,
              [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
              [PacketDataKeys_default.TOKEN]: App_default.user.token
            });
            await App_default.server.awaitPacket("ussdph");
            delete App_default.resources[`avatars_${App_default.user.objectId}`];
            App_default.user.photo = p;
            avatar.src = img.src;
          };
          images.appendChild(img);
        }
        e.appendChild(images);
        await box.wait("destroy");
      };
      avatar.onmousedown = (e) => e.preventDefault();
      nick.textContent = App_default.user.username;
      if (App_default.settings.data.hideUsername) nick.style.filter = "blur(5px)";
      div.appendChild(avatar);
      div.appendChild(document.createElement("br"));
      div.appendChild(nick);
      const info = document.createElement("div");
      info.innerHTML = `\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 \u0411\u0430\u0444\u0438\u044E \u043E\u043D\u043B\u0430\u0439\u043D`.replaceAll(`
`, "<br/>");
      info.style.padding = "10px";
      div.appendChild(info);
      const btnRooms = document.createElement("button");
      btnRooms.textContent = "\u041A\u043E\u043C\u043D\u0430\u0442\u044B";
      btnRooms.style.width = "60%";
      btnRooms.style.margin = "3px";
      btnRooms.onclick = () => App_default.screen = new Rooms();
      div.appendChild(btnRooms);
      div.appendChild(document.createElement("br"));
      const btnMM = document.createElement("button");
      btnMM.textContent = "\u0421\u043E\u0440\u0435\u0432\u043D\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439";
      btnMM.style.width = "60%";
      btnMM.style.margin = "3px";
      btnMM.onclick = () => App_default.screen = new Matchmaking();
      div.appendChild(btnMM);
      div.appendChild(document.createElement("br"));
      const btnGlobalChat = document.createElement("button");
      btnGlobalChat.textContent = "\u0427\u0430\u0442";
      btnGlobalChat.style.width = "60%";
      btnGlobalChat.style.margin = "3px";
      btnGlobalChat.onclick = () => App_default.screen = new GlobalChat();
      div.appendChild(btnGlobalChat);
      div.appendChild(document.createElement("br"));
      const btnFriends = document.createElement("button");
      btnFriends.textContent = "\u0414\u0440\u0443\u0437\u044C\u044F";
      btnFriends.style.width = "60%";
      btnFriends.style.margin = "3px";
      btnFriends.onclick = () => App_default.screen = new Friends();
      div.appendChild(btnFriends);
      div.appendChild(document.createElement("br"));
      const btnHistory = document.createElement("button");
      btnHistory.textContent = "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0433\u0440";
      btnHistory.style.width = "60%";
      btnHistory.style.margin = "3px";
      btnHistory.onclick = () => App_default.screen = new History();
      div.appendChild(btnHistory);
      div.appendChild(document.createElement("br"));
      const btnBackpack = document.createElement("button");
      btnBackpack.textContent = "\u0420\u044E\u043A\u0437\u0430\u043A";
      btnBackpack.style.width = "60%";
      btnBackpack.style.margin = "3px";
      btnBackpack.onclick = () => App_default.screen = new Backpack();
      div.appendChild(btnBackpack);
      div.appendChild(document.createElement("br"));
      if (isMobile()) {
        const btnFullScreen = document.createElement("button");
        btnFullScreen.textContent = "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C";
        btnFullScreen.style.width = "60%";
        btnFullScreen.style.margin = "3px";
        btnFullScreen.onclick = async () => {
          const elem = document.body;
          const fsElem = document.fullscreenElement ?? document.webkitFullscreenElement ?? document.mozFullScreenElement ?? document.msFullscreenElement;
          if (!elem.requestFullscreen) {
            MessageBox_default(`\u041F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u043D\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442, \u0443\u0432\u044B..`);
            btnFullScreen.disabled = true;
            return;
          }
          try {
            if (!fsElem) await elem.requestFullscreen();
            else await document.exitFullscreen();
            if (fsElem) {
              btnFullScreen.textContent = "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C";
            } else {
              btnFullScreen.textContent = "\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C";
            }
          } catch (e) {
            MessageBox_default(`\u041E\u0448\u0438\u0431\u043A\u0430: ${e}`);
          }
        };
        div.appendChild(btnFullScreen);
        const btnClose = document.createElement("button");
        btnClose.textContent = "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0438\u0433\u0440\u0443";
        btnClose.style.width = "60%";
        btnClose.style.margin = "3px";
        btnClose.onclick = () => App_default.win.close();
        div.appendChild(btnClose);
      }
      updateInfo();
      App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_DASHBOARD, {
        [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
        [PacketDataKeys_default.TOKEN]: App_default.user.token
      });
      const data = await App_default.server.awaitPacket(PacketDataKeys_default.DASHBOARD);
      const db = data[PacketDataKeys_default.DASHBOARD];
      const du = db[PacketDataKeys_default.DASHBOARD_USER];
      App_default.user.update(du);
      App_default.user.goldCoins = db[PacketDataKeys_default.USER_ACCOUNT_COINS][PacketDataKeys_default.GOLD_COINS];
      App_default.user.sliverCoins = db[PacketDataKeys_default.USER_ACCOUNT_COINS][PacketDataKeys_default.SILVER_COINS];
      updateInfo();
      if (du[PacketDataKeys_default.USERNAME] == "") (async () => {
        async function send() {
          const uu = await PromptBox_default(`\u0414\u043B\u044F \u0438\u0433\u0440\u044B \u0438 \u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0441 \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u0438\u0433\u0440\u043E\u043A\u0430\u043C\u0438 \u0443 \u0432\u0430\u0441 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u041D\u0438\u043A\u043D\u044D\u0439\u043C`);
          App_default.server.send(PacketDataKeys_default.USERNAME_SET, {
            [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
            [PacketDataKeys_default.TOKEN]: App_default.user.token,
            [PacketDataKeys_default.USERNAME]: uu
          });
        }
        this.on("message", async (json) => {
          if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USERNAME_HAS_WRONG_SYMBOLS) {
            await MessageBox_default(`\u0414\u043B\u044F \u043D\u0438\u043A\u043D\u0435\u0439\u043C\u0430 \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E 0-9 \u0430-\u042F a-Z \u0441\u0438\u043C\u0432\u043E\u043B\u044B`);
            send();
          } else if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USERNAME_IS_EXISTS) {
            await MessageBox_default(`\u0414\u0430\u043D\u043D\u044B\u0439 \u043D\u0438\u043A\u043D\u0435\u0439\u043C \u0443\u0436\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D`);
            await send();
          } else if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USERNAME_IS_OUT_OF_BOUNDS) {
            await MessageBox_default(`\u041D\u0438\u043A\u043D\u0435\u0439\u043C \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0438\u043B\u0438 \u0434\u043B\u0438\u043D\u043D\u044B\u0439.
\u041D\u0438\u043A\u043D\u0435\u0439\u043C \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0441\u0442\u043E\u044F\u0442\u044C \u0438\u0437 3-12 \u0441\u0438\u043C\u0432\u043E\u043B\u044B`);
            await send();
          } else if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USERNAME_IS_EMPTY) {
            await MessageBox_default(`\u041D\u0438\u043A\u043D\u0435\u0439\u043C \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C`);
            await send();
          } else if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USERNAME_SET) {
            const profiles = JSON.parse(await fs_default.readFile(App_default.getPathProfiles()));
            const acc = profiles.find((e) => e.name == "");
            if (!acc) {
              alert(`\u041E\u0448\u0438\u0431\u043A\u0430... \u041E\u0442\u043F\u0440\u0430\u0432\u044C \u044D\u0442\u0443 \u043E\u0448\u0438\u0431\u043A\u0443 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0443

 ${JSON.stringify(profiles)}`);
              return;
            }
            acc.name = json[PacketDataKeys_default.USERNAME];
            await fs_default.writeFile(App_default.getPathProfiles(), JSON.stringify(profiles));
            App_default.screen = new _Dashboard();
          } else if (json[PacketDataKeys_default.TYPE] == PacketDataKeys_default.SIGN_IN_ERROR) {
            await MessageBox_default(`\u0427\u0442\u043E-\u0442\u043E \u043D\u0435 \u043F\u043E\u0448\u043B\u043E \u0442\u0430\u043A
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: ${json[PacketDataKeys_default.ERROR]}`);
            await send();
          }
        });
        send();
      })();
      const requests = Number(db[PacketDataKeys_default.FRIENDSHIP_REQUESTS]);
      const newMessages = Number(db[PacketDataKeys_default.NEW_MESSAGES]);
      if (newMessages > 0 || requests > 0) {
        btnFriends.innerHTML = "";
        const div2 = document.createElement("div");
        div2.textContent = `\u0414\u0440\u0443\u0437\u044C\u044F`;
        btnFriends.appendChild(div2);
        {
          const div1 = document.createElement("div");
          div1.style.display = "flex";
          div1.style.alignItems = "center";
          div1.textContent = newMessages > 0 ? newMessages + "" : "";
          if (newMessages > 0) {
            const img = document.createElement("img");
            img.width = 18;
            img.height = 14;
            img.style.marginLeft = "5px";
            getTexture("ui/0Y.png").then((e) => img.src = e);
            div1.appendChild(img);
          }
          btnFriends.appendChild(div1);
          {
            const e = document.createElement("div");
            e.style.display = "flex";
            e.style.alignItems = "center";
            e.style.justifyContent = "flex-end";
            e.textContent = requests > 0 ? requests + "" : "";
            if (requests > 0) {
              const img = document.createElement("img");
              img.width = 18;
              img.height = 18;
              img.style.marginLeft = "5px";
              getTexture("ui/-8.png").then((e2) => img.src = e2);
              e.appendChild(img);
            }
            div1.appendChild(e);
          }
        }
      }
    }
  };

  // game/src/server/Auth.ts
  function generateRandomToken(length = 32) {
    const hex = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += hex[Math.floor(Math.random() * hex.length)];
    }
    return result;
  }
  function tokenHex(nBytes) {
    const bytes = new Uint8Array(nBytes);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  var Auth = class {
    constructor(server) {
      this.server = server;
    }
    lastAuth;
    profileVersion = 1;
    /** true - добавлен, false - существует */
    async addProfile({ name, email, password, token, userId, playerUserId, photo }) {
      const profiles = JSON.parse(await fs_default.readFile(App_default.getPathProfiles()));
      const existing = profiles.findIndex((e) => e.name == name || e.token == token || e.userId == userId || e.playerUserId == playerUserId);
      if (existing != -1) {
        const p = profiles[existing];
        const oldVersion = p.version;
        profiles[existing] = {
          version: this.profileVersion,
          name: name || p.name,
          email,
          password,
          token,
          userId,
          playerUserId: playerUserId || p.playerUserId,
          photo: photo || p.photo
        };
        await fs_default.writeFile(App_default.getPathProfiles(), JSON.stringify(profiles));
        return this.profileVersion != oldVersion;
      }
      profiles.push({
        version: this.profileVersion,
        name: name ?? "",
        email,
        password,
        token,
        userId,
        playerUserId,
        photo
      });
      await fs_default.writeFile(App_default.getPathProfiles(), JSON.stringify(profiles));
      return true;
    }
    async auth(auth) {
      if (!auth) auth = App_default.config.auth;
      if (App_default.screen.name == "Loading") App_default.screen.title = "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F..";
      if (auth) {
        const data = await this.signIn(auth.email, auth.password, auth.token, auth.userId);
        if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.SIGN_IN_ERROR) {
          const err = data[PacketDataKeys_default.ERROR];
          if (err == -9) {
            await MessageBox_default(`\u041A\u0430\u043F\u0447\u0430 \u043D\u0435 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u0430
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -9`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == -8) {
            await MessageBox_default(`\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -8`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == -7) {
            await MessageBox_default(`\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -7`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == -6) {
            await MessageBox_default(`\u043E\u0448\u0438\u0431\u043A\u0430_\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0433\u043E_\u043F\u0440\u0438\u0437\u043D\u0430\u043A\u0430_\u0432_\u043F\u0430\u043C\u044F\u0442\u0438_\u043F\u043E\u0447\u0442\u044B_\u0438\u043B\u0438_\u043D\u0435_\u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -6`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == -5) {
            await MessageBox_default(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u0445\u043E\u0434\u0430 \u0432 \u0433\u0443\u0433\u043B
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -5`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == -4) {
            await MessageBox_default(`\u0421\u0435\u0441\u0441\u0438\u044F \u043D\u0435\u0430\u043A\u0442\u0438\u0432\u043D\u0430
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -4`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == -3) {
            await MessageBox_default(`\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -3`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == -1) {
            await MessageBox_default(`\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u043D\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: -1`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          } else if (err == 0) {
            await MessageBox_default(`\u041B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u043D\u0443\u0436\u043D\u044B
\u041A\u043E\u0434 \u043E\u0448\u0438\u0431\u043A\u0438: 0`, { title: `\u041E\u0428\u0418\u0411\u041A\u0410` });
          }
          App_default.screen = new Authorization();
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_SIGN_IN) {
          let name = data[PacketDataKeys_default.USER_ID][PacketDataKeys_default.USERNAME];
          let token = auth.token || data[PacketDataKeys_default.USER_ID][PacketDataKeys_default.TOKEN];
          let userId = auth.userId || data[PacketDataKeys_default.USER_ID][PacketDataKeys_default.OBJECT_ID];
          let playerUserId = auth.playerUserId ?? "";
          let photo = auth.photo ?? "";
          const isReconnect = this.lastAuth && this.lastAuth.userId == userId;
          this.lastAuth = {
            token,
            userId
          };
          token = App_default.user.token = data[PacketDataKeys_default.USER_ID][PacketDataKeys_default.TOKEN];
          userId = App_default.user.objectId = data[PacketDataKeys_default.USER_ID][PacketDataKeys_default.USER_OBJECT_ID];
          if (await this.addProfile({
            name,
            email: auth.email,
            password: auth.password,
            token,
            userId,
            playerUserId,
            photo
          })) {
            App_default.server.send(PacketDataKeys_default.ADD_CLIENT_TO_DASHBOARD, {
              [PacketDataKeys_default.USER_OBJECT_ID]: App_default.user.objectId,
              [PacketDataKeys_default.TOKEN]: App_default.user.token
            });
            const data2 = await App_default.server.awaitPacket(PacketDataKeys_default.DASHBOARD);
            name = data2.db.du.u;
            playerUserId = data2.db.du.puo;
            photo = data2.db.du.ph;
            await this.addProfile({
              name,
              email: auth.email,
              password: auth.password,
              token,
              userId,
              playerUserId,
              photo
            });
          }
          App_default.user.bToken = generateRandomToken();
          if (isReconnect) {
            App_default.screen.reconnect();
          } else {
            App_default.screen = new Dashboard();
          }
          return true;
        }
      } else {
        await MessageBox_default("\u0423 \u0432\u0430\u0441 \u043D\u0435\u0442 \u043F\u0440\u043E\u0444\u0438\u043B\u044F");
      }
      return false;
    }
    async signIn(email, password, token, userId) {
      if (email && password) {
        this.server.send(PacketDataKeys_default.SIGN_IN, { [PacketDataKeys_default.EMAIL]: email, [PacketDataKeys_default.PASSWORD]: md5salt(password), cpt: "", ds: "browser", [PacketDataKeys_default.DEVICE_ID]: tokenHex(8) });
      } else if (userId && token) {
        this.server.send(PacketDataKeys_default.SIGN_IN, { [PacketDataKeys_default.OBJECT_ID]: userId, [PacketDataKeys_default.TOKEN]: token, [PacketDataKeys_default.DEVICE_ID]: tokenHex(8) });
      }
      return await this.server.awaitPacket([PacketDataKeys_default.USER_SIGN_IN, PacketDataKeys_default.SIGN_IN_ERROR]);
    }
    async signUp({ email, password }) {
      await MessageBox_default("\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F \u043D\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0438\u0437-\u0437\u0430 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430\n\u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u043D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043D\u0430\u043C @bafiaonlinebot, \u0435\u0441\u043B\u0438 \u043D\u0443\u0436\u043D\u043E \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442", { btnText: "\u041B\u0410\u0414\u041D\u041E", height: 200 });
      return;
      let response;
      let result;
      try {
        response = await fetch(`https://api.mafia.dottap.com/user/sign_up`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body: new URLSearchParams({
            email,
            username: "",
            password: md5salt(password),
            deviceId: tokenHex(8),
            lang: "RUS"
          })
        });
        result = await response.json();
      } catch (e) {
        await MessageBox_default("\u041E\u0448\u0438\u0431\u043A\u0430: " + e, { title: "\u041E\u0428\u0418\u0411\u041A\u0410" });
        return;
      }
      if (result.error) {
        if (result.error == "USING_TEMP_EMAIL") {
          await MessageBox_default(`\u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0440\u0432\u0438\u0441\u044B \u0434\u043B\u044F \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0439 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 email.
\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0435 \u0441\u0435\u0440\u0432\u0438\u0441\u044B, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 Gmail, Mail.Ru, Yandex, Yahoo \u0438 \u0442\u0434.`);
        } else if (result.error == "EMAIL_EXISTS") {
          await MessageBox_default(`\u0414\u0430\u043D\u043D\u044B\u0439 email \u0443\u0436\u0435 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D`);
        }
        return;
      }
      if (result[PacketDataKeys_default.OBJECT_ID]) {
        const userId = result[PacketDataKeys_default.OBJECT_ID];
        const token = result[PacketDataKeys_default.TOKEN];
        this.addProfile({
          name: "",
          email,
          password,
          token,
          userId
        });
        App_default.user.bToken = generateRandomToken();
        App_default.screen = new Dashboard();
      }
    }
  };

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/urlToObj.js
  function urlToObject(url) {
    return {
      href: url.href,
      protocol: url.protocol,
      username: url.username,
      password: url.password,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      searchParams: [...url.searchParams].map(([key, value]) => ({ key, value })),
      hash: url.hash,
      origin: url.origin
    };
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/prettyLogStyles.js
  var prettyLogStyles = {
    reset: [0, 0],
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29],
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    blackBright: [90, 39],
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39],
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    bgBlackBright: [100, 49],
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  };

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/formatTemplate.js
  function formatTemplate(settings, template, values, hideUnsetPlaceholder = false) {
    const templateString = String(template);
    const ansiColorWrap = (placeholderValue, code) => `\x1B[${code[0]}m${placeholderValue}\x1B[${code[1]}m`;
    const styleWrap = (value, style) => {
      if (style != null && typeof style === "string") {
        return ansiColorWrap(value, prettyLogStyles[style]);
      } else if (style != null && Array.isArray(style)) {
        return style.reduce((prevValue, thisStyle) => styleWrap(prevValue, thisStyle), value);
      } else {
        if (style != null && style[value.trim()] != null) {
          return styleWrap(value, style[value.trim()]);
        } else if (style != null && style["*"] != null) {
          return styleWrap(value, style["*"]);
        } else {
          return value;
        }
      }
    };
    const defaultStyle = null;
    return templateString.replace(/{{(.+?)}}/g, (_, placeholder) => {
      const value = values[placeholder] != null ? String(values[placeholder]) : hideUnsetPlaceholder ? "" : _;
      return settings.stylePrettyLogs ? styleWrap(value, settings?.prettyLogStyles?.[placeholder] ?? defaultStyle) + ansiColorWrap("", prettyLogStyles.reset) : value;
    });
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/formatNumberAddZeros.js
  function formatNumberAddZeros(value, digits = 2, addNumber = 0) {
    if (value != null && isNaN(value)) {
      return "";
    }
    value = value != null ? value + addNumber : value;
    return digits === 2 ? value == null ? "--" : value < 10 ? "0" + value : value.toString() : value == null ? "---" : value < 10 ? "00" + value : value < 100 ? "0" + value : value.toString();
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/internal/metaFormatting.js
  function buildPrettyMeta(settings, meta) {
    if (meta == null) {
      return {
        text: "",
        template: settings.prettyLogTemplate,
        placeholders: {}
      };
    }
    let template = settings.prettyLogTemplate;
    const placeholderValues = {};
    if (template.includes("{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}")) {
      template = template.replace("{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}", "{{dateIsoStr}}");
    } else {
      if (settings.prettyLogTimeZone === "UTC") {
        placeholderValues["yyyy"] = meta.date?.getUTCFullYear() ?? "----";
        placeholderValues["mm"] = formatNumberAddZeros(meta.date?.getUTCMonth(), 2, 1);
        placeholderValues["dd"] = formatNumberAddZeros(meta.date?.getUTCDate(), 2);
        placeholderValues["hh"] = formatNumberAddZeros(meta.date?.getUTCHours(), 2);
        placeholderValues["MM"] = formatNumberAddZeros(meta.date?.getUTCMinutes(), 2);
        placeholderValues["ss"] = formatNumberAddZeros(meta.date?.getUTCSeconds(), 2);
        placeholderValues["ms"] = formatNumberAddZeros(meta.date?.getUTCMilliseconds(), 3);
      } else {
        placeholderValues["yyyy"] = meta.date?.getFullYear() ?? "----";
        placeholderValues["mm"] = formatNumberAddZeros(meta.date?.getMonth(), 2, 1);
        placeholderValues["dd"] = formatNumberAddZeros(meta.date?.getDate(), 2);
        placeholderValues["hh"] = formatNumberAddZeros(meta.date?.getHours(), 2);
        placeholderValues["MM"] = formatNumberAddZeros(meta.date?.getMinutes(), 2);
        placeholderValues["ss"] = formatNumberAddZeros(meta.date?.getSeconds(), 2);
        placeholderValues["ms"] = formatNumberAddZeros(meta.date?.getMilliseconds(), 3);
      }
    }
    const dateInSettingsTimeZone = settings.prettyLogTimeZone === "UTC" ? meta.date : meta.date != null ? new Date(meta.date.getTime() - meta.date.getTimezoneOffset() * 6e4) : void 0;
    placeholderValues["rawIsoStr"] = dateInSettingsTimeZone?.toISOString() ?? "";
    placeholderValues["dateIsoStr"] = dateInSettingsTimeZone?.toISOString().replace("T", " ").replace("Z", "") ?? "";
    placeholderValues["logLevelName"] = meta.logLevelName;
    placeholderValues["fileNameWithLine"] = meta.path?.fileNameWithLine ?? "";
    placeholderValues["filePathWithLine"] = meta.path?.filePathWithLine ?? "";
    placeholderValues["fullFilePath"] = meta.path?.fullFilePath ?? "";
    let parentNamesString = settings.parentNames?.join(settings.prettyErrorParentNamesSeparator);
    parentNamesString = parentNamesString != null && meta.name != null ? parentNamesString + settings.prettyErrorParentNamesSeparator : void 0;
    const combinedName = meta.name != null || parentNamesString != null ? `${parentNamesString ?? ""}${meta.name ?? ""}` : "";
    placeholderValues["name"] = combinedName;
    placeholderValues["nameWithDelimiterPrefix"] = combinedName.length > 0 ? settings.prettyErrorLoggerNameDelimiter + combinedName : "";
    placeholderValues["nameWithDelimiterSuffix"] = combinedName.length > 0 ? combinedName + settings.prettyErrorLoggerNameDelimiter : "";
    if (settings.overwrite?.addPlaceholders != null) {
      settings.overwrite.addPlaceholders(meta, placeholderValues);
    }
    return {
      text: formatTemplate(settings, template, placeholderValues),
      template,
      placeholders: placeholderValues
    };
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/internal/stackTrace.js
  var DEFAULT_IGNORE_PATTERNS = [
    /(?:^|[\\/])node_modules[\\/].*tslog/i,
    /(?:^|[\\/])deps[\\/].*tslog/i,
    /tslog[\\/]+src[\\/]+internal[\\/]/i,
    /tslog[\\/]+src[\\/]BaseLogger/i,
    /tslog[\\/]+src[\\/]index/i
  ];
  function splitStackLines(error2) {
    const stack = typeof error2?.stack === "string" ? error2.stack : void 0;
    if (stack == null || stack.length === 0) {
      return [];
    }
    return stack.split("\n").map((line) => line.trimEnd());
  }
  function sanitizeStackLines(lines) {
    return lines.filter((line) => line.length > 0 && !/^\s*Error\b/.test(line));
  }
  function toStackFrames(lines, parseLine) {
    const frames = [];
    for (const line of lines) {
      const frame = parseLine(line);
      if (frame != null) {
        frames.push(frame);
      }
    }
    return frames;
  }
  function findFirstExternalFrameIndex(frames, ignorePatterns = DEFAULT_IGNORE_PATTERNS) {
    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index];
      const filePathCandidate = frame.filePath ?? "";
      const fullPathCandidate = frame.fullFilePath ?? "";
      if (!ignorePatterns.some((pattern) => pattern.test(filePathCandidate) || pattern.test(fullPathCandidate))) {
        return index;
      }
    }
    return 0;
  }
  function getCleanStackLines(error2) {
    return sanitizeStackLines(splitStackLines(error2));
  }
  function buildStackTrace(error2, parseLine) {
    return toStackFrames(getCleanStackLines(error2), parseLine);
  }
  function clampIndex(index, maxExclusive) {
    if (index < 0) {
      return 0;
    }
    if (index >= maxExclusive) {
      return Math.max(0, maxExclusive - 1);
    }
    return index;
  }
  function getDefaultIgnorePatterns() {
    return [...DEFAULT_IGNORE_PATTERNS];
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/internal/errorUtils.js
  var DEFAULT_CAUSE_DEPTH = 5;
  function collectErrorCauses(error2, options = {}) {
    const maxDepth = options.maxDepth ?? DEFAULT_CAUSE_DEPTH;
    const causes = [];
    const visited = /* @__PURE__ */ new Set();
    let current = error2;
    let depth = 0;
    while (current != null && depth < maxDepth) {
      const cause = current?.cause;
      if (cause == null || visited.has(cause)) {
        break;
      }
      visited.add(cause);
      causes.push(toError(cause));
      current = cause;
      depth += 1;
    }
    return causes;
  }
  function toError(value) {
    if (value instanceof Error) {
      return value;
    }
    const error2 = new Error(typeof value === "string" ? value : JSON.stringify(value));
    if (typeof value === "object" && value != null) {
      Object.assign(error2, value);
    }
    return error2;
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/internal/jsonStringifyRecursive.js
  function jsonStringifyRecursive(obj) {
    const cache = /* @__PURE__ */ new Set();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (cache.has(value)) {
          return "[Circular]";
        }
        cache.add(value);
      }
      if (typeof value === "bigint") {
        return `${value}`;
      }
      if (typeof value === "undefined") {
        return "[undefined]";
      }
      return value;
    });
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/internal/util.inspect.polyfill.js
  function inspect(obj, opts) {
    const ctx = {
      seen: [],
      stylize: stylizeNoColor
    };
    if (opts != null) {
      _extend(ctx, opts);
    }
    if (isUndefined(ctx.showHidden))
      ctx.showHidden = false;
    if (isUndefined(ctx.depth))
      ctx.depth = 2;
    if (isUndefined(ctx.colors))
      ctx.colors = true;
    if (isUndefined(ctx.customInspect))
      ctx.customInspect = true;
    if (ctx.colors)
      ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }
  inspect.colors = prettyLogStyles;
  inspect.styles = {
    special: "cyan",
    number: "yellow",
    boolean: "yellow",
    undefined: "grey",
    null: "bold",
    string: "green",
    date: "magenta",
    regexp: "red"
  };
  function isBoolean(arg) {
    return typeof arg === "boolean";
  }
  function isUndefined(arg) {
    return arg === void 0;
  }
  function stylizeNoColor(str) {
    return str;
  }
  function stylizeWithColor(str, styleType) {
    const style = inspect.styles[styleType];
    if (style != null && inspect?.colors?.[style]?.[0] != null && inspect?.colors?.[style]?.[1] != null) {
      return "\x1B[" + inspect.colors[style][0] + "m" + str + "\x1B[" + inspect.colors[style][1] + "m";
    } else {
      return str;
    }
  }
  function isFunction(arg) {
    return typeof arg === "function";
  }
  function isString(arg) {
    return typeof arg === "string";
  }
  function isNumber(arg) {
    return typeof arg === "number";
  }
  function isNull(arg) {
    return arg === null;
  }
  function hasOwn(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
  function isRegExp(re) {
    return isObject(re) && objectToString(re) === "[object RegExp]";
  }
  function isObject(arg) {
    return typeof arg === "object" && arg !== null;
  }
  function isError(e) {
    return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
  }
  function isDate(d) {
    return isObject(d) && objectToString(d) === "[object Date]";
  }
  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }
  function arrayToHash(array) {
    const hash = {};
    array.forEach((val) => {
      hash[val] = true;
    });
    return hash;
  }
  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    const output = [];
    for (let i = 0, l = value.length; i < l; ++i) {
      if (hasOwn(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
      } else {
        output.push("");
      }
    }
    keys.forEach((key) => {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
      }
    });
    return output;
  }
  function formatError(value) {
    return "[" + Error.prototype.toString.call(value) + "]";
  }
  function formatValue(ctx, value, recurseTimes = 0) {
    if (ctx.customInspect && value != null && isFunction(value) && value?.inspect !== inspect && !(value?.constructor && value?.constructor.prototype === value)) {
      if (typeof value.inspect !== "function" && value.toString != null) {
        return value.toString();
      }
      let ret = value?.inspect(recurseTimes, ctx);
      if (!isString(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }
      return ret;
    }
    const primitive = formatPrimitive(ctx, value);
    if (primitive) {
      return primitive;
    }
    let keys = Object.keys(value);
    const visibleKeys = arrayToHash(keys);
    try {
      if (ctx.showHidden && Object.getOwnPropertyNames) {
        keys = Object.getOwnPropertyNames(value);
      }
    } catch {
    }
    if (isError(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
      return formatError(value);
    }
    if (keys.length === 0) {
      if (isFunction(ctx.stylize)) {
        if (isFunction(value)) {
          const name = value.name ? ": " + value.name : "";
          return ctx.stylize("[Function" + name + "]", "special");
        }
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
        }
        if (isDate(value)) {
          return ctx.stylize(Date.prototype.toISOString.call(value), "date");
        }
        if (isError(value)) {
          return formatError(value);
        }
      } else {
        return value;
      }
    }
    let base = "";
    let array = false;
    let braces = ["{\n", "\n}"];
    if (Array.isArray(value)) {
      array = true;
      braces = ["[\n", "\n]"];
    }
    if (isFunction(value)) {
      const n = value.name ? ": " + value.name : "";
      base = " [Function" + n + "]";
    }
    if (isRegExp(value)) {
      base = " " + RegExp.prototype.toString.call(value);
    }
    if (isDate(value)) {
      base = " " + Date.prototype.toUTCString.call(value);
    }
    if (isError(value)) {
      base = " " + formatError(value);
    }
    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }
    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
      } else {
        return ctx.stylize("[Object]", "special");
      }
    }
    ctx.seen.push(value);
    let output;
    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map((key) => {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }
    ctx.seen.pop();
    return reduceToSingleString(output, base, braces);
  }
  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    let name, str;
    let desc = { value: void 0 };
    try {
      desc.value = value[key];
    } catch {
    }
    try {
      if (Object.getOwnPropertyDescriptor) {
        desc = Object.getOwnPropertyDescriptor(value, key) || desc;
      }
    } catch {
    }
    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize("[Getter/Setter]", "special");
      } else {
        str = ctx.stylize("[Getter]", "special");
      }
    } else {
      if (desc.set) {
        str = ctx.stylize("[Setter]", "special");
      }
    }
    if (!hasOwn(visibleKeys, key)) {
      name = "[" + key + "]";
    }
    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, void 0);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }
        if (str.indexOf("\n") > -1) {
          if (array) {
            str = str.split("\n").map((line) => {
              return "  " + line;
            }).join("\n").substr(2);
          } else {
            str = "\n" + str.split("\n").map((line) => {
              return "   " + line;
            }).join("\n");
          }
        }
      } else {
        str = ctx.stylize("[Circular]", "special");
      }
    }
    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }
      name = JSON.stringify("" + key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, "name");
      } else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, "\\'").replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, "string");
      }
    }
    return name + ": " + str;
  }
  function formatPrimitive(ctx, value) {
    if (isUndefined(value))
      return ctx.stylize("undefined", "undefined");
    if (isString(value)) {
      const simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, "\\'") + "'";
      return ctx.stylize(simple, "string");
    }
    if (isNumber(value))
      return ctx.stylize("" + value, "number");
    if (isBoolean(value))
      return ctx.stylize("" + value, "boolean");
    if (isNull(value))
      return ctx.stylize("null", "null");
  }
  function reduceToSingleString(output, base, braces) {
    return braces[0] + (base === "" ? "" : base + "\n") + "  " + output.join(",\n  ") + " " + braces[1];
  }
  function _extend(origin, add) {
    const typedOrigin = { ...origin };
    if (!add || !isObject(add))
      return origin;
    const clonedAdd = { ...add };
    const keys = Object.keys(add);
    let i = keys.length;
    while (i--) {
      typedOrigin[keys[i]] = clonedAdd[keys[i]];
    }
    return typedOrigin;
  }
  function formatWithOptions(inspectOptions, ...args) {
    const ctx = {
      seen: [],
      stylize: stylizeNoColor
    };
    if (inspectOptions != null) {
      _extend(ctx, inspectOptions);
    }
    const first = args[0];
    let a = 0;
    let str = "";
    let join = "";
    if (typeof first === "string") {
      if (args.length === 1) {
        return first;
      }
      let tempStr;
      let lastPos = 0;
      for (let i = 0; i < first.length - 1; i++) {
        if (first.charCodeAt(i) === 37) {
          const nextChar = first.charCodeAt(++i);
          if (a + 1 !== args.length) {
            switch (nextChar) {
              case 115: {
                const tempArg = args[++a];
                if (typeof tempArg === "number") {
                  tempStr = formatPrimitive(ctx, tempArg);
                } else if (typeof tempArg === "bigint") {
                  tempStr = formatPrimitive(ctx, tempArg);
                } else if (typeof tempArg !== "object" || tempArg === null) {
                  tempStr = String(tempArg);
                } else {
                  tempStr = inspect(tempArg, {
                    ...inspectOptions,
                    compact: 3,
                    colors: false,
                    depth: 0
                  });
                }
                break;
              }
              case 106:
                tempStr = jsonStringifyRecursive(args[++a]);
                break;
              case 100: {
                const tempNum = args[++a];
                if (typeof tempNum === "bigint") {
                  tempStr = formatPrimitive(ctx, tempNum);
                } else if (typeof tempNum === "symbol") {
                  tempStr = "NaN";
                } else {
                  tempStr = formatPrimitive(ctx, tempNum);
                }
                break;
              }
              case 79:
                tempStr = inspect(args[++a], inspectOptions);
                break;
              case 111:
                tempStr = inspect(args[++a], {
                  ...inspectOptions,
                  showHidden: true,
                  showProxy: true,
                  depth: 4
                });
                break;
              case 105: {
                const tempInteger = args[++a];
                if (typeof tempInteger === "bigint") {
                  tempStr = formatPrimitive(ctx, tempInteger);
                } else if (typeof tempInteger === "symbol") {
                  tempStr = "NaN";
                } else {
                  tempStr = formatPrimitive(ctx, parseInt(tempStr));
                }
                break;
              }
              case 102: {
                const tempFloat = args[++a];
                if (typeof tempFloat === "symbol") {
                  tempStr = "NaN";
                } else {
                  tempStr = formatPrimitive(ctx, parseInt(tempFloat));
                }
                break;
              }
              case 99:
                a += 1;
                tempStr = "";
                break;
              case 37:
                str += first.slice(lastPos, i);
                lastPos = i + 1;
                continue;
              default:
                continue;
            }
            if (lastPos !== i - 1) {
              str += first.slice(lastPos, i - 1);
            }
            str += tempStr;
            lastPos = i + 1;
          } else if (nextChar === 37) {
            str += first.slice(lastPos, i);
            lastPos = i + 1;
          }
        }
      }
      if (lastPos !== 0) {
        a++;
        join = " ";
        if (lastPos < first.length) {
          str += first.slice(lastPos);
        }
      }
    }
    while (a < args.length) {
      const value = args[a];
      str += join;
      str += typeof value !== "string" ? inspect(value, inspectOptions) : value;
      join = " ";
      a++;
    }
    return str;
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/internal/environment.js
  function safeGetCwd() {
    try {
      const nodeProcess = globalThis?.process;
      if (typeof nodeProcess?.cwd === "function") {
        return nodeProcess.cwd();
      }
    } catch {
    }
    try {
      const deno = globalThis?.["Deno"];
      if (typeof deno?.cwd === "function") {
        return deno.cwd();
      }
    } catch {
    }
    return void 0;
  }
  function isBrowserEnvironment() {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }
  function consoleSupportsCssStyling() {
    if (!isBrowserEnvironment()) {
      return false;
    }
    const navigatorObj = globalThis?.navigator;
    const userAgent = navigatorObj?.userAgent ?? "";
    if (/firefox/i.test(userAgent)) {
      return true;
    }
    const windowObj = globalThis;
    if (windowObj?.CSS?.supports?.("color", "#000")) {
      return true;
    }
    return /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
  }

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/BaseLogger.js
  function createLoggerEnvironment() {
    const runtimeInfo = detectRuntimeInfo();
    const meta = createRuntimeMeta(runtimeInfo);
    const usesBrowserStack = runtimeInfo.name === "browser" || runtimeInfo.name === "worker";
    const callerIgnorePatterns = usesBrowserStack ? [...getDefaultIgnorePatterns(), /node_modules[\\/].*tslog/i] : [...getDefaultIgnorePatterns(), /node:(?:internal|vm)/i, /\binternal[\\/]/i];
    let cachedCwd;
    const environment = {
      getMeta(logLevelId, logLevelName, stackDepthLevel, hideLogPositionForPerformance, name, parentNames) {
        return Object.assign({}, meta, {
          name,
          parentNames,
          date: /* @__PURE__ */ new Date(),
          logLevelId,
          logLevelName,
          path: !hideLogPositionForPerformance ? environment.getCallerStackFrame(stackDepthLevel) : void 0
        });
      },
      getCallerStackFrame(stackDepthLevel, error2 = new Error()) {
        const frames = buildStackTrace(error2, (line) => parseStackLine(line));
        if (frames.length === 0) {
          return {};
        }
        const autoIndex = findFirstExternalFrameIndex(frames, callerIgnorePatterns);
        const useManualIndex = Number.isFinite(stackDepthLevel) && stackDepthLevel >= 0;
        const resolvedIndex = useManualIndex ? clampIndex(stackDepthLevel, frames.length) : clampIndex(autoIndex, frames.length);
        return frames[resolvedIndex] ?? {};
      },
      getErrorTrace(error2) {
        return buildStackTrace(error2, (line) => parseStackLine(line));
      },
      isError(value) {
        return isNativeError(value);
      },
      isBuffer(value) {
        return typeof Buffer !== "undefined" && typeof Buffer.isBuffer === "function" ? Buffer.isBuffer(value) : false;
      },
      prettyFormatLogObj(maskedArgs, settings) {
        return maskedArgs.reduce((result, arg) => {
          if (environment.isError(arg)) {
            result.errors.push(environment.prettyFormatErrorObj(arg, settings));
          } else {
            result.args.push(arg);
          }
          return result;
        }, { args: [], errors: [] });
      },
      prettyFormatErrorObj(error2, settings) {
        const stackLines = formatStackFrames(environment.getErrorTrace(error2), settings);
        const causeSections = collectErrorCauses(error2).map((cause, index) => {
          const header = `Caused by (${index + 1}): ${cause.name ?? "Error"}${cause.message ? `: ${cause.message}` : ""}`;
          const frames = formatStackFrames(buildStackTrace(cause, (line) => parseStackLine(line)), settings);
          return [header, ...frames].join("\n");
        });
        const placeholderValuesError = {
          errorName: ` ${error2.name} `,
          errorMessage: formatErrorMessage(error2),
          errorStack: [...stackLines, ...causeSections].join("\n")
        };
        return formatTemplate(settings, settings.prettyErrorTemplate, placeholderValuesError);
      },
      transportFormatted(logMetaMarkup, logArgs, logErrors, logMeta, settings) {
        const prettyLogs = settings.stylePrettyLogs !== false;
        const logErrorsStr = (logErrors.length > 0 && logArgs.length > 0 ? "\n" : "") + logErrors.join("\n");
        const sanitizedMetaMarkup = stripAnsi(logMetaMarkup);
        const metaMarkupForText = prettyLogs ? logMetaMarkup : sanitizedMetaMarkup;
        if (shouldUseCss(prettyLogs)) {
          settings.prettyInspectOptions.colors = false;
          const formattedArgs2 = formatWithOptionsSafe(settings.prettyInspectOptions, logArgs);
          const cssMeta = logMeta != null ? buildCssMetaOutput(settings, logMeta) : { text: sanitizedMetaMarkup, styles: [] };
          const hasCssMeta = cssMeta.text.length > 0 && cssMeta.styles.length > 0;
          const metaOutput = hasCssMeta ? cssMeta.text : sanitizedMetaMarkup;
          const output = metaOutput + formattedArgs2 + logErrorsStr;
          if (hasCssMeta) {
            console.log(output, ...cssMeta.styles);
          } else {
            console.log(output);
          }
          return;
        }
        settings.prettyInspectOptions.colors = prettyLogs;
        const formattedArgs = formatWithOptionsSafe(settings.prettyInspectOptions, logArgs);
        console.log(metaMarkupForText + formattedArgs + logErrorsStr);
      },
      transportJSON(json) {
        console.log(jsonStringifyRecursive(json));
      }
    };
    if (getNodeEnv() === "test") {
      environment.__resetWorkingDirectoryCacheForTests = () => {
        cachedCwd = void 0;
      };
    }
    return environment;
    function parseStackLine(line) {
      return usesBrowserStack ? parseBrowserStackLine(line) : parseServerStackLine(line);
    }
    function parseServerStackLine(rawLine) {
      if (typeof rawLine !== "string" || rawLine.length === 0) {
        return void 0;
      }
      const trimmedLine = rawLine.trim();
      if (!trimmedLine.includes(" at ") && !trimmedLine.startsWith("at ")) {
        return void 0;
      }
      const line = trimmedLine.replace(/^at\s+/, "");
      let method;
      let location2 = line;
      const methodMatch = line.match(/^(.*?)\s+\((.*)\)$/);
      if (methodMatch) {
        method = methodMatch[1];
        location2 = methodMatch[2];
      }
      const sanitizedLocation = location2.replace(/^\(/, "").replace(/\)$/, "");
      const withoutQuery = sanitizedLocation.replace(/\?.*$/, "");
      let fileLine;
      let fileColumn;
      let filePathCandidate = withoutQuery;
      const segments = withoutQuery.split(":");
      if (segments.length >= 3 && /^\d+$/.test(segments[segments.length - 1] ?? "")) {
        fileColumn = segments.pop();
        fileLine = segments.pop();
        filePathCandidate = segments.join(":");
      } else if (segments.length >= 2 && /^\d+$/.test(segments[segments.length - 1] ?? "")) {
        fileLine = segments.pop();
        filePathCandidate = segments.join(":");
      }
      let normalizedPath = filePathCandidate.replace(/^file:\/\//, "");
      const cwd = getWorkingDirectory();
      if (cwd != null && normalizedPath.startsWith(cwd)) {
        normalizedPath = normalizedPath.slice(cwd.length);
        normalizedPath = normalizedPath.replace(/^[\\/]/, "");
      }
      if (normalizedPath.length === 0) {
        normalizedPath = filePathCandidate;
      }
      const normalizedPathWithoutLine = normalizeFilePath(normalizedPath);
      const effectivePath = normalizedPathWithoutLine.length > 0 ? normalizedPathWithoutLine : normalizedPath;
      const pathSegments = effectivePath.split(/\\|\//);
      const fileName = pathSegments[pathSegments.length - 1];
      const fileNameWithLine = fileName && fileLine ? `${fileName}:${fileLine}` : void 0;
      const filePathWithLine = effectivePath && fileLine ? `${effectivePath}:${fileLine}` : void 0;
      return {
        fullFilePath: sanitizedLocation,
        fileName,
        fileNameWithLine,
        fileColumn,
        fileLine,
        filePath: effectivePath,
        filePathWithLine,
        method
      };
    }
    function parseBrowserStackLine(line) {
      const href = globalThis.location?.origin;
      if (line == null) {
        return void 0;
      }
      const match = line.match(BROWSER_PATH_REGEX);
      if (!match) {
        return void 0;
      }
      const filePath = match[1]?.replace(/\?.*$/, "");
      if (filePath == null) {
        return void 0;
      }
      const pathParts = filePath.split("/");
      const fileLine = match[2];
      const fileColumn = match[3];
      const fileName = pathParts[pathParts.length - 1];
      return {
        fullFilePath: href ? `${href}${filePath}` : filePath,
        fileName,
        fileNameWithLine: fileName && fileLine ? `${fileName}:${fileLine}` : void 0,
        fileColumn,
        fileLine,
        filePath,
        filePathWithLine: fileLine ? `${filePath}:${fileLine}` : void 0,
        method: void 0
      };
    }
    function formatStackFrames(frames, settings) {
      return frames.map((stackFrame) => formatTemplate(settings, settings.prettyErrorStackTemplate, { ...stackFrame }, true));
    }
    function formatErrorMessage(error2) {
      return Object.getOwnPropertyNames(error2).filter((key) => key !== "stack" && key !== "cause").reduce((result, key) => {
        const value = error2[key];
        if (typeof value === "function") {
          return result;
        }
        result.push(String(value));
        return result;
      }, []).join(", ");
    }
    function shouldUseCss(prettyLogs) {
      return prettyLogs && (runtimeInfo.name === "browser" || runtimeInfo.name === "worker") && consoleSupportsCssStyling();
    }
    function stripAnsi(value) {
      return value.replace(ANSI_REGEX, "");
    }
    function buildCssMetaOutput(settings, metaValue) {
      if (metaValue == null) {
        return { text: "", styles: [] };
      }
      const { template, placeholders } = buildPrettyMeta(settings, metaValue);
      const parts = [];
      const styles = [];
      let lastIndex = 0;
      const placeholderRegex = /{{(.+?)}}/g;
      let match;
      while ((match = placeholderRegex.exec(template)) != null) {
        if (match.index > lastIndex) {
          parts.push(template.slice(lastIndex, match.index));
        }
        const key = match[1];
        const rawValue = placeholders[key] != null ? String(placeholders[key]) : "";
        const tokens = collectStyleTokens(settings.prettyLogStyles?.[key], rawValue);
        const css = tokensToCss(tokens);
        if (css.length > 0) {
          parts.push(`%c${rawValue}%c`);
          styles.push(css, "");
        } else {
          parts.push(rawValue);
        }
        lastIndex = placeholderRegex.lastIndex;
      }
      if (lastIndex < template.length) {
        parts.push(template.slice(lastIndex));
      }
      return {
        text: parts.join(""),
        styles
      };
    }
    function collectStyleTokens(style, value) {
      if (style == null) {
        return [];
      }
      if (typeof style === "string") {
        return [style];
      }
      if (Array.isArray(style)) {
        return style.flatMap((token) => collectStyleTokens(token, value));
      }
      if (typeof style === "object") {
        const normalizedValue = value.trim();
        const nextStyle = style[normalizedValue] ?? style["*"];
        if (nextStyle == null) {
          return [];
        }
        return collectStyleTokens(nextStyle, value);
      }
      return [];
    }
    function tokensToCss(tokens) {
      const seen = /* @__PURE__ */ new Set();
      const cssParts = [];
      for (const token of tokens) {
        const css = styleTokenToCss(token);
        if (css != null && css.length > 0 && !seen.has(css)) {
          seen.add(css);
          cssParts.push(css);
        }
      }
      return cssParts.join("; ");
    }
    function styleTokenToCss(token) {
      const color = COLOR_TOKENS[token];
      if (color != null) {
        return `color: ${color}`;
      }
      const background = BACKGROUND_TOKENS[token];
      if (background != null) {
        return `background-color: ${background}`;
      }
      switch (token) {
        case "bold":
          return "font-weight: bold";
        case "dim":
          return "opacity: 0.75";
        case "italic":
          return "font-style: italic";
        case "underline":
          return "text-decoration: underline";
        case "overline":
          return "text-decoration: overline";
        case "inverse":
          return "filter: invert(1)";
        case "hidden":
          return "visibility: hidden";
        case "strikethrough":
          return "text-decoration: line-through";
        default:
          return void 0;
      }
    }
    function getWorkingDirectory() {
      if (cachedCwd === void 0) {
        cachedCwd = safeGetCwd() ?? null;
      }
      return cachedCwd ?? void 0;
    }
    function shouldCaptureHostname() {
      return runtimeInfo.name === "node" || runtimeInfo.name === "deno" || runtimeInfo.name === "bun";
    }
    function shouldCaptureRuntimeVersion() {
      return runtimeInfo.name === "node" || runtimeInfo.name === "deno" || runtimeInfo.name === "bun";
    }
    function createRuntimeMeta(info) {
      if (info.name === "browser" || info.name === "worker") {
        return {
          runtime: info.name,
          browser: info.userAgent
        };
      }
      const metaStatic = {
        runtime: info.name
      };
      if (shouldCaptureRuntimeVersion()) {
        metaStatic.runtimeVersion = info.version ?? "unknown";
      }
      if (shouldCaptureHostname()) {
        metaStatic.hostname = info.hostname ?? "unknown";
      }
      return metaStatic;
    }
    function formatWithOptionsSafe(options, args) {
      try {
        return formatWithOptions(options, ...args);
      } catch {
        return args.map(stringifyFallback).join(" ");
      }
    }
    function stringifyFallback(value) {
      if (typeof value === "string") {
        return value;
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    function normalizeFilePath(value) {
      if (typeof value !== "string" || value.length === 0) {
        return value;
      }
      const replaced = value.replace(/\\+/g, "\\").replace(/\\/g, "/");
      const hasRootDoubleSlash = replaced.startsWith("//");
      const hasLeadingSlash = replaced.startsWith("/") && !hasRootDoubleSlash;
      const driveMatch = replaced.match(/^[A-Za-z]:/);
      const drivePrefix = driveMatch ? driveMatch[0] : "";
      const withoutDrive = drivePrefix ? replaced.slice(drivePrefix.length) : replaced;
      const segments = withoutDrive.split("/");
      const normalizedSegments = [];
      for (const segment of segments) {
        if (segment === "" || segment === ".") {
          continue;
        }
        if (segment === "..") {
          if (normalizedSegments.length > 0) {
            normalizedSegments.pop();
          }
          continue;
        }
        normalizedSegments.push(segment);
      }
      let normalized = normalizedSegments.join("/");
      if (hasRootDoubleSlash) {
        normalized = `//${normalized}`;
      } else if (hasLeadingSlash) {
        normalized = `/${normalized}`;
      } else if (drivePrefix !== "") {
        normalized = `${drivePrefix}${normalized.length > 0 ? `/${normalized}` : ""}`;
      }
      if (normalized.length === 0) {
        return value;
      }
      return normalized;
    }
    function detectRuntimeInfo() {
      if (isBrowserEnvironment()) {
        const navigatorObj = globalThis.navigator;
        return {
          name: "browser",
          userAgent: navigatorObj?.userAgent
        };
      }
      const globalScope = globalThis;
      if (typeof globalScope.importScripts === "function") {
        return {
          name: "worker",
          userAgent: globalScope.navigator?.userAgent
        };
      }
      const globalAny = globalThis;
      if (globalAny.Bun != null) {
        const bunVersion = globalAny.Bun.version;
        return {
          name: "bun",
          version: bunVersion != null ? `bun/${bunVersion}` : void 0,
          hostname: getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
        };
      }
      if (globalAny.Deno != null) {
        const denoHostname = resolveDenoHostname(globalAny.Deno);
        const denoVersion = globalAny.Deno?.version?.deno;
        return {
          name: "deno",
          version: denoVersion != null ? `deno/${denoVersion}` : void 0,
          hostname: denoHostname ?? getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
        };
      }
      if (globalAny.process?.versions?.node != null || globalAny.process?.version != null) {
        return {
          name: "node",
          version: globalAny.process?.versions?.node ?? globalAny.process?.version,
          hostname: getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
        };
      }
      if (globalAny.process != null) {
        return {
          name: "node",
          version: "unknown",
          hostname: getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
        };
      }
      return {
        name: "unknown"
      };
    }
    function getEnvironmentHostname(nodeProcess, deno, bun, location2) {
      const processHostname = nodeProcess?.env?.HOSTNAME ?? nodeProcess?.env?.HOST ?? nodeProcess?.env?.COMPUTERNAME;
      if (processHostname != null && processHostname.length > 0) {
        return processHostname;
      }
      const bunHostname = bun?.env?.HOSTNAME ?? bun?.env?.HOST ?? bun?.env?.COMPUTERNAME;
      if (bunHostname != null && bunHostname.length > 0) {
        return bunHostname;
      }
      try {
        const denoEnvGet = deno?.env?.get;
        if (typeof denoEnvGet === "function") {
          const value = denoEnvGet("HOSTNAME");
          if (value != null && value.length > 0) {
            return value;
          }
        }
      } catch {
      }
      if (location2?.hostname != null && location2.hostname.length > 0) {
        return location2.hostname;
      }
      return void 0;
    }
    function resolveDenoHostname(deno) {
      try {
        if (typeof deno?.hostname === "function") {
          const value = deno.hostname();
          if (value != null && value.length > 0) {
            return value;
          }
        }
      } catch {
      }
      const locationHostname = globalThis.location?.hostname;
      if (locationHostname != null && locationHostname.length > 0) {
        return locationHostname;
      }
      return void 0;
    }
    function getNodeEnv() {
      const globalProcess = globalThis?.process;
      return globalProcess?.env?.NODE_ENV;
    }
    function isNativeError(value) {
      if (value instanceof Error) {
        return true;
      }
      if (value != null && typeof value === "object") {
        const objectTag = Object.prototype.toString.call(value);
        if (/\[object .*Error\]/.test(objectTag)) {
          return true;
        }
        const name = value.name;
        if (typeof name === "string" && name.endsWith("Error")) {
          return true;
        }
      }
      return false;
    }
  }
  var ANSI_REGEX = /\u001b\[[0-9;]*m/g;
  var COLOR_TOKENS = {
    black: "#000000",
    red: "#ef5350",
    green: "#66bb6a",
    yellow: "#fdd835",
    blue: "#42a5f5",
    magenta: "#ab47bc",
    cyan: "#26c6da",
    white: "#fafafa",
    blackBright: "#424242",
    redBright: "#ff7043",
    greenBright: "#81c784",
    yellowBright: "#ffe082",
    blueBright: "#64b5f6",
    magentaBright: "#ce93d8",
    cyanBright: "#4dd0e1",
    whiteBright: "#ffffff"
  };
  var BACKGROUND_TOKENS = {
    bgBlack: "#000000",
    bgRed: "#ef5350",
    bgGreen: "#66bb6a",
    bgYellow: "#fdd835",
    bgBlue: "#42a5f5",
    bgMagenta: "#ab47bc",
    bgCyan: "#26c6da",
    bgWhite: "#fafafa",
    bgBlackBright: "#424242",
    bgRedBright: "#ff7043",
    bgGreenBright: "#81c784",
    bgYellowBright: "#ffe082",
    bgBlueBright: "#64b5f6",
    bgMagentaBright: "#ce93d8",
    bgCyanBright: "#4dd0e1",
    bgWhiteBright: "#ffffff"
  };
  var BROWSER_PATH_REGEX = /(?:(?:file|https?|global code|[^@]+)@)?(?:file:)?((?:\/[^:/]+){2,})(?::(\d+))?(?::(\d+))?/;
  var runtime = createLoggerEnvironment();
  var BaseLogger = class {
    constructor(settings, logObj, stackDepthLevel = Number.NaN) {
      this.logObj = logObj;
      this.stackDepthLevel = stackDepthLevel;
      this.runtime = runtime;
      this.maxErrorCauseDepth = 5;
      this.settings = {
        type: settings?.type ?? "pretty",
        name: settings?.name,
        parentNames: settings?.parentNames,
        minLevel: settings?.minLevel ?? 0,
        argumentsArrayName: settings?.argumentsArrayName,
        hideLogPositionForProduction: settings?.hideLogPositionForProduction ?? false,
        prettyLogTemplate: settings?.prettyLogTemplate ?? "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}	{{logLevelName}}	{{filePathWithLine}}{{nameWithDelimiterPrefix}}	",
        prettyErrorTemplate: settings?.prettyErrorTemplate ?? "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}",
        prettyErrorStackTemplate: settings?.prettyErrorStackTemplate ?? "  \u2022 {{fileName}}	{{method}}\n	{{filePathWithLine}}",
        prettyErrorParentNamesSeparator: settings?.prettyErrorParentNamesSeparator ?? ":",
        prettyErrorLoggerNameDelimiter: settings?.prettyErrorLoggerNameDelimiter ?? "	",
        stylePrettyLogs: settings?.stylePrettyLogs ?? true,
        prettyLogTimeZone: settings?.prettyLogTimeZone ?? "UTC",
        prettyLogStyles: settings?.prettyLogStyles ?? {
          logLevelName: {
            "*": ["bold", "black", "bgWhiteBright", "dim"],
            SILLY: ["bold", "white"],
            TRACE: ["bold", "whiteBright"],
            DEBUG: ["bold", "green"],
            INFO: ["bold", "blue"],
            WARN: ["bold", "yellow"],
            ERROR: ["bold", "red"],
            FATAL: ["bold", "redBright"]
          },
          dateIsoStr: "white",
          filePathWithLine: "white",
          name: ["white", "bold"],
          nameWithDelimiterPrefix: ["white", "bold"],
          nameWithDelimiterSuffix: ["white", "bold"],
          errorName: ["bold", "bgRedBright", "whiteBright"],
          fileName: ["yellow"],
          fileNameWithLine: "white"
        },
        prettyInspectOptions: settings?.prettyInspectOptions ?? {
          colors: true,
          compact: false,
          depth: Infinity
        },
        metaProperty: settings?.metaProperty ?? "_meta",
        maskPlaceholder: settings?.maskPlaceholder ?? "[***]",
        maskValuesOfKeys: settings?.maskValuesOfKeys ?? ["password"],
        maskValuesOfKeysCaseInsensitive: settings?.maskValuesOfKeysCaseInsensitive ?? false,
        maskValuesRegEx: settings?.maskValuesRegEx,
        prefix: [...settings?.prefix ?? []],
        attachedTransports: [...settings?.attachedTransports ?? []],
        overwrite: {
          mask: settings?.overwrite?.mask,
          toLogObj: settings?.overwrite?.toLogObj,
          addMeta: settings?.overwrite?.addMeta,
          addPlaceholders: settings?.overwrite?.addPlaceholders,
          formatMeta: settings?.overwrite?.formatMeta,
          formatLogObj: settings?.overwrite?.formatLogObj,
          transportFormatted: settings?.overwrite?.transportFormatted,
          transportJSON: settings?.overwrite?.transportJSON
        }
      };
      this.captureStackForMeta = this._shouldCaptureStack();
    }
    log(logLevelId, logLevelName, ...args) {
      if (logLevelId < this.settings.minLevel) {
        return;
      }
      const resolvedArgs = this._resolveLogArguments(args);
      const logArgs = [...this.settings.prefix, ...resolvedArgs];
      const maskedArgs = this.settings.overwrite?.mask != null ? this.settings.overwrite?.mask(logArgs) : this.settings.maskValuesOfKeys != null && this.settings.maskValuesOfKeys.length > 0 ? this._mask(logArgs) : logArgs;
      const thisLogObj = this.logObj != null ? this._recursiveCloneAndExecuteFunctions(this.logObj) : void 0;
      const logObj = this.settings.overwrite?.toLogObj != null ? this.settings.overwrite?.toLogObj(maskedArgs, thisLogObj) : this._toLogObj(maskedArgs, thisLogObj);
      const logObjWithMeta = this.settings.overwrite?.addMeta != null ? this.settings.overwrite?.addMeta(logObj, logLevelId, logLevelName) : this._addMetaToLogObj(logObj, logLevelId, logLevelName);
      const logMeta = logObjWithMeta?.[this.settings.metaProperty];
      let logMetaMarkup;
      let logArgsAndErrorsMarkup = void 0;
      if (this.settings.overwrite?.formatMeta != null) {
        logMetaMarkup = this.settings.overwrite?.formatMeta(logObjWithMeta?.[this.settings.metaProperty]);
      }
      if (this.settings.overwrite?.formatLogObj != null) {
        logArgsAndErrorsMarkup = this.settings.overwrite?.formatLogObj(maskedArgs, this.settings);
      }
      if (this.settings.type === "pretty") {
        logMetaMarkup = logMetaMarkup ?? this._prettyFormatLogObjMeta(logObjWithMeta?.[this.settings.metaProperty]);
        logArgsAndErrorsMarkup = logArgsAndErrorsMarkup ?? runtime.prettyFormatLogObj(maskedArgs, this.settings);
      }
      if (logMetaMarkup != null && logArgsAndErrorsMarkup != null) {
        if (this.settings.overwrite?.transportFormatted != null) {
          const transport = this.settings.overwrite.transportFormatted;
          const declaredParams = transport.length;
          if (declaredParams < 4) {
            transport(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors);
          } else if (declaredParams === 4) {
            transport(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors, logMeta);
          } else {
            transport(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors, logMeta, this.settings);
          }
        } else {
          runtime.transportFormatted(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors, logMeta, this.settings);
        }
      } else {
        if (this.settings.overwrite?.transportJSON != null) {
          this.settings.overwrite.transportJSON(logObjWithMeta);
        } else if (this.settings.type !== "hidden") {
          runtime.transportJSON(logObjWithMeta);
        }
      }
      if (this.settings.attachedTransports != null && this.settings.attachedTransports.length > 0) {
        this.settings.attachedTransports.forEach((transportLogger) => {
          transportLogger(logObjWithMeta);
        });
      }
      return logObjWithMeta;
    }
    attachTransport(transportLogger) {
      this.settings.attachedTransports.push(transportLogger);
    }
    getSubLogger(settings, logObj) {
      const subLoggerSettings = {
        ...this.settings,
        ...settings,
        parentNames: this.settings?.parentNames != null && this.settings?.name != null ? [...this.settings.parentNames, this.settings.name] : this.settings?.name != null ? [this.settings.name] : void 0,
        prefix: [...this.settings.prefix, ...settings?.prefix ?? []]
      };
      const subLogger = new this.constructor(subLoggerSettings, logObj ?? this.logObj, this.stackDepthLevel);
      return subLogger;
    }
    _mask(args) {
      const maskKeys = this._getMaskKeys();
      return args?.map((arg) => {
        return this._recursiveCloneAndMaskValuesOfKeys(arg, maskKeys);
      });
    }
    _getMaskKeys() {
      const maskKeys = this.settings.maskValuesOfKeys ?? [];
      const signature = maskKeys.map(String).join("|");
      if (this.settings.maskValuesOfKeysCaseInsensitive === true) {
        if (this.maskKeysCache?.source === maskKeys && this.maskKeysCache.caseInsensitive === true && this.maskKeysCache.signature === signature) {
          return this.maskKeysCache.normalized;
        }
        const normalized = maskKeys.map((key) => typeof key === "string" ? key.toLowerCase() : String(key).toLowerCase());
        this.maskKeysCache = {
          source: maskKeys,
          caseInsensitive: true,
          normalized,
          signature
        };
        return normalized;
      }
      this.maskKeysCache = {
        source: maskKeys,
        caseInsensitive: false,
        normalized: maskKeys,
        signature
      };
      return maskKeys;
    }
    _resolveLogArguments(args) {
      if (args.length === 1 && typeof args[0] === "function") {
        const candidate = args[0];
        if (candidate.length === 0) {
          const result = candidate();
          return Array.isArray(result) ? result : [result];
        }
      }
      return args;
    }
    _recursiveCloneAndMaskValuesOfKeys(source, keys, seen = []) {
      if (seen.includes(source)) {
        return { ...source };
      }
      if (typeof source === "object" && source !== null) {
        seen.push(source);
      }
      if (runtime.isError(source) || runtime.isBuffer(source)) {
        return source;
      } else if (source instanceof Map) {
        return new Map(source);
      } else if (source instanceof Set) {
        return new Set(source);
      } else if (Array.isArray(source)) {
        return source.map((item) => this._recursiveCloneAndMaskValuesOfKeys(item, keys, seen));
      } else if (source instanceof Date) {
        return new Date(source.getTime());
      } else if (source instanceof URL) {
        return urlToObject(source);
      } else if (source !== null && typeof source === "object") {
        const baseObject = runtime.isError(source) ? this._cloneError(source) : Object.create(Object.getPrototypeOf(source));
        return Object.getOwnPropertyNames(source).reduce((o, prop) => {
          const lookupKey = this.settings?.maskValuesOfKeysCaseInsensitive !== true ? prop : typeof prop === "string" ? prop.toLowerCase() : String(prop).toLowerCase();
          o[prop] = keys.includes(lookupKey) ? this.settings.maskPlaceholder : (() => {
            try {
              return this._recursiveCloneAndMaskValuesOfKeys(source[prop], keys, seen);
            } catch {
              return null;
            }
          })();
          return o;
        }, baseObject);
      } else {
        if (typeof source === "string") {
          let modifiedSource = source;
          for (const regEx of this.settings?.maskValuesRegEx || []) {
            modifiedSource = modifiedSource.replace(regEx, this.settings?.maskPlaceholder || "");
          }
          return modifiedSource;
        }
        return source;
      }
    }
    _recursiveCloneAndExecuteFunctions(source, seen = []) {
      if (this.isObjectOrArray(source) && seen.includes(source)) {
        return this.shallowCopy(source);
      }
      if (this.isObjectOrArray(source)) {
        seen.push(source);
      }
      if (Array.isArray(source)) {
        return source.map((item) => this._recursiveCloneAndExecuteFunctions(item, seen));
      } else if (source instanceof Date) {
        return new Date(source.getTime());
      } else if (this.isObject(source)) {
        return Object.getOwnPropertyNames(source).reduce((o, prop) => {
          const descriptor = Object.getOwnPropertyDescriptor(source, prop);
          if (descriptor) {
            Object.defineProperty(o, prop, descriptor);
            const value = source[prop];
            o[prop] = typeof value === "function" ? value() : this._recursiveCloneAndExecuteFunctions(value, seen);
          }
          return o;
        }, Object.create(Object.getPrototypeOf(source)));
      } else {
        return source;
      }
    }
    isObjectOrArray(value) {
      return typeof value === "object" && value !== null;
    }
    isObject(value) {
      return typeof value === "object" && !Array.isArray(value) && value !== null;
    }
    shallowCopy(source) {
      if (Array.isArray(source)) {
        return [...source];
      } else {
        return { ...source };
      }
    }
    _toLogObj(args, clonedLogObj = {}) {
      args = args?.map((arg) => runtime.isError(arg) ? this._toErrorObject(arg) : arg);
      if (this.settings.argumentsArrayName == null) {
        if (args.length === 1 && !Array.isArray(args[0]) && runtime.isBuffer(args[0]) !== true && !(args[0] instanceof Date)) {
          clonedLogObj = typeof args[0] === "object" && args[0] != null ? { ...args[0], ...clonedLogObj } : { 0: args[0], ...clonedLogObj };
        } else {
          clonedLogObj = { ...clonedLogObj, ...args };
        }
      } else {
        clonedLogObj = {
          ...clonedLogObj,
          [this.settings.argumentsArrayName]: args
        };
      }
      return clonedLogObj;
    }
    _cloneError(error2) {
      const cloned = new error2.constructor();
      Object.getOwnPropertyNames(error2).forEach((key) => {
        cloned[key] = error2[key];
      });
      return cloned;
    }
    _toErrorObject(error2, depth = 0, seen = /* @__PURE__ */ new Set()) {
      if (!seen.has(error2)) {
        seen.add(error2);
      }
      const errorObject = {
        nativeError: error2,
        name: error2.name ?? "Error",
        message: error2.message,
        stack: runtime.getErrorTrace(error2)
      };
      if (depth >= this.maxErrorCauseDepth) {
        return errorObject;
      }
      const causeValue = error2.cause;
      if (causeValue != null) {
        const normalizedCause = toError(causeValue);
        if (!seen.has(normalizedCause)) {
          errorObject.cause = this._toErrorObject(normalizedCause, depth + 1, seen);
        }
      }
      return errorObject;
    }
    _addMetaToLogObj(logObj, logLevelId, logLevelName) {
      return {
        ...logObj,
        [this.settings.metaProperty]: runtime.getMeta(logLevelId, logLevelName, this.stackDepthLevel, !this.captureStackForMeta, this.settings.name, this.settings.parentNames)
      };
    }
    _shouldCaptureStack() {
      if (this.settings.hideLogPositionForProduction) {
        return false;
      }
      if (this.settings.type === "json") {
        return true;
      }
      const template = this.settings.prettyLogTemplate ?? "";
      const stackPlaceholders = /{{\s*(file(Name|Path|Line|PathWithLine|NameWithLine)|fullFilePath)\s*}}/;
      if (stackPlaceholders.test(template)) {
        return true;
      }
      return false;
    }
    _prettyFormatLogObjMeta(logObjMeta) {
      return buildPrettyMeta(this.settings, logObjMeta).text;
    }
  };

  // node_modules/.pnpm/tslog@4.10.2/node_modules/tslog/esm/index.js
  var Logger = class extends BaseLogger {
    constructor(settings, logObj) {
      const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
      const normalizedSettings = { ...settings ?? {} };
      if (isBrowser) {
        normalizedSettings.stylePrettyLogs = settings?.stylePrettyLogs ?? true;
      }
      super(normalizedSettings, logObj, Number.NaN);
    }
    log(logLevelId, logLevelName, ...args) {
      return super.log(logLevelId, logLevelName, ...args);
    }
    silly(...args) {
      return super.log(0, "SILLY", ...args);
    }
    trace(...args) {
      return super.log(1, "TRACE", ...args);
    }
    debug(...args) {
      return super.log(2, "DEBUG", ...args);
    }
    info(...args) {
      return super.log(3, "INFO", ...args);
    }
    warn(...args) {
      return super.log(4, "WARN", ...args);
    }
    error(...args) {
      return super.log(5, "ERROR", ...args);
    }
    fatal(...args) {
      return super.log(6, "FATAL", ...args);
    }
    getSubLogger(settings, logObj) {
      return super.getSubLogger(settings, logObj);
    }
  };

  // game/src/server/Server.ts
  var Server = class extends Events {
    logger = new Logger({ name: "Server" });
    webSocket;
    isReconnectingEnabled = true;
    auth = new Auth(this);
    config = {
      CONNECTION_CHECKER_PERIOD: 2e3,
      CONNECTION_INACTIVE_TIMEOUT: 6e3,
      KICK_USER_PRICE: 200,
      PRICE_USERNAME_SET: 5e3,
      SERVER_LANGUAGE_CHANGE_TIME: 216e5,
      SERVER_ROOM_PASSWORD_MINIMAL_LEVEL: 0,
      SERVER_ROOM_TITLE_MINIMAL_LEVEL: 3,
      SET_PROFILE_PHOTO_MINIMAL_LEVEL: 3,
      SHOW_PASSWORD_ROOM_INFO_BUTTON: true,
      mmguiqik: -1
    };
    disconnectedIps = [];
    constructor() {
      super();
      this.on("close", async (ip) => {
        if (!this.isReconnectingEnabled) return;
        this.disconnectedIps.push(ip);
        this.logger.info(`Connection is closed.. Reconnecting in 1 second..`);
        await wait(50);
        this.connect(!this.disconnectedIps.includes("ws://37.143.8.63:7090") ? "ws://37.143.8.63:7090" : void 0);
      });
      this.connect("wss://proxy-bafia.sqbiyz1611993.workers.dev");
    }
    connect(url) {
      const ip = localStorage.ip || url || App_default.config.uriServer;
      this.logger.info(`Connecting to server.. ${ip}`);
      this.webSocket = new WebSocket(ip);
      this.webSocket.addEventListener("open", this.#init.bind(this));
      this.webSocket.addEventListener("error", (e) => console.error(e));
      this.webSocket.addEventListener("close", () => this.emit("close", ip));
      const ReversePacketDataKeys = Object.fromEntries(Object.entries(PacketDataKeys_default).map(([k, v]) => [v, k]));
      function decodePacket(value) {
        if (value === null || typeof value != "object") {
          return value;
        }
        if (Array.isArray(value)) {
          return value.map(decodePacket);
        }
        const result = {};
        for (const key in value) {
          const decodedKey = ReversePacketDataKeys[key] ?? key;
          result[decodedKey] = decodePacket(value[key]);
        }
        return result;
      }
      this.webSocket.addEventListener("message", (e) => {
        const json = JSON.parse(e.data);
        this.call("message", json);
        if (App_default.settings.data.debug) {
          if (json[PacketDataKeys_default.TIMER] && Object.keys(json).length == 1) return;
          console.log(json);
        }
      });
    }
    async #init() {
      this.call("connect");
      this.logger.info(`Connected to server`);
      if (App_default.config.auth) {
        await this.auth.auth();
      } else {
        App_default.screen = new Authorization();
      }
      this.on("message", async (data) => {
        if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_BLOCKED) {
          const reason = data[PacketDataKeys_default.REASON];
          const tsr = data[PacketDataKeys_default.TIME_SEC_REMAINING];
          App_default.screen = new Dashboard();
          MessageBox_default(`\u0412\u044B \u0431\u044B\u043B\u0438 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B \u043F\u043E \u043F\u0440\u0438\u0447\u0438\u043D\u0435 [${reason}]

\u041E\u0441\u0442\u0430\u0432\u0448\u0435\u0435\u0441\u044F \u0432\u0440\u0435\u043C\u044F \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438:
${format_default(tsr, "genitive")}`, { height: 300 });
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.USER_INACTIVE_BLOCKED) {
          App_default.screen = new Dashboard();
          const tsr = data[PacketDataKeys_default.TIME_SEC_REMAINING];
          MessageBox_default(`\u0412\u044B \u0431\u044B\u043B\u0438 \u043D\u0435\u0430\u043A\u0442\u0438\u0432\u043D\u044B

\u041E\u0441\u0442\u0430\u0432\u0448\u0435\u0435\u0441\u044F \u0432\u0440\u0435\u043C\u044F \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438:
${format_default(tsr, "genitive")}`, { height: 250 });
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.SIGN_IN_ERROR) {
          if (data[PacketDataKeys_default.ERROR] == -4) {
            await MessageBox_default(`\u0421\u0435\u0441\u0441\u0438\u044F \u043D\u0435 \u0432\u0430\u043B\u0438\u0434\u043D\u0430. \u0418\u0433\u0440\u0430 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u043A\u0440\u044B\u0442\u0430`);
            App_default.destroy();
          }
        } else if (data[PacketDataKeys_default.TYPE] == PacketDataKeys_default.EMAIL_NOT_VERIFIED) {
          App_default.screen = new Dashboard();
          const e = await ConfirmBox_default(`\u0412\u044B \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B\u0438 \u0432\u0430\u0448 email.
\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0432\u0430\u0448\u0443 \u044D\u043B\u043E\u043A\u0442\u0440\u043E\u043D\u043D\u0443\u044E \u043F\u043E\u0447\u0442\u0443 \u0438 \u0441\u043B\u0435\u0434\u0443\u0439\u0442\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438 \u0432 \u043F\u0438\u0441\u044C\u043C\u0435.

\u0422\u0430\u043A \u0436\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u0430\u043F\u043A\u0443 \u0421\u041F\u0410\u041C. \u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E \u043F\u0438\u0441\u044C\u043C\u043E \u043F\u043E\u043F\u0430\u043B\u043E \u0442\u0443\u0434\u0430

\u0415\u0441\u043B\u0438 \u0432\u0430\u043C \u043D\u0430 email \u043D\u0435 \u043F\u0440\u0438\u0448\u043B\u043E \u043F\u0438\u0441\u044C\u043C\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0435\u0433\u043E \u0441\u043D\u043E\u0432\u0430

\u0415\u0441\u043B\u0438 \u0432\u044B \u043D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u043E \u0443\u043A\u0430\u0437\u0430\u043B\u0438 email \u043F\u0440\u0438 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438 \u0432\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439`, { title: "\u041F\u041E\u0414\u0422\u0412\u0415\u0420\u0416\u0414\u0415\u041D\u0418\u0415", btnYes: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C", btnNo: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C email", height: 410 });
          if (e == true) {
            try {
              const json = await (await fetch(`https://api.mafia.dottap.com/user/email/verify`, {
                method: "POST",
                headers: {
                  Authorization: btoa(`${App_default.user.objectId}=:=${App_default.user.bToken}`)
                },
                body: new URLSearchParams({ lang: "RUS" })
              })).json();
              if (json.error == "TOO_MANY_REQUESTS") {
                MessageBox_default(`\u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u0438\u0441\u044C\u043C\u043E \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F email \u0447\u0435\u0440\u0435\u0437 ${json.data} \u0441\u0435\u043A\u0443\u043D\u0434`);
              }
            } catch (e2) {
              MessageBox_default(`\u041E\u0448\u0438\u0431\u043A\u0430.. ${e2}`);
            }
          } else if (e == false) {
            const e2 = prompt("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 email");
          }
        }
      });
    }
    send(type, data) {
      let d;
      if (typeof type == "object") {
        d = JSON.stringify(type);
      } else {
        d = JSON.stringify({ [PacketDataKeys_default.TYPE]: type, ...data });
      }
      this.webSocket.send(d);
      if (d.ty == "usi" && d.pw && d.e) return;
      console.log("send", d);
    }
    async awaitPacket(type, timeout = 1e7) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.off("message", onMessage);
          reject(new Error(`awaitPacket timeout: ${type}`));
        }, timeout);
        const onMessage = (message) => {
          if (typeof type == "string" ? message[PacketDataKeys_default.TYPE] == type : type.includes(message[PacketDataKeys_default.TYPE])) {
            clearTimeout(timer);
            this.off("message", onMessage);
            resolve(message);
          }
        };
        this.on("message", onMessage);
      });
    }
    destroy() {
      this.removeAllEvents();
      this.webSocket.close();
    }
  };

  // game/src/style.ts
  function apply(obj) {
    for (const key in obj) {
      const value = obj[key];
      if (typeof value == "string") {
        if (value == "@main-color") obj[key] = `#d03a41`;
        else if (value == "@main-text-color") obj[key] = `#e1dcdc`;
        else if (value == "@black-text-color") obj[key] = `#121212`;
      } else if (typeof value == "object" && value !== null) {
        apply(value);
      }
    }
  }
  async function readCSS(path) {
    const obj = JSON.parse(await fs_default.readFile(path));
    obj[`#${App_default.element.id}`] = obj[`&`];
    delete obj[`&`];
    apply(obj);
    return obj;
  }
  async function style_default(path) {
    const mainCSS = await readCSS(path);
    const style = document.createElement("style");
    style.innerHTML = getCSS(mainCSS);
    return style;
  }

  // game/src/Settings.ts
  var Settings2 = class {
    logger = new Logger({ name: "Settings" });
    data = {
      version: 6,
      debug: false,
      developer: false,
      hideUsername: false,
      window: {
        zoom: isMobile() ? 0.6 : 1
      },
      game: {
        widthPL: 130,
        zoomPL: 1,
        showYouDiedMessage: true,
        saveHistory: true,
        clearMessages: true,
        showIndexPl: false,
        showIndexPlChat: false,
        barmanEffect: "!"
      },
      roomCreate: {
        title: "",
        dayTime: 0,
        minPlayers: 5,
        maxPlayers: 8,
        minLevel: 1,
        selectedRoles: [6, 9, 11, 2, 5, 7, 8, 10],
        password: "",
        vip: false
      }
    };
    #isInitialized = false;
    #wrapObject(obj) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          let value = obj[key];
          if (typeof obj[key] == "object" && obj[key] !== null && !Array.isArray(obj[key])) {
            this.#wrapObject(obj[key]);
          }
          wrap(obj, key, (v) => {
            value = v;
            this.write();
          }, () => value);
        }
      }
    }
    async init() {
      if (this.#isInitialized) return;
      this.#isInitialized = true;
      await this.read();
    }
    async write() {
      await fs_default.writeFile(`${App_default.config.path}/settings.json`, JSON.stringify(this.data));
    }
    async read() {
      if (!await fs_default.existsFile(`${App_default.config.path}/settings.json`)) {
        await this.write();
        return;
      }
      const savedData = JSON.parse(await fs_default.readFile(`${App_default.config.path}/settings.json`));
      const migratedData = this.#migrate(savedData);
      Object.assign(this.data, migratedData);
      this.logger.info(this.data);
      this.#wrapObject(this.data);
    }
    #migrate(savedData) {
      const savedVersion = savedData.version || 1;
      const currentVersion = this.data.version;
      if (savedVersion >= currentVersion) {
        return savedData;
      }
      let data = { ...savedData };
      when(savedVersion).case(5, () => currentVersion >= 6 && (() => {
        data.game.showIndexPl = false;
        data.game.showIndexPlChat = false;
        data.version = 6;
      })());
      return data;
    }
  };

  // core/version.json
  var version_default = {
    launcher: "Beta 1.2.1",
    vanilla: "Beta 1.2.1"
  };

  // game/src/api/Bafia.ts
  var Bafia = class extends Events {
    #isInitialized = false;
    constructor() {
      super();
    }
    init() {
      if (this.#isInitialized) return;
      this.#isInitialized = true;
      this.#initEvents();
    }
    isRoom() {
      return App_default.screen instanceof Room;
    }
    isGlobalChat() {
      return App_default.screen instanceof GlobalChat;
    }
    isGame() {
      return this.isRoom() ? App_default.screen.isGame : false;
    }
    sendMessage(message, options = {
      type: 1
    }) {
      const m = {
        [PacketDataKeys_default.TEXT]: message,
        [PacketDataKeys_default.MESSAGE_TYPE]: options.type
      };
      if (this.isRoom()) App_default.screen.addMessage(m);
      else if (this.isGlobalChat()) App_default.screen.addMessage(m);
    }
    #initEvents() {
      App_default.on("screenChange", (e) => this.call("screenChange", e));
      App_default.on("contextmenu", (e) => this.call("contextmenu", e));
      App_default.on("resize", (e) => this.call("resize", e));
    }
  };
  var Bafia_default = new Bafia();

  // game/src/command/Command.ts
  var Command = class {
    aliases;
    callback = () => {
    };
    constructor(...aliases) {
      this.aliases = aliases;
    }
    execute(args) {
      return this.callback(args);
    }
    addCallback(callback) {
      this.callback = callback;
    }
    run(args) {
      return this.execute(args);
    }
  };

  // game/src/command/KickCommand.ts
  var KickCommand = class extends Command {
    constructor() {
      super("kick");
    }
    execute(args) {
      if (!Bafia_default.isRoom()) return Bafia_default.sendMessage("\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u0432 \u043A\u043E\u043C\u043D\u0430\u0442\u0435");
      if (Bafia_default.isGame()) return Bafia_default.sendMessage("\u0418\u0433\u0440\u0430 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C");
      const rs = App_default.screen;
      const player = rs.getPlayer(args[0]);
      App_default.server.send(PacketDataKeys_default.KICK_USER, {
        [PacketDataKeys_default.ROOM_OBJECT_ID]: rs.roomObjectId,
        [PacketDataKeys_default.USER_OBJECT_ID]: player[PacketDataKeys_default.USER][PacketDataKeys_default.OBJECT_ID]
      });
      return true;
    }
  };

  // game/src/App.ts
  var App = class extends Events {
    version = version_default.vanilla;
    logger = new Logger({ name: "App" });
    isAlive = true;
    appId = 0;
    element;
    config;
    win;
    screen;
    server;
    settings = new Settings2();
    user = new User();
    title = "";
    width = 0;
    height = 0;
    resources = {};
    boxs = [];
    components = [];
    #isInitialized = false;
    #windowEvents = {
      popState: (e) => this.emit("popstate", e),
      focusOut: (e) => {
        if (isMobile() && isIOS()) {
          setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.style.transform = "translateZ(0)";
            setTimeout(() => {
              document.body.style.transform = "";
            }, 50);
          }, 100);
        }
      }
    };
    constructor() {
      super();
      wrap(this, "title", (v) => this.win.title = `${v} - \u0411\u0430\u0444\u0438\u044F \u043E\u043D\u043B\u0430\u0439\u043D (vanilla ${this.version})`);
      wrap(this, "screen", (v) => {
        this.call("screenChange", v);
        this.screen?.destroy();
        this.element.appendChild(v.element);
        history.pushState({ screen: v.name }, v.name, "");
      });
      let dt = 0;
      setInterval(() => {
        this.tick(dt);
        dt++;
      }, 50);
    }
    async init() {
      if (this.#isInitialized) return;
      this.#isInitialized = true;
      await this.settings.init();
      if (isMobile()) {
        if (this.settings.data.window.zoom > 0.9)
          this.settings.data.window.zoom = 0.6;
        if (this.settings.data.game.widthPL != 130)
          this.settings.data.game.widthPL = 130;
        if (this.settings.data.game.zoomPL != 1)
          this.settings.data.game.zoomPL = 1;
      }
      this.element.tabIndex = 0;
      this.element.style.zoom = this.settings.data.window.zoom + "";
      this.element.appendChild(await style_default(`${this.config.path}/assets/styles/main.json`));
      if (isMobile()) this.element.appendChild(await style_default(`${this.config.path}/assets/styles/mobile.json`));
      this.width = this.element.clientWidth;
      this.height = this.element.clientHeight;
      this.server = new Server();
      this.screen = new Loading("\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A \u0441\u0435\u0440\u0432\u0435\u0440\u0443..");
      if (this.settings.data.developer) {
        if (!window["apps"]) window["apps"] = [];
        this.appId = window["apps"].length;
        window["apps"].push(this);
        window.Bafia = Bafia_default;
      }
      this.#loadImgs();
      this.#initCommands();
      this.#initEvents();
      Bafia_default.init();
    }
    async #loadImgs() {
      for (let i = 1; i < 11; i++) {
        this.resources[`role_${i}`] = await fs_default.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/${i}.png`);
      }
      this.resources["unknownChat"] = await fs_default.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/unknown_chat.png`);
      this.resources["barmanChat"] = await fs_default.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/barman_chat.png`);
      this.resources["mafiaChat"] = await fs_default.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/mafia_chat.png`);
    }
    #initCommands() {
      CommandManager_default.register(new KickCommand());
    }
    #initEvents() {
      this.element.addEventListener("focus", (e) => this.emit("focus", e), true);
      this.element.addEventListener("blur", (e) => this.emit("unfocus", e), true);
      this.element.addEventListener("click", (e) => this.emit("click", e), true);
      this.element.addEventListener("contextmenu", (e) => this.emit("contextmenu", e), true);
      this.element.addEventListener("keydown", (e) => this.emit("keydown", e), true);
      this.element.addEventListener("keyup", (e) => this.emit("keyup", e), true);
      this.element.addEventListener("wheel", (e) => this.emit("wheel", e), true);
      window.addEventListener("popstate", this.#windowEvents.popState, true);
      window.addEventListener("focusout", this.#windowEvents.focusOut, true);
      this.on("wheel", (e) => {
        if (isMacOS() ? e.metaKey : e.ctrlKey) {
          let zoom = parseFloat(this.element.style.zoom), oldZoom = zoom;
          if (e.deltaY < 0) {
            if (zoom > 2.5) return;
            zoom += 0.1;
          } else {
            if (zoom < 0.2) return;
            zoom -= 0.1;
          }
          if (zoom != oldZoom) {
            this.settings.data.window.zoom = zoom;
            this.element.style.zoom = zoom + "";
          }
          e.preventDefault();
        }
      });
      this.on("keydown", (e) => {
        if (isMacOS() ? e.metaKey : e.ctrlKey) {
          let zoom = parseFloat(this.element.style.zoom), oldZoom = zoom;
          if (e.key == "=" || e.key == "+") {
            e.preventDefault();
            if (zoom > 2.5) return;
            zoom += 0.1;
          } else if (e.key == "-") {
            e.preventDefault();
            if (zoom < 0.2) return;
            zoom -= 0.1;
          }
          if (zoom != oldZoom) {
            this.settings.data.window.zoom = zoom;
            this.element.style.zoom = zoom + "";
          }
        }
      });
      this.win.on("close", () => this.destroy());
      this.on("popstate", () => {
        this.screen.emit("preBack");
        history.pushState({ back: true }, "back", "");
      });
    }
    tick(dt) {
      this.emit("tick", dt);
      if (this.element) {
        if (this.width != this.element.clientWidth || this.height != this.element.clientHeight) {
          const oldWidth = this.width;
          const oldHeight = this.height;
          this.width = this.element.clientWidth;
          this.height = this.element.clientHeight;
          this.emit("resize", { oldWidth, oldHeight });
        }
      }
      this.screen?.tick(dt);
    }
    getPathProfiles() {
      return `/profiles.json`;
    }
    get zoom() {
      return this.settings.data.window.zoom;
    }
    #destroyEvents() {
      this.removeAllEvents();
      window.removeEventListener("popstate", this.#windowEvents.popState);
      window.removeEventListener("focusout", this.#windowEvents.focusOut);
    }
    destroy() {
      if (!this.isAlive) return;
      this.isAlive = false;
      this.win.close();
      this.resources = {};
      this.components.forEach((e) => e.destroy());
      this.boxs.forEach((e) => e.destroy());
      this.element.remove();
      this.#destroyEvents();
      this.server.destroy();
      if (this.settings.data.developer) {
        window["apps"].splice(this.appId, 1);
      }
    }
  };
  var App_default = new App();

  // core/src/Constants.ts
  var uri = "37.143.8.68";
  var uriServer = `wss://${uri}:7091`;

  // core/src/config.ts
  var defaultConfig = {
    path: "",
    version: 1,
    auth: null,
    debug: false,
    uriServer,
    userAgent: null
  };
  var config = defaultConfig;
  function get(key) {
    return config[key] == void 0 ? defaultConfig[key] : config[key];
  }
  function config_default(replaceConfig) {
    if (replaceConfig)
      config = replaceConfig;
    return {
      path: get("path"),
      version: get("version"),
      auth: get("auth"),
      debug: get("debug"),
      uriServer: get("uriServer"),
      userAgent: get("userAgent")
    };
  }

  // game/src/index.ts
  window.main = async function(conf, win, element) {
    delete window.main;
    App_default.config = config_default(conf);
    App_default.win = win;
    App_default.element = element;
    await fs_default.init("Indexeddb");
    await App_default.init();
  };
})();
/**
 * [js-md5]{@link https://github.com/emn178/js-md5}
 *
 * @namespace md5
 * @version 0.8.3
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2023
 * @license MIT
 */
//!root.JS_MD5_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;

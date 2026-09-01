const POW_2_24 = 5.960464477539063e-8;
const POW_2_32 = 4294967296;
const POW_2_53 = 9007199254740992;

function encode(value: any): ArrayBuffer {
  let data = new ArrayBuffer(256);
  let dataView = new DataView(data);
  let lastLength = 0;
  let offset = 0;

  function prepareWrite(length: number): DataView {
    let newByteLength = data.byteLength;
    const requiredLength = offset + length;

    while (newByteLength < requiredLength)
      newByteLength <<= 1;

    if (newByteLength !== data.byteLength) {
      const oldDataView = dataView;
      data = new ArrayBuffer(newByteLength);
      dataView = new DataView(data);

      const uint32count = (offset + 3) >> 2;
      for (let i = 0; i < uint32count; ++i)
        dataView.setUint32(i << 2, oldDataView.getUint32(i << 2));
    }

    lastLength = length;
    return dataView;
  }

  function commitWrite() {
    offset += lastLength;
  }

  function writeFloat64(value: number) {
    commitWrite(prepareWrite(8).setFloat64(offset, value));
  }

  function writeUint8(value: number) {
    commitWrite(prepareWrite(1).setUint8(offset, value));
  }

  function writeUint8Array(value: Uint8Array | number[]) {
    const view = prepareWrite(value.length);
    for (let i = 0; i < value.length; ++i)
      view.setUint8(offset + i, value[i]);
    commitWrite();
  }

  function writeUint16(value: number) {
    commitWrite(prepareWrite(2).setUint16(offset, value));
  }

  function writeUint32(value: number) {
    commitWrite(prepareWrite(4).setUint32(offset, value));
  }

  function writeUint64(value: number) {
    const low = value % POW_2_32;
    const high = (value - low) / POW_2_32;
    const view = prepareWrite(8);
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
    commitWrite();
  }

  function writeTypeAndLength(type: number, length: number) {
    if (length < 24) {
      writeUint8((type << 5) | length);
    } else if (length < 0x100) {
      writeUint8((type << 5) | 24);
      writeUint8(length);
    } else if (length < 0x10000) {
      writeUint8((type << 5) | 25);
      writeUint16(length);
    } else if (length < 0x100000000) {
      writeUint8((type << 5) | 26);
      writeUint32(length);
    } else {
      writeUint8((type << 5) | 27);
      writeUint64(length);
    }
  }

  function encodeItem(value: any): void {
    let i: number;

    if (value === false) return writeUint8(0xf4);
    if (value === true) return writeUint8(0xf5);
    if (value === null) return writeUint8(0xf6);
    if (value === undefined) return writeUint8(0xf7);

    switch (typeof value) {
      case "number":
        if (Math.floor(value) === value) {
          if (0 <= value && value <= POW_2_53)
            return writeTypeAndLength(0, value);
          if (-POW_2_53 <= value && value < 0)
            return writeTypeAndLength(1, -(value + 1));
        }
        writeUint8(0xfb);
        return writeFloat64(value);

      case "string": {
        const utf8data: number[] = [];
        for (i = 0; i < value.length; ++i) {
          let charCode = value.charCodeAt(i);

          if (charCode < 0x80) {
            utf8data.push(charCode);
          } else if (charCode < 0x800) {
            utf8data.push(0xc0 | (charCode >> 6));
            utf8data.push(0x80 | (charCode & 0x3f));
          } else if (charCode < 0xd800) {
            utf8data.push(0xe0 | (charCode >> 12));
            utf8data.push(0x80 | ((charCode >> 6) & 0x3f));
            utf8data.push(0x80 | (charCode & 0x3f));
          } else {
            charCode = (charCode & 0x3ff) << 10;
            charCode |= value.charCodeAt(++i) & 0x3ff;
            charCode += 0x10000;

            utf8data.push(0xf0 | (charCode >> 18));
            utf8data.push(0x80 | ((charCode >> 12) & 0x3f));
            utf8data.push(0x80 | ((charCode >> 6) & 0x3f));
            utf8data.push(0x80 | (charCode & 0x3f));
          }
        }

        writeTypeAndLength(3, utf8data.length);
        return writeUint8Array(utf8data);
      }

      default: {
        let length: number;

        if (Array.isArray(value)) {
          length = value.length;
          writeTypeAndLength(4, length);
          for (i = 0; i < length; ++i)
            encodeItem(value[i]);
        } else if (value instanceof Uint8Array) {
          writeTypeAndLength(2, value.length);
          writeUint8Array(value);
        } else {
          const keys = Object.keys(value);
          length = keys.length;
          writeTypeAndLength(5, length);
          for (i = 0; i < length; ++i) {
            const key = keys[i];
            encodeItem(key);
            encodeItem(value[key]);
          }
        }
      }
    }
  }

  encodeItem(value);

  if ("slice" in data)
    return data.slice(0, offset);

  const ret = new ArrayBuffer(offset);
  const retView = new DataView(ret);
  for (let i = 0; i < offset; ++i)
    retView.setUint8(i, dataView.getUint8(i));
  return ret;
}

function decode(
  data: ArrayBuffer,
  tagger: (value: any, tag: number) => any = v => v,
  simpleValue: (value: number) => any = () => undefined
): any {
  const dataView = new DataView(data);
  let offset = 0;

  const commitRead = <T>(length: number, value: T): T => {
    offset += length;
    return value;
  };

  const readArrayBuffer = (length: number) =>
    commitRead(length, new Uint8Array(data, offset, length));

  const readFloat16 = () => {
    const tmp = new DataView(new ArrayBuffer(4));
    const value = readUint16();

    let sign = value & 0x8000;
    let exponent = value & 0x7c00;
    let fraction = value & 0x03ff;

    if (exponent === 0x7c00) exponent = 0xff << 10;
    else if (exponent !== 0) exponent += (127 - 15) << 10;
    else if (fraction !== 0)
      return (sign ? -1 : 1) * fraction * POW_2_24;

    tmp.setUint32(0, (sign << 16) | (exponent << 13) | (fraction << 13));
    return tmp.getFloat32(0);
  };

  const readFloat32 = () => commitRead(4, dataView.getFloat32(offset));
  const readFloat64 = () => commitRead(8, dataView.getFloat64(offset));
  const readUint8 = () => commitRead(1, dataView.getUint8(offset));
  const readUint16 = () => commitRead(2, dataView.getUint16(offset));
  const readUint32 = () => commitRead(4, dataView.getUint32(offset));
  const readUint64 = () => readUint32() * POW_2_32 + readUint32();

  const readBreak = () => {
    if (dataView.getUint8(offset) !== 0xff) return false;
    offset++;
    return true;
  };

  const readLength = (ai: number): number => {
    if (ai < 24) return ai;
    if (ai === 24) return readUint8();
    if (ai === 25) return readUint16();
    if (ai === 26) return readUint32();
    if (ai === 27) return readUint64();
    if (ai === 31) return -1;
    throw "Invalid length encoding";
  };

  const readIndefiniteStringLength = (majorType: number) => {
    const initialByte = readUint8();
    if (initialByte === 0xff) return -1;
    const length = readLength(initialByte & 0x1f);
    if (length < 0 || (initialByte >> 5) !== majorType)
      throw "Invalid indefinite length element";
    return length;
  };

  const appendUtf16Data = (utf16: number[], length: number) => {
    for (let i = 0; i < length; ++i) {
      let value = readUint8();

      if (value & 0x80) {
        if (value < 0xe0) {
          value = ((value & 0x1f) << 6) | (readUint8() & 0x3f);
          length -= 1;
        } else if (value < 0xf0) {
          value =
            ((value & 0x0f) << 12) |
            ((readUint8() & 0x3f) << 6) |
            (readUint8() & 0x3f);
          length -= 2;
        } else {
          value =
            ((value & 0x0f) << 18) |
            ((readUint8() & 0x3f) << 12) |
            ((readUint8() & 0x3f) << 6) |
            (readUint8() & 0x3f);
          length -= 3;
        }
      }

      if (value < 0x10000) {
        utf16.push(value);
      } else {
        value -= 0x10000;
        utf16.push(0xd800 | (value >> 10));
        utf16.push(0xdc00 | (value & 0x3ff));
      }
    }
  };

  const decodeItem = (): any => {
    const initialByte = readUint8();
    const majorType = initialByte >> 5;
    const ai = initialByte & 0x1f;

    if (majorType === 7) {
      if (ai === 25) return readFloat16();
      if (ai === 26) return readFloat32();
      if (ai === 27) return readFloat64();
    }

    let length = readLength(ai);

    if (length < 0 && (majorType < 2 || majorType > 6))
      throw "Invalid length";

    switch (majorType) {
      case 0: return length;
      case 1: return -1 - length;

      case 2:
        if (length < 0) {
          const parts: Uint8Array[] = [];
          let total = 0;
          while ((length = readIndefiniteStringLength(2)) >= 0) {
            const chunk = readArrayBuffer(length);
            total += chunk.length;
            parts.push(chunk);
          }
          const out = new Uint8Array(total);
          let pos = 0;
          for (const p of parts) {
            out.set(p, pos);
            pos += p.length;
          }
          return out;
        }
        return readArrayBuffer(length);

      case 3: {
        const utf16: number[] = [];
        if (length < 0) {
          while ((length = readIndefiniteStringLength(3)) >= 0)
            appendUtf16Data(utf16, length);
        } else appendUtf16Data(utf16, length);
        return String.fromCharCode(...utf16);
      }

      case 4: {
        const arr: any[] = [];
        if (length < 0) {
          while (!readBreak()) arr.push(decodeItem());
        } else {
          for (let i = 0; i < length; i++)
            arr[i] = decodeItem();
        }
        return arr;
      }

      case 5: {
        const obj: any = {};
        for (let i = 0; i < length || (length < 0 && !readBreak()); i++) {
          const key = decodeItem();
          obj[key] = decodeItem();
        }
        return obj;
      }

      case 6:
        return tagger(decodeItem(), length);

      case 7:
        switch (length) {
          case 20: return false;
          case 21: return true;
          case 22: return null;
          case 23: return undefined;
          default: return simpleValue(length);
        }
    }
  };

  const result = decodeItem();
  if (offset !== data.byteLength)
    throw "Remaining bytes";

  return result;
}

export default { encode, decode };
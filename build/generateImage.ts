// import { readdir, readFile, writeFile } from "fs/promises";
// import { join, relative, resolve } from "path";
// import { gzipSync } from "zlib";
// import { createHash } from "crypto";
// import * as CBOR from "./cbor";
// type Entry = { path: string, data: Uint8Array, sha1: string };

// async function walk(dir: string, base: string): Promise<Entry[]> {
//   const entries = await readdir(dir, { withFileTypes: true });
//   const result: Entry[] = [];

//   for(const entry of entries) {
//     const fullPath = join(dir, entry.name);
//     const relPath = relative(base, fullPath).replace(/\\/g, "/");

//     if(entry.isDirectory()) {
//       result.push(...await walk(fullPath, base));
//     } else {
//       const buffer = await readFile(fullPath);
//       const data = new Uint8Array(buffer);
//       const sha1 = createHash("sha1").update(data).digest("hex");
//       result.push({ path: relPath, data, sha1 });
//     }
//   }
//   return result;
// }

// function encode(entries: Entry[]): Uint8Array {
//   return new Uint8Array(CBOR.encode(entries));
// }

// function formatSize(bytes: number): string {
//   const units = ["B", "KB", "MB", "GB", "TB"];
//   let i = 0;
//   let value = bytes;
//   while(value >= 1024 && i < units.length - 1) {
//     value /= 1024;
//     i++;
//   }
//   return `${value.toFixed(2)} ${units[i]}`;
// }

// (async() => {
//   const name = process.argv[2] ?? 'vanilla';
//   const path = process.argv[3] ?? "./game/image";
//   const base = resolve(path);
//   const entries = await walk(base, base);
//   const raw = encode(entries);
//   const compressed = gzipSync(raw);
//   const sha1 = createHash("sha1").update(compressed).digest("hex");
//   const arrayString = Array.from(compressed).join(",");
//   await writeFile(
//     `./run/images/${name}.js`,
//     `window["version"] = { name: "${name}", sha1: "${sha1}" };
// window["image"] = [${arrayString}];`
//   );
//   console.log(`✅ ${name}`);
//   console.log(`✅ Files: ${entries.length}`);
//   console.log(
//     `✅ Compressed: ${formatSize(raw.length)} → ${formatSize(compressed.length)} ` +
//     `(${Math.round(compressed.length / raw.length * 100)}%)`
//   );
// })();


import { readdir, readFile, writeFile } from "fs/promises";
import { join, relative, resolve } from "path";
import { gzipSync } from "zlib";
import { createHash } from "crypto";
// @ts-ignore
import CBOR from "./cbor.ts";
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib';

type Entry = { path: string, data: Uint8Array, sha1: string };

async function walk(dir: string, base: string): Promise<Entry[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const result: Entry[] = [];

  for(const entry of entries) {
    if(entry.name == ".DS_Store") continue;

    const fullPath = join(dir, entry.name);
    const relPath = relative(base, fullPath).replace(/\\/g, "/");

    if(entry.isDirectory()) {
      result.push(...await walk(fullPath, base));
    } else {
      const buffer = await readFile(fullPath);
      const data = new Uint8Array(buffer);
      const sha1 = createHash("sha1").update(data).digest("hex");
      result.push({ path: relPath, data, sha1 });
    }
  }
  return result;
}

function encode(entries: Entry[]): Uint8Array {
  return new Uint8Array(CBOR.encode(entries));
}

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = bytes;
  while(value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

function zstdCompress(input: Uint8Array): Uint8Array {
  const buffer = zstdCompressSync(input);
  return new Uint8Array(buffer).slice();
  // return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

async function build(){
  const name = 'assets';
  const path = "./game/image";
  const base = resolve(path);
  const entries = await walk(base, base);
  const raw = encode(entries);
  // const compressed = gzipSync(raw);
  const compressed = zstdCompress(raw);
  const sha1 = createHash("sha1").update(compressed).digest("hex");
  const arrayString = Array.from(compressed).join(",");
  await writeFile(
    `./run/bin/${name}.js`,
    `window["version"] = { name: "${name}", sha1: "${sha1}" };
window["image_${name}"] = [${arrayString}];`
  );
  console.log(`✅ ${name}`);
  console.log(`✅ Files: ${entries.length}`);
  console.log(
    `✅ Compressed: ${formatSize(raw.length)} → ${formatSize(compressed.length)} ` +
    `(${Math.round(compressed.length / raw.length * 100)}%)`
  );
}

(async() => {
  build();
})();

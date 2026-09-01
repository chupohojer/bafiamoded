import FS, { FSType } from "./fs/fs";
import { error } from './utils/utils';
import { decompress } from "@dweb-browser/zstd-wasm";
import CBOR from './lib/cbor';

const exceptions = ['.DS_Store'];

async function writeToFS(
  toPath = "/",
  structure: Record<string, { data: Uint8Array, sha1: string }>,
  rewrite = false,
  start: (size: number) => void = () => {},
  process: (path: string, write: boolean) => void = () => {}
) {
  const entries = Object.entries(structure);
  const createdDirs = new Set<string>();
  const paths = [];

  start(entries.length);

  async function ensureDir(filePath: string) {
    const parts = filePath.split("/").slice(0, -1);
    let current = "";

    for(const part of parts) {
      if(!part) continue;
      current += "/" + part;

      if(!createdDirs.has(current)) {
        createdDirs.add(current);
        await FS.createDir(current);
      }
    }
  }

  for(const [path, { data, sha1 }] of entries) {
    const filePath = `${toPath}${path}`;
    let shouldWrite = rewrite;

    if(exceptions.some(e => filePath.endsWith(e))) continue;

    if(!rewrite) {
      const exists = await FS.existsFile(filePath);
      if(!exists) {
        shouldWrite = true;
      } else {
        const currentSha1 = await FS.getSHA1(filePath);
        shouldWrite = currentSha1 !== sha1;
      }
    }

    if(shouldWrite) {
      await ensureDir(filePath); 
      await FS.writeFile(filePath, data);
      process(filePath, true);
    } else {
      process(filePath, false);
    }
    paths.push(filePath);
  }
  return paths;
}

export async function readImage(
  path: string,
  toPath = "/",
  rewrite = false,
  options?: { startProcessFS?: (size: number) => void, processFS?: (path: string, write: boolean) => void }
) {
  const obj = window as any
  let name = path.split('/').pop()?.split('.')[0] ?? "image";
  console.log(`Decompressing image ${path}..`);
  if(!obj[name]) throw error('Image not found');
  try {
    const compressed = new Uint8Array(obj[name]);
    const decompressed = decompress(compressed); // @ts-ignore
    const imageArray = CBOR.decode(decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength)) as Array<{ path: string, data: Uint8Array, sha1: string }>;
    // const imageArray = CBOR.decode(decompressed.buffer) as Array<{ path: string, data: Uint8Array, sha1: string }>;
    const image: Record<string, { data: Uint8Array, sha1: string }> = {};
    for(const entry of imageArray) {
      image[entry.path] = { data: entry.data, sha1: entry.sha1 };
    }
    delete obj[name];
    await writeToFS(toPath, image, rewrite, options?.startProcessFS, options?.processFS);
    return image;
  } catch(e) {
    throw error('Image loading error\nThe image may be corrupted', e);
  }
}

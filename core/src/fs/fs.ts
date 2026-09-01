import { IndexedDB } from './indexeddb';
import { OPFS } from './opfs';
import { InMemoryFS } from './inmemory';
export type FSType = 'OPFS' | 'Indexeddb' | 'WASM' | 'InMemory';

export function canWork(type: FSType): boolean{
  if(type == 'OPFS') {
    if(location.protocol == "file:") return false;
  }
  return true;
}

export interface FSBackend {
  logDebug: boolean
  createFile(path: string): Promise<void>;
  writeFile(path: string, data: string | Blob | Uint8Array): Promise<void>;
  readFile(path: string): Promise<string>;
  readFileBytes(path: string): Promise<Uint8Array>;
  readFileB64(path: string): Promise<string>;
  readFileMeta(path: string): Promise<{ createdAt?: number; modifiedAt?: number; sha1?: string }>;
  createDir(path: string): Promise<void>;
  existsDir(path: string): Promise<boolean>;
  existsFile(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  isFile(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;
  deleteFile(path: string): Promise<boolean>;
  deleteDirectory(path: string, recursive?: boolean): Promise<boolean>;
  listDir(path: string): Promise<string[]>;
  rename(oldPath: string, newPath: string): Promise<boolean>;
  copyFile(fromPath: string, toPath: string): Promise<boolean>;
  move(fromPath: string, toPath: string): Promise<boolean>;
  loadImage(path: string): Promise<HTMLImageElement>;
  loadImageAsDataURL(path: string): Promise<string>;
  erase(): Promise<boolean>
  getSHA1(path: string): Promise<string>
}

class FS implements FSBackend {
  logDebug = false;
  public backend!: FSBackend;
  public type: FSType = 'OPFS';

  async init(type: FSType|'auto' = 'auto', root?: FileSystemDirectoryHandle|string) {
    if(type == 'auto'){
      type = 'InMemory';
      if('Indexeddb' in window) type = 'Indexeddb';
      if(typeof navigator.storage != 'undefined') type = 'OPFS';
    }
    this.type = type;
    await this.changeBackend(type, root, true);
    console.log('Filesystem initialized');
  }
  async changeBackend(type: FSType = 'InMemory', root?: FileSystemDirectoryHandle|string, force = false){
    const t = type.toLowerCase();
    if(this.type == type && !force) return;
    if(t == 'opfs') {
      if(location.protocol == "file:") throw new Error(`OPFS doesn't work on protocol file://`);
      if(!root || !(root instanceof FileSystemDirectoryHandle)) root = await navigator.storage.getDirectory();
      this.backend = new OPFS(root);
    } else if(t == 'indexeddb') {
      const backend = new IndexedDB(typeof root == 'string' ? root : 'BafiaOnline');
      await backend.init();
      this.backend = backend;
    } else if(t == 'inmemory') {
      this.backend = new InMemoryFS();
    } else {
      throw new Error('No backend');
    }
    this.type = type;
    console.log('FS Type: '+type);
    this.backend.logDebug = false;

    // window['FS'] = this;
  }
  static async get(type: FSType = 'InMemory', root?: FileSystemDirectoryHandle|string){
    return await(new FS()).init(type, root);
  }
  getMimeType(path: string): string {
    const extension = path.toLowerCase().split('.').pop() || '';

    const mimeTypes: { [key: string]: string } = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',

      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',

      // Video
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',

      // Documents
      'txt': 'text/plain',
      'html': 'text/html',
      'htm': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'pdf': 'application/pdf',

      // Archives
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',

      // Other
      'bin': 'application/octet-stream',
      'exe': 'application/octet-stream',
      'dll': 'application/octet-stream'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  createFile(path: string) { return this.backend.createFile(path); }
  writeFile(path: string, data: string | Blob | Uint8Array) { return this.backend.writeFile(path, data); }
  readFile(path: string) { return this.backend.readFile(path); }
  readFileBytes(path: string) { return this.backend.readFileBytes(path); }
  readFileB64(path: string) { return this.backend.readFileB64(path); }
  readFileMeta(path: string) { return this.backend.readFileMeta(path); }
  createDir(path: string) { return this.backend.createDir(path); }
  existsDir(path: string) { return this.backend.existsDir(path); }
  existsFile(path: string) { return this.backend.existsFile(path); }
  exists(path: string) { return this.backend.exists(path); }
  isFile(path: string) { return this.backend.isFile(path); }
  isDirectory(path: string) { return this.backend.isDirectory(path); }
  deleteFile(path: string) { return this.backend.deleteFile(path); }
  deleteDirectory(path: string, recursive?: boolean) { return this.backend.deleteDirectory(path, recursive); }
  listDir(path: string) { return this.backend.listDir(path); }
  rename(oldPath: string, newPath: string) { return this.backend.rename(oldPath, newPath); }
  copyFile(fromPath: string, toPath: string) { return this.backend.copyFile(fromPath, toPath); }
  move(fromPath: string, toPath: string) { return this.backend.move(fromPath, toPath); }
  loadImage(path: string) { return this.backend.loadImage(path); }
  loadImageAsDataURL(path: string) { return this.backend.loadImageAsDataURL(path); }
  erase() { return this.backend.erase(); }
  getSHA1(path: string) { return this.backend.getSHA1(path); }
}

export default new FS();

import FS, { FSBackend } from "./fs";

interface FileEntry { type: 'file'; content: Blob; createdAt?: number; modifiedAt?: number; sha1?: string }
interface DirEntry { type: 'dir'; }
type Entry = FileEntry | DirEntry;
export class IndexedDB implements FSBackend {
  private db!: IDBDatabase;
  private objectStore = "Storage";
  public logDebug = false;

  constructor(private dbName = "Macintosh HD") {}

  private log(...args: any[]) {
    if(this.logDebug){
      console.log(...args);
    }
  }
  init() {
    return new Promise<void>((res, rej) => {
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
  private transaction() {
    return this.db.transaction([this.objectStore], "readwrite").objectStore(this.objectStore);
  }
  private getPath(path: string): string{
    path = String(path);
    if(!path.startsWith('/')) path = '/'+path;
    return path;
  }

  async createFile(path: string) {
    path = this.getPath(path);
    await this.writeFile(path, "");
  }
  async writeFile(path: string, data: string | Blob | Uint8Array) {
    path = this.getPath(path);
    return new Promise<void>((res, rej) => {
      // @ts-ignore
      const content = data instanceof Blob ? data : new Blob([data instanceof Uint8Array ? data : String(data)]);

      const readStore = this.db.transaction([this.objectStore], 'readonly').objectStore(this.objectStore);
      const getReq = readStore.get(path);
      getReq.onsuccess = () => {
        const existing = getReq.result as Entry | undefined;
        const createdAt = existing && (existing as FileEntry).type === 'file' && (existing as FileEntry).createdAt ? (existing as FileEntry).createdAt : Date.now();
        const entry: FileEntry = { type: 'file', content, createdAt, modifiedAt: Date.now() };

        const computeHashThenPut = async () => {
          try {
            if(typeof crypto !== 'undefined' && (crypto as any).subtle) {
              const buf = await content.arrayBuffer();
              // @ts-ignore
              const hashBuffer = await (crypto as any).subtle.digest('SHA-1', buf);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              entry.sha1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
              entry.sha1 = Math.random().toString();
            }

            const writeStore = this.db.transaction([this.objectStore], 'readwrite').objectStore(this.objectStore);
            const putReq = writeStore.put(entry, path);
            putReq.onsuccess = () => {
              this.log(`Writed file [${path}] = ${data instanceof Uint8Array ? `${data.length} length of uint8array` : data instanceof Blob ? `${data.size} length of blob` : typeof data == 'object' ? '' : `${(data as any).length} length of string`}`);
              res();
            }
            putReq.onerror = () => {
              this.log(`Can't write file [${path}]`);
              rej(putReq.error);
            }
          } catch(e) {
            rej(e);
          }
        }

        computeHashThenPut();
      };

      getReq.onerror = () => rej(getReq.error);
    });
  }
  async readFile(path: string): Promise<string> {
    path = this.getPath(path);
    const bytes = await this.readFileBytes(path);
    return new TextDecoder().decode(bytes);
  }
  async readFileBytes(path: string): Promise<Uint8Array> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise((res, rej) => {
      const request = store.get(path);
      request.onsuccess = () => {
        const result = request.result as Entry;
        if(result && result.type == 'file') {
          if(result.content instanceof Blob) {
              result.content.arrayBuffer().then(buf => res(new Uint8Array(buf)));
          }/* else if(typeof result.content == 'string') {
            const encoder = new TextEncoder();
            res(encoder.encode(result.content));
            // @ts-ignore
          } else if(result.content instanceof Uint8Array) {
            res(result.content);
          }*/ else {
            rej(new Error("Unsupported file content type"));
          }
        } else {
          rej(("File not found or not a file "+path));
        }
      };
      request.onerror = () => rej(request.error);
    });
  }
  async readFileB64(path: string): Promise<string> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise((res, rej) => {
      const request = store.get(path);
      request.onsuccess = () => {
        const result = request.result as Entry;
        if(result?.type === 'file') {
          result.content.arrayBuffer().then(buf => {
            const bytes = new Uint8Array(buf);
            let binary = '';
            bytes.forEach(byte => binary += String.fromCharCode(byte));
            res(`data:${result.content.type || 'application/octet-stream'};base64,${btoa(binary)}`);
          });
        } else {
          rej(("File not found or not a file"));
        }
      };
      request.onerror = () => rej(request.error);
    });
  }
  async createDir(path: string): Promise<void> {
    path = this.getPath(path);
    if(await this.existsDir(path)) return;
    const store = this.transaction();
    return new Promise((res, rej) => {
      const entry: DirEntry = { type: 'dir' };
      const request = store.put(entry, path);
      request.onsuccess = () => {
        this.log(`Created directory ${path}`)
        res();
      }
      request.onerror = () => {
        this.log(`Can't create directory`)
        rej(request.error);
      }
    });
  }
  async existsDir(path: string): Promise<boolean> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise((res) => {
      const request = store.get(path);
      request.onsuccess = () => res(request.result !== undefined && request.result.type == 'dir');
      request.onerror = () => res(false);
    });
  }
  async existsFile(path: string): Promise<boolean> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise((res) => {
      const request = store.get(path);
      request.onsuccess = () => res(request.result !== undefined && request.result.type == 'file');
      request.onerror = () => res(false);
    });
  }
  async exists(path: string): Promise<boolean> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise((res) => {
      const request = store.get(path);
      request.onsuccess = () => res(request.result !== undefined);
      request.onerror = () => res(false);
    });
  }
  async isFile(path: string): Promise<boolean> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise(res => {
      const request = store.get(path);
      request.onsuccess = () => res(request.result?.type === 'file');
      request.onerror = () => res(false);
    });
  }
  async isDirectory(path: string): Promise<boolean> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise(res => {
      const request = store.get(path);
      request.onsuccess = () => res(request.result?.type === 'dir');
      request.onerror = () => res(false);
    });
  }
  async deleteFile(path: string): Promise<boolean> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise(res => {
      const req = store.delete(path);
      req.onsuccess = () => {
        this.log(`Deleted file ${path}`);
        res(true);
      }
      req.onerror = () => {
        this.log(`Can't delete file ${path}`);
        res(false);
      }
    });
  }
  async deleteDirectory(path: string, recursive = false): Promise<boolean> {
    path = this.getPath(path);
    const store = this.transaction();
    const dirPath = path.endsWith("/") ? path : path + "/";
    const keysToDelete: string[] = [];

    return new Promise((res) => {
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if(!cursor) {
          const tx = this.transaction();

          tx.delete(path);

          if(recursive) {
            for(const key of keysToDelete) {
              tx.delete(key);
            }
          }

          this.log(`Deleted directory ${path} - ${recursive}`);
          res(true);
          return;
        }

        const key = cursor.key as string;
        if(recursive && key.startsWith(dirPath)) {
          keysToDelete.push(key);
        }

        cursor.continue();
      };

      request.onerror = () => {
        this.log(`Can't delete directory ${path} - ${recursive}`);
        res(false);
      }
    });
  }
  async listDir(path: string): Promise<string[]> {
    path = this.getPath(path);
    const store = this.db.transaction([this.objectStore], "readonly").objectStore(this.objectStore);
    const entries = new Set<string>();
    const prefix = path.endsWith("/") ? path : path + "/";

    return new Promise((res, rej) => {
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if(!cursor) return res([...entries]);

        const key = cursor.key as string;
        if(key.startsWith(prefix)) {
          const relative = key.slice(prefix.length).split("/")[0];
          entries.add(relative);
        }

        cursor.continue();
      };
      request.onerror = () => rej(request.error);
    });
  }
  async rename(oldPath: string, newPath: string): Promise<boolean> {
    oldPath = this.getPath(oldPath);
    newPath = this.getPath(newPath);
    const content = await this.readFileBytes(oldPath);
    await this.writeFile(newPath, content);
    this.log(`Rename ${oldPath} - ${newPath}`);
    return this.deleteFile(oldPath);
  }
  async copyFile(fromPath: string, toPath: string): Promise<boolean> {
    fromPath = this.getPath(fromPath);
    toPath = this.getPath(toPath);
    const content = await this.readFileBytes(fromPath);
    await this.writeFile(toPath, content);
    this.log(`Copy ${fromPath} - ${toPath}`);
    return true;
  }
  async move(fromPath: string, toPath: string): Promise<boolean> {
    fromPath = this.getPath(fromPath);
    toPath = this.getPath(toPath);
    const success = await this.copyFile(fromPath, toPath);
    if(success) {
      this.log(`Move ${fromPath} - ${toPath}`);
      return this.deleteFile(fromPath);
    }
    this.log(`Can't move ${fromPath} - ${toPath}`);
    return false;
  }
  async loadImage(path: string): Promise<HTMLImageElement> {
    path = this.getPath(path);
    const data = await this.readFileBytes(path);
    // @ts-ignore
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
        rej(("Image load failed"));
      };
      img.src = url;
    });
  }
  cacheImagesAsDataURL: Record<string, { sha1: string, result: string }> = {};
  async loadImageAsDataURL(path: string): Promise<string> {
    path = this.getPath(path);
    const sha1 = await this.getSHA1(path);
    if(this.cacheImagesAsDataURL[path] && this.cacheImagesAsDataURL[path].sha1 == sha1){
      return this.cacheImagesAsDataURL[path].result;
    }

    const data = await this.readFileBytes(path);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    const mimeType = FS.getMimeType(path);
    const result = `data:${mimeType};base64,${base64}`;

    this.cacheImagesAsDataURL[path] = { sha1, result }
    return result;
  }
  public async erase(): Promise<boolean> {
    return new Promise((res, rej) => {
      const request = indexedDB.open(this.db.name);

      request.onsuccess = () => {
        const db = request.result;

        const transaction = db.transaction(db.objectStoreNames, "readwrite");

        for(let storeName of db.objectStoreNames){
          transaction.objectStore(storeName).clear();
        }

        transaction.oncomplete = () => {
          db.close();
          res(true);
        }

        transaction.onerror = () => {
          rej(transaction.error);
        }
      };

      request.onerror = event => {
        rej(request.error);
      };
    });
  }
  async getSHA1(path: string): Promise<string> {
    path = this.getPath(path);
    const store = this.transaction();
    return new Promise((res, rej) => {
      const req = store.get(path);
      req.onsuccess = async () => {
        const result = req.result as Entry | undefined;
        if(result && result.type === 'file') {
          const fileEntry = result as FileEntry;
          if(fileEntry.sha1) return res(fileEntry.sha1);

          try {
            const buf = await fileEntry.content.arrayBuffer();
            if(typeof crypto === 'undefined' || !(crypto as any).subtle) {
              const fallback = Math.random().toString();
              fileEntry.sha1 = fallback;
              const writeStore = this.db.transaction([this.objectStore], 'readwrite').objectStore(this.objectStore);
              writeStore.put(fileEntry, path);
              return res(fallback);
            }
            // @ts-ignore
            const hashBuffer = await (crypto as any).subtle.digest('SHA-1', buf);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            fileEntry.sha1 = hex;
            fileEntry.modifiedAt = fileEntry.modifiedAt || Date.now();
            const writeStore = this.db.transaction([this.objectStore], 'readwrite').objectStore(this.objectStore);
            writeStore.put(fileEntry, path);
            return res(hex);
          } catch(e) {
            return rej(e);
          }
        }
        rej(new Error('File not found or not a file'));
      };
      req.onerror = () => rej(req.error);
    });
  }

  async readFileMeta(path: string): Promise<{ createdAt?: number; modifiedAt?: number; sha1?: string }> {
    path = this.getPath(path);
    const store = this.db.transaction([this.objectStore], 'readonly').objectStore(this.objectStore);
    return new Promise((res, rej) => {
      const req = store.get(path);
      req.onsuccess = () => {
        const result = req.result as Entry | undefined;
        if(result && result.type === 'file') {
          const f = result as FileEntry;
          res({ createdAt: f.createdAt, modifiedAt: f.modifiedAt, sha1: f.sha1 });
        } else {
          rej(new Error('File not found or not a file'));
        }
      };
      req.onerror = () => rej(req.error);
    });
  }
}

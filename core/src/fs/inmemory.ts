import fs, { FSBackend, FSType } from "./fs";

export class InMemoryFS implements FSBackend {
    public type: FSType = "InMemory";
    public logDebug = false;
    
    private data: { [path: string]: { content: Uint8Array; isDir: boolean } } = {};

    private log(...args: any[]) {
        if(this.logDebug){
            console.log(...args);
        }
    }

    private getPath(path: string): string{
        if(!path.startsWith('/')) path = '/'+path;
        return path;
    }

    public async createFile(path: string): Promise<void> {
        this.data[this.getPath(path)] = { content: new Uint8Array(), isDir: false };
        this.log(`Created file [${path}]`);
    }
    public async writeFile(path: string, data: string | object | Blob | Uint8Array): Promise<void> {
        path = this.getPath(path);
        let buffer: Uint8Array;

        if(typeof data == "string") {
            buffer = new TextEncoder().encode(data);
        } else if(data instanceof Blob) {
            const arrayBuffer = await data.arrayBuffer();
            buffer = new Uint8Array(arrayBuffer);
        } else if(data instanceof Uint8Array) {
            buffer = data;
        } else if(typeof data == 'object') {
            buffer = new TextEncoder().encode(JSON.stringify(data));
        } else {
            throw error("Unsupported data type");
        }

        this.data[path] = { content: buffer, isDir: false };
        this.log(`Wrote to file [${path}]`);
    }
    public async readFile(path: string): Promise<string> {
        path = this.getPath(path);
        const entry = this.data[path];
        if(!entry || entry.isDir) {
            throw error(`File not found: ${path}`);
        }
        return new global.TextDecoder().decode(entry.content);
    }
    public async readFileBytes(path: string): Promise<Uint8Array> {
        path = this.getPath(path);
        const entry = this.data[path];
        if(!entry || entry.isDir) {
            throw error(`File not found: ${path}`);
        }
        return entry.content;
    }
    public async readFileB64(path: string): Promise<string> {
        path = this.getPath(path);
        const bytes = await this.readFileBytes(path);
        return global.btoa(global.String.fromCharCode.apply(null, bytes as any));
    }
    public async loadImage(path: string): Promise<HTMLImageElement> {
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
    async loadImageAsDataURL(path: string): Promise<string> {
        path = this.getPath(path);
        const data = await this.readFileBytes(path);

        const base64 = global.btoa(global.String.fromCharCode(...new global.Uint8Array(data)));
        const mimeType = fs.getMimeType(path);
        
        return `data:${mimeType};base64,${base64}`;
    }
    public async createDir(path: string): Promise<void> {
        path = this.getPath(path);
        if(await this.existsDir(path)) return;
        this.data[path] = { content: new Uint8Array(0), isDir: true };
        this.log(`Created directory [${path}]`);
    }
    public async exists(path: string): Promise<boolean> {
        path = this.getPath(path);
        return !!this.data[path];
    }
    public async existsFile(path: string): Promise<boolean> {
        path = this.getPath(path);
        const entry = this.data[path];
        return !!(entry && !entry.isDir);
    }
    public async existsDir(path: string): Promise<boolean> {
        path = this.getPath(path);
        const entry = this.data[path];
        return !!(entry && entry.isDir);
    }
    public async isFile(path: string): Promise<boolean> {
        path = this.getPath(path);
        const entry = this.data[path];
        return !!(entry && !entry.isDir);
    }
    public async isDirectory(path: string): Promise<boolean> {
        path = this.getPath(path);
        const entry = this.data[path];
        return !!(entry && entry.isDir);
    }
    public async deleteFile(path: string): Promise<boolean> {
        path = this.getPath(path);
        if(!(await this.existsFile(path))){
            this.log(`Can't delete file [${path}] - not exists`);
            return false;
        }
        delete this.data[path];
        this.log(`Deleted file [${path}]`);
        return true;
    }
    public async deleteDirectory(path: string, recursive = false): Promise<boolean> {
        path = this.getPath(path);
        if(!(await this.existsDir(path))){
            this.log(`Can't delete directory [${path}] - not exists`);
            return false;
        }
        if(!recursive) {
            for(const key in this.data) {
                if(key != path && key.startsWith(path + "/")) {
                    this.log(`Directory not empty: ${path}`);
                    return false;
                }
            }
        }

        const keysToDelete = Object.keys(this.data).filter(
            (key) => key == path || key.startsWith(path + "/")
        );
        for(const key of keysToDelete) {
            delete this.data[key];
        }

        this.log(`Deleted directory [${path}]`);
        return true;
    }
    public async listDir(path: string): Promise<string[]> {
        path = this.getPath(path);
        if(!(await this.existsDir(path))) {
            throw error(`Directory not found: ${path}`);
        }

        const result: Set<string> = new Set();

        for(const key in this.data) {
            if(key == path) continue;
            if(key.startsWith(path + "/")) {
                const subPath = key.substring(path.length + 1);
                const slashIndex = subPath.indexOf("/");
                const name = slashIndex == -1 ? subPath : subPath.substring(0, slashIndex);
                result.add(name);
            }
        }

        return Array.from(result);
    }
    public async rename(oldPath: string, newPath: string): Promise<boolean> {
        oldPath = this.getPath(oldPath);
        newPath = this.getPath(newPath);
        if(!(await this.exists(oldPath))) {
            this.log(`Rename failed: source [${oldPath}] does not exist`);
            return false;
        }
        if(await this.exists(newPath)) {
            this.log(`Rename failed: target [${newPath}] already exists`);
            return false;
        }

        const isDir = await this.isDirectory(oldPath);
        const oldContent = this.data[oldPath];

        if(isDir) {
            const entries = Object.keys(this.data).filter((k) =>
                k.startsWith(oldPath + "/")
            );

            for(const key of entries) {
                const suffix = key.substring(oldPath.length);
                this.data[newPath + suffix] = this.data[key];
                delete this.data[key];
            }
        } else {
            this.data[newPath] = oldContent;
            delete this.data[oldPath];
        }

        this.log(`Renamed [${oldPath}] → [${newPath}]`);
        return true;
    }
    public async copyFile(fromPath: string, toPath: string): Promise<boolean> {
        fromPath = this.getPath(fromPath);
        toPath = this.getPath(toPath);
        if(!(await this.existsFile(fromPath))) {
            this.log(`Copy failed: source file [${fromPath}] does not exist`);
            return false;
        }
        if(await this.exists(toPath)) {
            this.log(`Copy failed: target file [${toPath}] already exists`);
            return false;
        }

        const content = this.data[fromPath].content;
        this.data[toPath] = { content, isDir: false };

        this.log(`Copied [${fromPath}] → [${toPath}]`);
        return true;
    }
    public async move(fromPath: string, toPath: string): Promise<boolean> {
        fromPath = this.getPath(fromPath);
        toPath = this.getPath(toPath);
        if(await this.copyFile(fromPath, toPath)) {
            this.log(`Move ${fromPath} - ${toPath}`);
            return await this.deleteFile(fromPath);
        }
        this.log(`Can't move ${fromPath} - ${toPath}`);
        return false
    }
    public async erase(): Promise<boolean> {
        this.data = {};
        return true;
    }
    async getSHA1(path: string): Promise<string> {
        path = this.getPath(path);
        const bytes = await this.readFileBytes(path);

        const hashBuffer = await global.crypto.subtle.digest("SHA-1", bytes);
        const hashArray = global.Array.from(new global.Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
}
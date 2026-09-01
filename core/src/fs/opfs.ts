import fs, { FSBackend, FSType } from "./fs";

export class OPFS implements FSBackend {
    public type: FSType = "OPFS"
    public logDebug = false;
    
    constructor(private root: FileSystemDirectoryHandle) {}
    
    private log(...args: any[]) {
        if(this.logDebug){
            console.log(...args);
        }
    }
    private getPath(path: string): string{
        if(!path.startsWith('/')) path = '/'+path;
        return path;
    }
    private async getPathParts(path: string): Promise<string[]> {
        return path.replace(/^\/+/, "").split("/").filter(global.Boolean)
    }
    private async getParentDirHandle(path: string, create = false): Promise<FileSystemDirectoryHandle> {
        path = this.getPath(path);
        const parts = await this.getPathParts(path)
        parts.pop()
        let dir = this.root
        for(const part of parts) {
            dir = await dir.getDirectoryHandle(part, {create})
        }
        return dir
    }
    private async getFileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
        path = this.getPath(path);
        const parts = await this.getPathParts(path)
        const name = parts.pop()!
        const parent = await this.getParentDirHandle(path, create)
        return parent.getFileHandle(name, {create})
    }
    private async getDirectoryHandle(path: string, create = false): Promise<FileSystemDirectoryHandle> {
        path = this.getPath(path);
        const parts = await this.getPathParts(path)
        let dir = this.root
        for(const part of parts) {
            dir = await dir.getDirectoryHandle(part, {create})
        }
        return dir
    }

    public async createFile(path: string): Promise<void> {
        path = this.getPath(path);
        await this.getFileHandle(path, true);
        this.log(`Created file [${path}]`);
    }
    public async writeFile(path: string, data: string | Blob | Uint8Array): Promise<void> {
        path = this.getPath(path);
        const fileHandle = await this.getFileHandle(path, true)
        const writable = await fileHandle.createWritable();
        if(data instanceof global.Uint8Array) await writable.write(new global.Blob([data]))
        else await writable.write(data)
        await writable.close()
        this.log(`Writed file [${path}] = ${data instanceof global.Uint8Array ? `${data.length} length of uint8array` : data instanceof global.Blob ? "" : `${data.length} length of string`}`);
    }
    public async readFile(path: string): Promise<string> {
        path = this.getPath(path);
        try{
            const fileHandle = await this.getFileHandle(path)
            const file = await fileHandle.getFile()
            return await file.text()
        }catch(e){
            throw error(`Can't read file [${path}]`);
        }
    }
    public async readFileBytes(path: string): Promise<Uint8Array> {
        path = this.getPath(path);
        try{
            const fileHandle = await this.getFileHandle(path);
            const file = await fileHandle.getFile();
            const buffer = await file.arrayBuffer();
            return new global.Uint8Array(buffer);
        }catch(e){
            throw error(`Can't read file [${path}]`);
        }
    }
    public async readFileB64(path: string): Promise<string> {
        path = this.getPath(path);
        try{
            let binary = '';
            const fileHandle = await this.getFileHandle(path);
            const file = await fileHandle.getFile();
            const buffer = await file.arrayBuffer();
            const bytes = new global.Uint8Array(buffer);
            bytes.forEach(byte => binary += global.String.fromCharCode(byte));
            return `data:${file.type || 'application/octet-stream'};base64,${global.btoa(binary)}`;
        }catch(e){
            throw error(`Can't read file [${path}]`);
        }
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
        await this.getDirectoryHandle(path, true);
        this.log(`Created directory [${path}]`);
    }
    public async exists(path: string): Promise<boolean> {
        path = this.getPath(path);
        let file = false;
        let directory = false;
        try {
            await this.getFileHandle(path);
            file = true;
        } catch{}
        try {
            await this.getDirectoryHandle(path);
            directory = true;
        } catch{}
        return file || directory;
    }
    public async existsFile(path: string): Promise<boolean> {
        path = this.getPath(path);
        try {
            await this.getFileHandle(path);
            return true;
        } catch{}
        return false;
    }
    public async existsDir(path: string): Promise<boolean> {
        path = this.getPath(path);
        try {
            await this.getDirectoryHandle(path);
            return true;
        } catch{}
        return false;
    }
    public async isFile(path: string): Promise<boolean> {
        path = this.getPath(path);
        try {
            await this.getFileHandle(path)
            return true
        } catch {
            return false
        }
    }
    public async isDirectory(path: string): Promise<boolean> {
        path = this.getPath(path);
        try {
            await this.getDirectoryHandle(path)
            return true
        } catch {
            return false
        }
    }
    public async deleteFile(path: string): Promise<boolean> {
        path = this.getPath(path);
        if(!(await this.existsFile(path))){
            this.log(`Can't delete file [${path}] - not exists`);
            return false;
        }
        try {
            const parts = await this.getPathParts(path);
            const name = parts.pop()!;
            const parent = await this.getParentDirHandle(path);
            await parent.removeEntry(name);
            this.log(`Deleted file [${path}]`);
            return true
        } catch(e) {
            this.log(`Can't delete file [${path}] - ${e}`);
            return false
        }
    }
    public async deleteDirectory(path: string, recursive = false): Promise<boolean> {
        path = this.getPath(path);
        if(!(await this.existsDir(path))){
            this.log(`Can't delete directory [${path}] - not exists`);
            return false;
        }
        try {
            const parts = await this.getPathParts(path)
            const name = parts.pop()!
            const parent = await this.getParentDirHandle(path)
            await parent.removeEntry(name, {recursive})
            this.log(`Deleted directory [${path}]`);
            return true
        } catch(e) {
            this.log(`Can't delete directory [${path}] - ${e}`);
            return false
        }
    }
    public async listDir(path: string): Promise<string[]> {
        path = this.getPath(path);
        try {
            const dir = await this.getDirectoryHandle(path);
            const result: string[] = [];
            for await(const [name] of dir.entries()) result.unshift(name);
            return result;
        } catch {
            return [];
        }
    }
    public async rename(oldPath: string, newPath: string): Promise<boolean> {
        oldPath = this.getPath(oldPath);
        newPath = this.getPath(newPath);
        try {
            const file = await this.readFileBytes(oldPath);
            await this.writeFile(newPath, file);
            const success = await this.deleteFile(oldPath);
            if(success) this.log(`Renamed file ${oldPath} - ${newPath}`);
            else this.log(`Failed to delete original file during rename`);
            return success;
        } catch {
            this.log(`Can't rename file ${oldPath} - ${newPath}`);
            return false
        }
    }
    public async copyFile(fromPath: string, toPath: string): Promise<boolean> {
        fromPath = this.getPath(fromPath);
        toPath = this.getPath(toPath);
        try {
            const data = await this.readFileBytes(fromPath)
            await this.writeFile(toPath, data)
            this.log(`Copy ${fromPath} - ${toPath}`);
            return true
        } catch {
            this.log(`Can't copy ${fromPath} - ${toPath}`);
            return false
        }
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
        async function deleteAllEntries(dirHandle: FileSystemDirectoryHandle) {
            for await(const [name, handle] of dirHandle.entries()) {
                if(handle.kind == 'file') {
                    await dirHandle.removeEntry(name);
                } else if(handle.kind == 'directory') {
                    await deleteAllEntries(handle as FileSystemDirectoryHandle);
                    await dirHandle.removeEntry(name, { recursive: true });
                }
            }
        }
        await deleteAllEntries(this.root);
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
import { Readable } from 'stream';

export interface FileObject {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
}

export interface StorageDriver {
    upload(file: FileObject, path: string): Promise<string>;
    delete(path: string): Promise<void>;
    getReadUrl(path: string): Promise<string>; // Returns signed URL or public URL
}

import { Injectable } from '@nestjs/common';
import { StorageDriver, FileObject } from './storage.driver.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageDriver implements StorageDriver {
    private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';

    constructor() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async upload(file: FileObject, destination: string): Promise<string> {
        const filePath = path.join(this.uploadDir, destination);
        fs.writeFileSync(filePath, file.buffer);
        return destination; // Return relative path
    }

    async delete(destination: string): Promise<void> {
        const filePath = path.join(this.uploadDir, destination);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    async getReadUrl(destination: string): Promise<string> {
        // In local mode, we return a relative URL handled by the controller
        // The ID will be swapped by the Service in practice, but here we return the key
        return destination;
    }
}

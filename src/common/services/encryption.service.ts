import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;

    constructor(private readonly configService: ConfigService) {
        const secret = this.configService.get<string>('ENCRYPTION_KEY');
        if (!secret || secret.length !== 64) {
            // In production, this should throw an error. For dev, we'll generate a fallback (but warn)
            console.warn('WARNING: ENCRYPTION_KEY not found or invalid. Using fallback for development only.');
            this.key = crypto.scryptSync(secret || 'fallback-secret', 'salt', 32);
        } else {
            this.key = Buffer.from(secret, 'hex');
        }
    }

    encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${tag}:${encrypted}`;
    }

    decrypt(hash: string): string {
        const [ivHex, tagHex, encryptedText] = hash.split(':');

        if (!ivHex || !tagHex || !encryptedText) {
            throw new Error('Invalid encryption format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

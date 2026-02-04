import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { StorageDriver, FileObject } from './storage.driver.interface';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageDriver implements StorageDriver {
    private s3: S3Client;
    private bucket: string;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
        this.bucket = process.env.AWS_S3_BUCKET || 'shipex-uploads';
    }

    async upload(file: FileObject, destination: string): Promise<string> {
        try {
            await this.s3.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: destination,
                Body: file.buffer,
                ContentType: file.mimeType,
            }));
            return destination;
        } catch (e) {
            console.error('S3 Upload Error:', e);
            throw new InternalServerErrorException('Failed to upload to S3');
        }
    }

    async delete(destination: string): Promise<void> {
        try {
            await this.s3.send(new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: destination,
            }));
        } catch (e) {
            console.error('S3 Delete Error:', e);
            // We suppress delete errors to facilitate soft consistency
        }
    }

    async getReadUrl(destination: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: destination,
        });
        // Generate pre-signed URL valid for 1 hour
        return getSignedUrl(this.s3, command, { expiresIn: 3600 });
    }
}

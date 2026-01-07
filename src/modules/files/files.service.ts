import { Injectable, BadRequestException } from '@nestjs/common';
import { UploadFileDto } from './dto/upload-file.dto';
import { PrismaService } from '../core/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads';
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(private readonly prisma: PrismaService) {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(uploadFileDto: UploadFileDto, tenantId: string) {
    // Validate file size
    const fileSizeInBytes = parseInt(uploadFileDto.fileSize, 10);
    if (fileSizeInBytes > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of 5MB`,
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];
    if (!allowedTypes.includes(uploadFileDto.fileType)) {
      throw new BadRequestException(
        `File type ${uploadFileDto.fileType} is not allowed`,
      );
    }

    try {
      // Generate unique filename
      const fileExtension = this.getFileExtension(uploadFileDto.fileType);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, uniqueFileName);

      // Decode base64 and write file
      const fileBuffer = Buffer.from(uploadFileDto.base64Data, 'base64');
      fs.writeFileSync(filePath, fileBuffer);

      // Save file metadata to database
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const savedFile = await (this.prisma as any).uploadedFile.create({
        data: {
          fileName: uploadFileDto.fileName,
          fileType: uploadFileDto.fileType,
          fileSize: fileSizeInBytes,
          fileCategory: uploadFileDto.fileCategory,
          filePath: uniqueFileName,
          tenantId,
          orderId: uploadFileDto.orderId || null,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        id: savedFile.id,
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        fileSize: savedFile.fileSize,
        fileCategory: savedFile.fileCategory,
        fileUrl: `/api/v1/files/${savedFile.id}/download`,
        uploadedAt: savedFile.createdAt,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload file: ${(error as Error).message}`,
      );
    }
  }

  async getFile(fileId: string, tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const file = await (this.prisma as any).uploadedFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Verify tenant ownership
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (file.tenantId !== tenantId) {
      throw new BadRequestException('Unauthorized access to file');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return file;
  }

  async downloadFile(fileId: string, tenantId: string) {
    const file = await this.getFile(fileId, tenantId);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const filePath = path.join(this.uploadDir, file.filePath);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('File not found on disk');
    }

    return {
      filePath,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      fileName: file.fileName,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      fileType: file.fileType,
    };
  }

  async deleteFile(fileId: string, tenantId: string) {
    const file = await this.getFile(fileId, tenantId);

    try {
      // Delete file from disk
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const filePath = path.join(this.uploadDir, file.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete file metadata from database
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const deletedFile = await (this.prisma as any).uploadedFile.delete({
        where: { id: fileId },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return { message: 'File deleted successfully', fileId: deletedFile.id };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file: ${(error as Error).message}`,
      );
    }
  }

  async getFilesByOrder(orderId: string, tenantId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const files = await (this.prisma as any).uploadedFile.findMany({
      where: {
        orderId,
        tenantId,
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        fileCategory: true,
        createdAt: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return files.map((file: any) => ({
      ...file,
      fileUrl: `/api/v1/files/${file.id}/download`,
    }));
  }

  private getFileExtension(fileType: string): string {
    const extensionMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'application/pdf': '.pdf',
    };
    return extensionMap[fileType] || '.bin';
  }
}

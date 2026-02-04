import { Injectable, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { UploadFileDto } from './dto/upload-file.dto';
import { PrismaService } from '../core/prisma.service';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import { UserRole } from '@prisma/client';
import type { StorageDriver } from './storage/storage.driver.interface';

@Injectable()
export class FilesService {
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STORAGE_DRIVER') private readonly storage: StorageDriver
  ) { }

  async uploadFile(uploadFileDto: UploadFileDto, user: ActiveUserData) {
    const tenantId = user.tenantId;

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
      // Decode base64
      const fileBuffer = Buffer.from(uploadFileDto.base64Data, 'base64');

      // Generate unique filename
      const fileExtension = this.getFileExtension(uploadFileDto.fileType);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;

      // Upload using Strategy
      await this.storage.upload({
        buffer: fileBuffer,
        fileName: uniqueFileName,
        mimeType: uploadFileDto.fileType
      }, uniqueFileName);

      // Save file metadata to database
      const savedFile = await this.prisma.uploadedFile.create({
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

      const fileUrl = process.env.CDN_URL
        ? `${process.env.CDN_URL}/${uniqueFileName}`
        : `/api/v1/files/${savedFile.id}/download`;

      return {
        id: savedFile.id,
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        fileSize: savedFile.fileSize,
        fileCategory: savedFile.fileCategory,
        fileUrl,
        uploadedAt: savedFile.createdAt,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload file: ${(error as Error).message}`,
      );
    }
  }

  async getFile(fileId: string, user: ActiveUserData) {
    const file = await this.prisma.uploadedFile.findUnique({
      where: { id: fileId },
      include: { order: true },
    });

    if (!file) {
      throw new BadRequestException('File not found');
    }

    // Verify tenant ownership
    if (file.tenantId !== user.tenantId && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Unauthorized access to file (tenant mismatch)');
    }

    // Role-based Access Check
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return file;
    }

    if (!file.orderId) {
      throw new ForbiddenException('Access denied to general tenant files');
    }

    if (user.role === UserRole.MERCHANT) {
      const merchant = await this.prisma.merchantProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!merchant || file.order?.merchantId !== merchant.id) {
        throw new ForbiddenException('You do not have access to this file');
      }
    }

    if (user.role === UserRole.COURIER) {
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!courier || file.order?.courierId !== courier.id) {
        throw new ForbiddenException('You do not have access to this file');
      }
    }

    return file;
  }

  async downloadFile(fileId: string, user: ActiveUserData) {
    const file = await this.getFile(fileId, user);

    // Get URL from Strategy (S3 signed URL or local path)
    const url = await this.storage.getReadUrl(file.filePath);

    return {
      fileName: file.fileName,
      fileType: file.fileType,
      url: url, // Returns signed URL for S3, or relative path for local
      isRedirect: process.env.STORAGE_DRIVER === 's3'
    };
  }

  async deleteFile(fileId: string, user: ActiveUserData) {
    const file = await this.getFile(fileId, user);

    // Only Admin can delete files
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can delete files');
    }

    try {
      // Delete using Strategy
      await this.storage.delete(file.filePath);

      // Delete file metadata from database
      const deletedFile = await this.prisma.uploadedFile.delete({
        where: { id: fileId },
      });

      return { message: 'File deleted successfully', fileId: deletedFile.id };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file: ${(error as Error).message}`,
      );
    }
  }

  async getFilesByOrder(orderId: string, user: ActiveUserData) {
    // Validate order access first
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, tenantId: user.tenantId },
    });

    if (!order) {
      throw new BadRequestException('Order not found in your tenant');
    }

    if (user.role === UserRole.MERCHANT) {
      const merchant = await this.prisma.merchantProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!merchant || order.merchantId !== merchant.id) {
        throw new ForbiddenException('You do not have access to this order\'s files');
      }
    }

    if (user.role === UserRole.COURIER) {
      const courier = await this.prisma.courierProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!courier || order.courierId !== courier.id) {
        throw new ForbiddenException('You do not have access to this order\'s files');
      }
    }

    const files = await this.prisma.uploadedFile.findMany({
      where: {
        orderId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        fileCategory: true,
        filePath: true,
        createdAt: true,
      },
    });

    return files.map((file) => ({
      ...file,
      fileUrl: process.env.CDN_URL
        ? `${process.env.CDN_URL}/${file.filePath}` // Note: need to include filePath in select for this
        : `/api/v1/files/${file.id}/download`,
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

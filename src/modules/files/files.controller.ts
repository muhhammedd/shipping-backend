import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Post('upload')
  async uploadFile(
    @Body() uploadFileDto: UploadFileDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.filesService.uploadFile(uploadFileDto, user);
  }

  @Get(':id')
  async getFileInfo(
    @Param('id') fileId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.filesService.getFile(fileId, user);
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id') fileId: string,
    @ActiveUser() user: ActiveUserData,
    @Res() res: Response,
  ) {
    const fileData = await this.filesService.downloadFile(
      fileId,
      user,
    );

    if (fileData.isRedirect) {
      return res.redirect(fileData.url);
    }

    // For local driver, fileData.url is the relative path
    const filePath = require('path').join(process.env.UPLOAD_DIR || './uploads', fileData.url);
    if (!require('fs').existsSync(filePath)) {
      throw new BadRequestException('File not found');
    }
    return res.download(filePath, fileData.fileName);
  }

  @Delete(':id')
  async deleteFile(
    @Param('id') fileId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.filesService.deleteFile(fileId, user);
  }

  @Get('order/:orderId/files')
  async getFilesByOrder(
    @Param('orderId') orderId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return await this.filesService.getFilesByOrder(orderId, user);
  }
}

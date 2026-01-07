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
import { Response } from 'express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  async uploadFile(
    @Body() uploadFileDto: UploadFileDto,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.filesService.uploadFile(uploadFileDto, user.tenantId);
  }

  @Get(':id')
  async getFileInfo(
    @Param('id') fileId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.filesService.getFile(fileId, user.tenantId);
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id') fileId: string,
    @ActiveUser() user: ActiveUserData,
    @Res() res: Response,
  ) {
    const fileData = await this.filesService.downloadFile(fileId, user.tenantId);

    if (!fs.existsSync(fileData.filePath)) {
      throw new BadRequestException('File not found');
    }

    res.download(fileData.filePath, fileData.fileName);
  }

  @Delete(':id')
  async deleteFile(
    @Param('id') fileId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.filesService.deleteFile(fileId, user.tenantId);
  }

  @Get('order/:orderId/files')
  async getFilesByOrder(
    @Param('orderId') orderId: string,
    @ActiveUser() user: ActiveUserData,
  ) {
    return this.filesService.getFilesByOrder(orderId, user.tenantId);
  }
}

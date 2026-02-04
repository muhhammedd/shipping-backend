import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { CoreModule } from '../core/core.module';
import { LocalStorageDriver } from './storage/local-storage.driver';
import { S3StorageDriver } from './storage/s3-storage.driver';

@Module({
  imports: [CoreModule],
  providers: [
    FilesService,
    {
      provide: 'STORAGE_DRIVER',
      useClass: process.env.STORAGE_DRIVER === 's3' ? S3StorageDriver : LocalStorageDriver,
    },
    LocalStorageDriver,
    S3StorageDriver,
  ],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule { }

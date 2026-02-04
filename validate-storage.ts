
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module'; // Adjust path if needed
import { FilesService } from './src/modules/files/files.service';
import { StorageDriver } from './src/modules/files/storage/storage.driver.interface';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    // We can't easily test the Service directly without mocking the DB or Request context
    // But we can check if the Driver is correctly injected

    const filesService = app.get(FilesService);

    // Reflection check (hacky way to see if private property is set)
    const driver = (filesService as any).storage;

    console.log('🚀 Checking Storage Driver Info...');
    if (driver) {
        console.log(`✅ Storage Driver Injected: ${driver.constructor.name}`);

        if (process.env.STORAGE_DRIVER === 's3') {
            if (driver.constructor.name === 'S3StorageDriver') {
                console.log('✅ Configuration matches Env: S3');
            } else {
                console.error('❌ Mismatch! Env is S3 but Driver is ' + driver.constructor.name);
            }
        } else {
            if (driver.constructor.name === 'LocalStorageDriver') {
                console.log('✅ Configuration matches Env: Local');
            } else {
                console.error('❌ Mismatch! Env is Local but Driver is ' + driver.constructor.name);
            }
        }
    } else {
        console.error('❌ Storage Driver NOT Injected');
    }

    await app.close();
}

bootstrap();

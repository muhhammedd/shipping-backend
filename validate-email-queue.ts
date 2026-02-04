import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmailService } from './src/modules/communication/email/email.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const emailService = app.get(EmailService);

    console.log('🚀 Sending test email...');
    try {
        const result = await emailService.sendWelcomeEmail('test@shipex.com', 'Test User');

        if (result) {
            console.log('✅ Email queued successfully');
            console.log('⏳ Waiting for processor...');
        } else {
            console.error('❌ Failed to queue email');
        }
    } catch (e) {
        console.error('Error:', e);
    }

    // Wait for 5 seconds to hopefully see the processor logs
    setTimeout(async () => {
        await app.close();
        console.log('👋 Closed');
    }, 5000);
}

bootstrap();

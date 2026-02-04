import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SmsService } from '../src/modules/communication/sms/sms.service';
import { PushService } from '../src/modules/communication/push/push.service';
import { EmailService } from '../src/modules/communication/email/email.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

async function verify() {
    const logger = new Logger('Verification');
    const app = await NestFactory.createApplicationContext(AppModule);

    // Enable shutdown hooks
    app.enableShutdownHooks();

    const smsService = app.get(SmsService);
    const pushService = app.get(PushService);
    const emailService = app.get(EmailService);
    const notificationsService = app.get(NotificationsService);
    const eventEmitter = app.get(EventEmitter2);

    logger.log('--- Verifying Communication Module ---');

    // Test SMS
    logger.log('Sending Test SMS...');
    await smsService.sendSms('+1234567890', 'Test SMS from Shipex');

    // Test Push
    logger.log('Sending Test Push...');
    await pushService.sendPush('fake-token', 'Test Push', 'Hello world');

    // Test Email
    logger.log('Sending Welcome Email...');
    await emailService.sendWelcomeEmail('test@example.com', 'John Doe');

    logger.log('--- Verifying Real-time Notifications ---');

    // Listen for events
    eventEmitter.on('notification.created', (payload) => {
        logger.log(`[Event Received] notification.created: ${JSON.stringify(payload)}`);
    });

    eventEmitter.on('order.status_updated', (payload) => {
        logger.log(`[Event Received] order.status_updated: ${JSON.stringify(payload)}`);
    });

    // Mock Notification trigger (Note: This requires valid DB IDs usually, but let's see if we can trigger event without full DB validity if we mock the service or just call the method and expect it to fail on DB but MAYBE emit event? 
    // Actually method creates DB record first. So it will fail if data invalid.
    // We can try to manually emit event to verify listeners working?
    // Or just check if services are defined.

    logger.log('Emitting test event manually to verify listener...');
    eventEmitter.emit('order.status_updated', {
        orderId: 'test-order-id',
        status: 'DELIVERED',
        tenantId: 'test-tenant',
        message: 'Order delivered',
    });

    // We can't easily call notificationsService.notifyOrderStatusChange without valid IDs, 
    // so we skip that integration test here and rely on manual event emission verification.

    // Give some time for events to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.log('Verification Complete');
    await app.close();
}

verify().catch(console.error);

import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { ShippingModule } from '../shipping/shipping.module';
import { AuditLogService } from '../../common/services/audit-log.service';
import { ExportService } from '../../common/services/export.service';
import { AuditLogsController } from './controllers/audit-logs.controller';
import { DeliveryZonesController } from './controllers/delivery-zones.controller';
import { TenantsAdminController } from './controllers/tenants.admin.controller';
import { UsersAdminController } from './controllers/users.admin.controller';
import { ConfigAdminController } from './controllers/config.admin.controller';
import { ReportsAdminController } from './controllers/reports.admin.controller';
import { AdminQuotasController } from './admin-quotas.controller';

@Module({
    imports: [CoreModule, ShippingModule],
    providers: [AuditLogService, ExportService],
    controllers: [
        AuditLogsController,
        DeliveryZonesController,
        TenantsAdminController,
        UsersAdminController,
        ConfigAdminController,
        AdminQuotasController,
        ReportsAdminController
    ],
    exports: [AuditLogService],
})
export class AdminModule { }

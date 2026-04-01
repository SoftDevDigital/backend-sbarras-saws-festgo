import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './controllers/admin.controller';
import { PrinterController } from './controllers/printer.controller';
import { AdminService } from './services/admin.service';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

// Admin Schemas
import {
  AuditLog,
  AuditLogSchema,
} from '../shared/schemas/admin/audit-log.schema';
import {
  SystemSetting,
  SystemSettingSchema,
} from '../shared/schemas/admin/system-setting.schema';
import {
  Backup,
  BackupSchema,
  AdminNotification,
  AdminNotificationSchema,
  DataExport,
  DataExportSchema,
} from '../shared/schemas/admin/admin-extras.schema';

// Entity Schemas for Metrics
import { Ticket, TicketSchema } from '../shared/schemas/ticket.schema';
import { Expense, ExpenseSchema } from '../shared/schemas/expense.schema';
import { Event, EventSchema } from '../shared/schemas/event.schema';
import { Employee, EmployeeSchema } from '../shared/schemas/employee.schema';
import { Product, ProductSchema } from '../shared/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: SystemSetting.name, schema: SystemSettingSchema },
      { name: Backup.name, schema: BackupSchema },
      { name: AdminNotification.name, schema: AdminNotificationSchema },
      { name: DataExport.name, schema: DataExportSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: Event.name, schema: EventSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    SharedModule,
    AuthModule,
  ],
  controllers: [AdminController, PrinterController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

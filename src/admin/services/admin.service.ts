import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  IDashboardMetrics,
  IReport,
  IAuditLog,
  ISystemSettings,
  IBackupInfo,
  INotification,
  IExportRequest,
} from '../../shared/interfaces/admin.interface';
import {
  DashboardQueryDto,
  ReportQueryDto,
  AuditQueryDto,
  SettingsQueryDto,
  UpdateSettingsDto,
  CreateBackupDto,
  RestoreBackupDto,
  CreateNotificationDto,
  ExportDataDto,
  SystemHealthDto,
} from '../dto/admin.dto';

// Admin Entities
import {
  AuditLog,
  AuditLogDocument,
} from '../../shared/schemas/admin/audit-log.schema';
import {
  SystemSetting,
  SystemSettingDocument,
} from '../../shared/schemas/admin/system-setting.schema';
import {
  Backup,
  BackupDocument,
  AdminNotification,
  AdminNotificationDocument,
  DataExport,
  DataExportDocument,
} from '../../shared/schemas/admin/admin-extras.schema';

// Metrics Entities
import { Ticket, TicketDocument } from '../../shared/schemas/ticket.schema';
import { Expense, ExpenseDocument } from '../../shared/schemas/expense.schema';
import { Event, EventDocument } from '../../shared/schemas/event.schema';
import {
  Employee,
  EmployeeDocument,
} from '../../shared/schemas/employee.schema';
import { Product, ProductDocument } from '../../shared/schemas/product.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(SystemSetting.name)
    private readonly systemSettingModel: Model<SystemSettingDocument>,
    @InjectModel(Backup.name)
    private readonly backupModel: Model<BackupDocument>,
    @InjectModel(AdminNotification.name)
    private readonly notificationModel: Model<AdminNotificationDocument>,
    @InjectModel(DataExport.name)
    private readonly exportModel: Model<DataExportDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async getDashboardMetrics(
    query: DashboardQueryDto,
  ): Promise<IDashboardMetrics> {
    try {
      const now = new Date();
      let dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

      if (query.dateFrom) dateFrom = new Date(query.dateFrom);

      const filter: any = { createdAt: { $gte: dateFrom } };
      if (query.eventId) filter.eventId = query.eventId;

      const [
        tickets,
        expenses,
        activeEvents,
        employeesCount,
        lowStockProducts,
      ] = await Promise.all([
        this.ticketModel.find(filter),
        this.expenseModel.find(filter),
        this.eventModel.countDocuments({ status: 'active' }),
        this.employeeModel.countDocuments({ status: 'active' }),
        this.productModel.countDocuments({
          $expr: { $lte: ['$stock', '$minStock'] },
        }),
      ]);

      const totalSales = tickets.reduce((sum, t) => sum + t.total, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      const byList = new Map<
        string,
        {
          priceListId: string | null;
          priceListName: string | null;
          ticketCount: number;
          revenue: number;
        }
      >();
      for (const t of tickets) {
        const key = `${t.priceListId || '_none'}|${t.priceListName || ''}`;
        const row = byList.get(key) || {
          priceListId: t.priceListId || null,
          priceListName: t.priceListName || null,
          ticketCount: 0,
          revenue: 0,
        };
        row.ticketCount += 1;
        row.revenue += t.total || 0;
        byList.set(key, row);
      }
      const salesByPriceList = Array.from(byList.values()).sort(
        (a, b) => b.revenue - a.revenue,
      );

      return {
        totalSales,
        totalExpenses,
        netProfit: totalSales - totalExpenses,
        totalTickets: tickets.length,
        activeEvents,
        totalEmployees: employeesCount,
        lowStockProducts,
        salesByPriceList,
        recentActivity: tickets.slice(0, 10).map((t) => ({
          id: t._id,
          type: 'ticket',
          action: 'created',
          description: `Venta - Ticket #${t._id}${
            t.priceListName ? ` · Lista: ${t.priceListName}` : ''
          }`,
          amount: t.total,
          userId: t.userId,
          userName: t.userName,
          timestamp: t['createdAt']?.toISOString(),
        })),
      };
    } catch (error) {
      this.logger.error('Error fetching dashboard metrics:', error.message);
      throw new BadRequestException('Failed to get dashboard metrics');
    }
  }

  async generateReport(query: ReportQueryDto): Promise<IReport | any> {
    const reportType = query.type || 'sales';
    const reportId = `report_${Date.now()}`;

    if (reportType === 'sales') {
      const filter: any = { status: 'paid' };
      if (query.eventId) filter.eventId = query.eventId;
      if (query.dateFrom || query.dateTo) {
        filter.createdAt = {};
        if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
        if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
      }

      const tickets = await this.ticketModel
        .find(filter)
        .sort({ createdAt: -1 })
        .lean();

      const totalAmount = tickets.reduce((s, t) => s + (t.total || 0), 0);

      const byList = new Map<
        string,
        {
          priceListId: string | null;
          priceListName: string;
          ticketCount: number;
          revenue: number;
        }
      >();
      for (const t of tickets) {
        const key = `${t.priceListId || '_sin_lista'}|${t.priceListName || ''}`;
        const name =
          t.priceListName ||
          (t.priceListId ? '(lista sin nombre)' : 'Precio catálogo (barra sin lista)');
        const row = byList.get(key) || {
          priceListId: t.priceListId || null,
          priceListName: name,
          ticketCount: 0,
          revenue: 0,
        };
        row.ticketCount += 1;
        row.revenue += t.total || 0;
        byList.set(key, row);
      }

      const data = tickets.map((t) => ({
        ticketId: t._id,
        createdAt: t['createdAt'],
        total: t.total,
        subtotal: t.subtotal,
        totalTax: t.totalTax,
        barId: t.barId,
        barName: t.barName,
        eventId: t.eventId,
        eventName: t.eventName,
        priceListId: t.priceListId || null,
        priceListName: t.priceListName || null,
        paymentMethod: t.paymentMethod,
        userName: t.userName,
        itemsCount: (t.items || []).length,
      }));

      return {
        id: reportId,
        type: 'sales',
        title: 'Reporte de ventas',
        description:
          'Tickets pagados con lista de precios y barra/evento. Cada fila es un ticket; los totales por lista usan el snapshot guardado al vender.',
        data,
        summary: {
          totalRecords: tickets.length,
          totalAmount,
          averageAmount:
            tickets.length > 0 ? totalAmount / tickets.length : 0,
          topItems: Array.from(byList.values())
            .sort((a, b) => b.revenue - a.revenue)
            .map((row) => ({
              name: row.priceListName,
              value: row.revenue,
              percentage:
                totalAmount > 0 ? (row.revenue / totalAmount) * 100 : 0,
            })),
        },
        salesByPriceList: Array.from(byList.values()).sort(
          (a, b) => b.revenue - a.revenue,
        ),
        generatedAt: new Date().toISOString(),
        generatedBy: 'system',
        period: { from: query.dateFrom, to: query.dateTo },
      };
    }

    return {
      id: reportId,
      type: reportType,
      title: `${reportType.toUpperCase()} Report`,
      description: `Generated report for ${reportType}`,
      data: [],
      summary: { totalRecords: 0, totalAmount: 0 },
      generatedAt: new Date().toISOString(),
      generatedBy: 'system',
      period: { from: query.dateFrom, to: query.dateTo },
    };
  }

  async getAuditLogs(query: AuditQueryDto): Promise<IAuditLog[] | any[]> {
    const filter: any = {};
    if (query.userId) filter.userId = query.userId;
    if (query.action) filter.action = query.action;
    if (query.resource) filter.resource = query.resource;

    const logs = await this.auditLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100);
    return logs;
  }

  async getSystemSettings(
    query: SettingsQueryDto,
  ): Promise<ISystemSettings[] | any[]> {
    const filter: any = {};
    if (query.category) filter.category = query.category;

    const settings = await this.systemSettingModel.find(filter);
    return settings;
  }

  async updateSystemSettings(
    updateDto: UpdateSettingsDto,
  ): Promise<ISystemSettings | any> {
    const updated = await this.systemSettingModel.findOneAndUpdate(
      { key: updateDto.key },
      {
        $set: {
          value: updateDto.value,
          updatedAt: new Date(),
          updatedBy: 'admin',
        },
      },
      { new: true, upsert: true },
    );
    return updated;
  }

  async createBackup(createDto: CreateBackupDto): Promise<IBackupInfo | any> {
    const newBackup = new this.backupModel({
      filename: `backup_${Date.now()}.json`,
      size: 0,
      type: createDto.type || 'full',
      status: 'pending',
      createdBy: 'admin',
    });
    return await newBackup.save();
  }

  async restoreBackup(
    restoreDto: RestoreBackupDto,
  ): Promise<{ message: string }> {
    return { message: 'Restore initiated' };
  }

  async createNotification(
    createDto: CreateNotificationDto,
  ): Promise<INotification | any> {
    const newNotif = new this.notificationModel({
      ...createDto,
      status: 'pending',
      createdBy: 'admin',
    });
    return await newNotif.save();
  }

  async exportData(exportDto: ExportDataDto): Promise<IExportRequest | any> {
    const newExport = new this.exportModel({
      type: exportDto.format,
      entity: exportDto.entity,
      filters: exportDto,
      status: 'pending',
      createdBy: 'admin',
    });
    return await newExport.save();
  }

  async getSystemHealth(): Promise<SystemHealthDto> {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage:
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) *
          100,
      },
      database: {
        status: 'connected',
        responseTime: 10,
      },
      services: [{ name: 'Core', status: 'up', responseTime: 5 }],
      lastBackup: new Date().toISOString(),
      activeUsers: 1,
      timestamp: new Date().toISOString(),
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GlobalStock,
  GlobalStockDocument,
} from '../../shared/schemas/stock/global-stock.schema';
import {
  BarStock,
  BarStockDocument,
} from '../../shared/schemas/stock/bar-stock.schema';
import {
  StockMovement,
  StockMovementDocument,
} from '../../shared/schemas/stock/stock-movement.schema';
import {
  StockAlert,
  StockAlertDocument,
} from '../../shared/schemas/stock/stock-alert.schema';
import {
  StockTransfer,
  StockTransferDocument,
} from '../../shared/schemas/stock/stock-transfer.schema';
import {
  CreateStockMovementDto,
  UpdateStockMovementDto,
  StockMovementQueryDto,
  CreateBarStockDto,
  UpdateBarStockDto,
  BarStockQueryDto,
  UpdateGlobalStockDto,
  GlobalStockQueryDto,
  StockAlertQueryDto,
  AcknowledgeAlertDto,
  CreateStockTransferDto,
  UpdateStockTransferDto,
  StockTransferQueryDto,
  StockReportQueryDto,
  BulkStockOperationDto,
  StockValidationDto,
  StockStatsQueryDto,
} from '../dto/stock.dto';
import {
  IStockMovement,
  IBarStock,
  IGlobalStock,
  IStockAlert,
  IStockTransfer,
  IStockReport,
  IStockStats,
  IStockValidation,
} from '../../shared/interfaces/stock.interface';
import { ProductService } from '../../products/services/product.service';
import { AuthService } from '../../auth/services/auth.service';
import { BarService } from '../../bars/services/bar.service';
import { EventService } from '../../events/services/event.service';
import { BusinessConfigService } from '../../shared/services/business-config.service';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @InjectModel(GlobalStock.name)
    private readonly globalStockModel: Model<GlobalStockDocument>,
    @InjectModel(BarStock.name)
    private readonly barStockModel: Model<BarStockDocument>,
    @InjectModel(StockMovement.name)
    private readonly stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(StockAlert.name)
    private readonly stockAlertModel: Model<StockAlertDocument>,
    @InjectModel(StockTransfer.name)
    private readonly stockTransferModel: Model<StockTransferDocument>,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly barService: BarService,
    private readonly eventService: EventService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  // ===== STOCK MOVEMENTS =====

  async createMovement(
    createMovementDto: CreateStockMovementDto,
    recordedBy: string,
  ): Promise<IStockMovement> {
    try {
      const user = await this.authService.findUserById(recordedBy);
      const product = await this.productService.findOne(
        createMovementDto.productId,
      );

      let barName = '';
      let eventName = '';

      if (createMovementDto.barId) {
        const bar = await this.barService.findOne(createMovementDto.barId);
        barName = bar.name;
        if (createMovementDto.eventId) {
          const event = await this.eventService.findOne(
            createMovementDto.eventId,
          );
          eventName = event.name;
        }
      }

      let previousQuantity = 0;
      let newQuantity = createMovementDto.quantity;

      if (createMovementDto.barId) {
        const barStock = await this.barStockModel.findOne({
          barId: createMovementDto.barId,
          productId: createMovementDto.productId,
          eventId: createMovementDto.eventId,
        });
        previousQuantity = barStock ? barStock.currentStock : 0;

        switch (createMovementDto.type) {
          case 'initial':
            newQuantity = createMovementDto.quantity;
            break;
          case 'replenish':
            newQuantity = previousQuantity + createMovementDto.quantity;
            break;
          case 'adjustment':
            newQuantity = previousQuantity + createMovementDto.quantity;
            break;
          case 'transfer':
            newQuantity = previousQuantity - createMovementDto.quantity;
            break;
        }
      }

      const movement = new this.stockMovementModel({
        ...createMovementDto,
        productName: product.name,
        barName,
        eventName,
        previousQuantity,
        newQuantity,
        recordedBy,
        recordedByName: user.name,
      });

      const saved = await movement.save();
      await this.updateStockFromMovement(createMovementDto, newQuantity);
      await this.checkAndCreateAlerts(
        createMovementDto.productId,
        createMovementDto.barId,
        newQuantity,
      );

      return this.mapMovement(saved);
    } catch (error) {
      this.logger.error('Error creating stock movement:', error.message);
      throw error;
    }
  }

  async findMovements(
    query: StockMovementQueryDto = {},
  ): Promise<IStockMovement[]> {
    const filter: any = {};
    if (query.productId) filter.productId = query.productId;
    if (query.barId) filter.barId = query.barId;
    if (query.eventId) filter.eventId = query.eventId;
    if (query.type) filter.type = query.type;
    if (query.ticketId) filter.ticketId = query.ticketId;

    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
    }

    const movements = await this.stockMovementModel
      .find(filter)
      .sort({ createdAt: -1 });
    return movements.map((m) => this.mapMovement(m));
  }

  // ===== BAR STOCK =====

  async assignStockToBar(
    createBarStockDto: CreateBarStockDto,
    recordedBy: string,
  ): Promise<IBarStock> {
    const product = await this.productService.findOne(
      createBarStockDto.productId,
    );
    const bar = await this.barService.findOne(createBarStockDto.barId);
    const event = await this.eventService.findOne(createBarStockDto.eventId);

    const existing = await this.barStockModel.findOne({
      productId: createBarStockDto.productId,
      barId: createBarStockDto.barId,
      eventId: createBarStockDto.eventId,
    });
    if (existing)
      throw new ConflictException(
        'Stock already assigned for this product in this bar event.',
      );

    const globalStock = await this.getGlobalStock(createBarStockDto.productId);
    if (globalStock.availableStock < createBarStockDto.initialStock) {
      throw new BadRequestException(
        `Insufficient global stock. Available: ${globalStock.availableStock}`,
      );
    }

    const barStock = new this.barStockModel({
      ...createBarStockDto,
      productName: product.name,
      barName: bar.name,
      eventName: event.name,
      currentStock: createBarStockDto.initialStock,
      status: 'active',
    });

    const saved = await barStock.save();

    await this.globalStockModel.updateOne(
      { productId: createBarStockDto.productId },
      {
        $inc: { reservedStock: createBarStockDto.initialStock },
        $set: { updatedAt: new Date() },
      },
    );
    await this.updateGlobalAvailableStock(createBarStockDto.productId);

    await this.createMovement(
      {
        productId: createBarStockDto.productId,
        barId: createBarStockDto.barId,
        eventId: createBarStockDto.eventId,
        type: 'initial',
        quantity: createBarStockDto.initialStock,
        reason: 'Initial stock assignment',
      },
      recordedBy,
    );

    return this.mapBarStock(saved);
  }

  async findBarStock(query: BarStockQueryDto = {}): Promise<IBarStock[]> {
    const filter: any = {};
    if (query.barId) filter.barId = query.barId;
    if (query.eventId) filter.eventId = query.eventId;
    if (query.productId) filter.productId = query.productId;
    if (query.status) filter.status = query.status;

    let stocks = await this.barStockModel.find(filter);

    if (query.lowStock)
      stocks = stocks.filter((s) => s.currentStock <= s.minStock);
    if (query.outOfStock) stocks = stocks.filter((s) => s.currentStock <= 0);

    return stocks.map((s) => this.mapBarStock(s));
  }

  // ===== STOCK VALIDATION =====

  async validateStock(
    stockValidationDto: StockValidationDto,
  ): Promise<IStockValidation> {
    const {
      productId,
      barId,
      quantity: requestedQuantity,
    } = stockValidationDto;
    let currentStock = 0;

    if (barId) {
      const barStock = await this.barStockModel.findOne({ productId, barId });
      currentStock = barStock ? barStock.currentStock : 0;
    } else {
      const globalStock = await this.getGlobalStock(productId);
      currentStock = globalStock.availableStock;
    }

    const errors = [];
    const warnings = [];
    const suggestions = [];

    if (requestedQuantity <= 0)
      errors.push('Requested quantity must be positive');
    if (requestedQuantity > currentStock) {
      errors.push(`Insufficient stock. Available: ${currentStock}`);
      if (currentStock > 0) suggestions.push(`Reduce to ${currentStock}`);
    }
    if (currentStock > 0 && currentStock <= 5)
      warnings.push('Low stock warning');
    if (currentStock <= 0) warnings.push('Out of stock');

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  // ===== GLOBAL STOCK =====

  async getGlobalStock(productId: string): Promise<IGlobalStock> {
    let stock = await this.globalStockModel.findOne({ productId });
    if (!stock) {
      const product = await this.productService.findOne(productId);
      stock = new this.globalStockModel({
        productId,
        productName: product.name,
        totalStock: product.stock || 0,
        reservedStock: 0,
        availableStock: product.stock || 0,
        minStock: product.minStock || 0,
      });
      await stock.save();
    }
    return this.mapGlobalStock(stock);
  }

  async updateGlobalStock(
    productId: string,
    updateData: UpdateGlobalStockDto,
  ): Promise<IGlobalStock> {
    const stock = await this.globalStockModel.findOneAndUpdate(
      { productId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { new: true },
    );
    if (!stock) throw new NotFoundException('Global stock not found');
    await this.updateGlobalAvailableStock(productId);
    return this.mapGlobalStock(
      await this.globalStockModel.findOne({ productId }),
    );
  }

  private async updateGlobalAvailableStock(productId: string) {
    const stock = await this.globalStockModel.findOne({ productId });
    if (stock) {
      stock.availableStock = stock.totalStock - stock.reservedStock;
      await stock.save();
    }
  }

  // ===== INTEGRATION =====

  async processSaleStock(
    ticketId: string,
    items: Array<{ productId: string; quantity: number }>,
    barId: string,
  ): Promise<void> {
    for (const item of items) {
      const barStock = await this.barStockModel.findOne({
        productId: item.productId,
        barId,
      });
      if (!barStock)
        throw new BadRequestException(
          `Product ${item.productId} not in bar ${barId}`,
        );
      if (barStock.currentStock < item.quantity)
        throw new BadRequestException(
          `Insufficient stock for ${barStock.productName}`,
        );

      barStock.currentStock -= item.quantity;
      barStock.totalSold += item.quantity;
      await barStock.save();

      await this.createMovement(
        {
          productId: item.productId,
          barId,
          type: 'adjustment',
          quantity: -item.quantity,
          ticketId,
          reason: `Sale from ticket ${ticketId}`,
        },
        'system',
      );

      await this.checkAndCreateAlerts(
        item.productId,
        barId,
        barStock.currentStock,
      );
    }
  }

  // ===== TRANSFERS =====

  async requestStockTransfer(
    transferData: CreateStockTransferDto,
    requestedBy: string,
  ): Promise<IStockTransfer> {
    const fromBar = await this.barService.findOne(transferData.fromBarId);
    const toBar = await this.barService.findOne(transferData.toBarId);
    const product = await this.productService.findOne(transferData.productId);
    const user = await this.authService.findUserById(requestedBy);

    const fromStock = await this.barStockModel.findOne({
      productId: transferData.productId,
      barId: transferData.fromBarId,
    });
    if (!fromStock || fromStock.currentStock < transferData.quantity)
      throw new BadRequestException('Insufficient source stock');

    const transfer = new this.stockTransferModel({
      ...transferData,
      productName: product.name,
      fromBarName: fromBar.name,
      toBarName: toBar.name,
      requestedBy,
      requestedByName: user.name,
      status: 'pending',
    });

    const saved = await transfer.save();
    return this.mapTransfer(saved);
  }

  async findTransfers(
    query: StockTransferQueryDto = {},
  ): Promise<IStockTransfer[]> {
    const filter: any = {};
    if (query.productId) filter.productId = query.productId;
    if (query.status) filter.status = query.status;
    if (query.fromBarId) filter.fromBarId = query.fromBarId;
    if (query.toBarId) filter.toBarId = query.toBarId;

    const transfers = await this.stockTransferModel
      .find(filter)
      .sort({ createdAt: -1 });
    return transfers.map((t) => this.mapTransfer(t));
  }

  async updateTransferStatus(
    id: string,
    updateData: UpdateStockTransferDto,
    approvedBy: string,
  ): Promise<IStockTransfer> {
    const transfer = await this.stockTransferModel.findById(id);
    if (!transfer) throw new NotFoundException('Transfer not found');
    const user = await this.authService.findUserById(approvedBy);

    if (updateData.status === 'approved') {
      transfer.status = 'approved';
      transfer.approvedBy = approvedBy;
      transfer.approvedByName = user.name;

      const fromStock = await this.barStockModel.findOne({
        productId: transfer.productId,
        barId: transfer.fromBarId,
      });
      const toStock = await this.barStockModel.findOne({
        productId: transfer.productId,
        barId: transfer.toBarId,
      });

      if (fromStock && toStock) {
        fromStock.currentStock -= transfer.quantity;
        fromStock.totalTransferred += transfer.quantity;
        toStock.currentStock += transfer.quantity;
        await fromStock.save();
        await toStock.save();
        transfer.status = 'completed';
      }
    } else if (updateData.status === 'rejected') {
      transfer.status = 'rejected';
      transfer.approvedBy = approvedBy;
      transfer.approvedByName = user.name;
    }

    await transfer.save();
    return this.mapTransfer(transfer);
  }

  async updateBarStock(id: string, updateData: any): Promise<IBarStock> {
    const updated = await this.barStockModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Bar stock not found');
    return this.mapBarStock(updated);
  }

  async updateMovement(id: string, updateData: any): Promise<IStockMovement> {
    const updated = await this.stockMovementModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Movement not found');
    return this.mapMovement(updated);
  }

  async deleteMovement(id: string): Promise<void> {
    await this.stockMovementModel.findByIdAndDelete(id);
  }

  async deleteTransfer(id: string): Promise<void> {
    await this.stockTransferModel.findByIdAndDelete(id);
  }

  async deleteBarStock(id: string): Promise<void> {
    await this.barStockModel.findByIdAndDelete(id);
  }

  // ===== HELPERS =====

  private async updateStockFromMovement(
    movementDto: CreateStockMovementDto,
    newQuantity: number,
  ) {
    if (movementDto.barId) {
      const filter = {
        barId: movementDto.barId,
        productId: movementDto.productId,
      };
      const update: any = {
        $set: { updatedAt: new Date(), lastMovement: new Date().toISOString() },
      };

      switch (movementDto.type) {
        case 'initial':
          update.$set.currentStock = newQuantity;
          break;
        case 'replenish':
          update.$inc = {
            currentStock: movementDto.quantity,
            totalReplenished: movementDto.quantity,
          };
          break;
        case 'adjustment':
          update.$set.currentStock = newQuantity;
          break;
        case 'transfer':
          update.$inc = {
            currentStock: -movementDto.quantity,
            totalTransferred: movementDto.quantity,
          };
          break;
      }
      await this.barStockModel.updateOne(filter, update);
    }
  }

  private async checkAndCreateAlerts(
    productId: string,
    barId: string,
    currentStock: number,
  ) {
    const product = await this.productService.findOne(productId);
    if (currentStock <= product.minStock) {
      const type = currentStock <= 0 ? 'out_of_stock' : 'low_stock';
      const severity = currentStock <= 0 ? 'critical' : 'medium';

      const alert = new this.stockAlertModel({
        productId,
        productName: product.name,
        barId,
        type,
        currentStock,
        threshold: product.minStock,
        severity,
        acknowledged: false,
        createdAt: new Date().toISOString(),
      });
      await alert.save();
    }
  }

  async findAlerts(query: StockAlertQueryDto = {}): Promise<IStockAlert[]> {
    const filter: any = {};
    if (query.productId) filter.productId = query.productId;
    if (query.barId) filter.barId = query.barId;
    if (query.type) filter.type = query.type;
    if (query.acknowledged !== undefined)
      filter.acknowledged = query.acknowledged;

    const alerts = await this.stockAlertModel
      .find(filter)
      .sort({ createdAt: -1 });
    return alerts.map((a) => this.mapAlert(a));
  }

  async acknowledgeAlert(
    id: string,
    acknowledgeData: AcknowledgeAlertDto,
    acknowledgedBy: string,
  ): Promise<void> {
    await this.stockAlertModel.findByIdAndUpdate(id, {
      $set: {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
      },
    });
  }

  // ===== MAPPERS =====

  private mapMovement(m: StockMovementDocument): IStockMovement {
    return {
      id: m._id,
      productId: m.productId,
      productName: m.productName,
      barId: m.barId,
      barName: m.barName,
      eventId: m.eventId,
      eventName: m.eventName,
      type: m.type,
      quantity: m.quantity,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      reason: m.reason,
      ticketId: m.ticketId,
      recordedBy: m.recordedBy,
      recordedByName: m.recordedByName,
      createdAt: m['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: m['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }

  private mapBarStock(s: BarStockDocument): IBarStock {
    return {
      id: s._id,
      productId: s.productId,
      productName: s.productName,
      barId: s.barId,
      barName: s.barName,
      eventId: s.eventId,
      eventName: s.eventName,
      initialStock: s.initialStock,
      currentStock: s.currentStock,
      finalStock: s.finalStock,
      totalSold: s.totalSold,
      totalReplenished: s.totalReplenished,
      totalTransferred: s.totalTransferred,
      lastMovement: s.lastMovement,
      status: s.status,
      createdAt: s['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: s['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }

  private mapGlobalStock(s: GlobalStockDocument): IGlobalStock {
    return {
      id: s._id,
      productId: s.productId,
      productName: s.productName,
      totalStock: s.totalStock,
      reservedStock: s.reservedStock,
      availableStock: s.availableStock,
      minStock: s.minStock,
      // @ts-ignore
      lastUpdated:
        s.lastUpdated ||
        s['updatedAt']?.toISOString() ||
        new Date().toISOString(),
      createdAt: s['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: s['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }

  private mapAlert(a: StockAlertDocument): IStockAlert {
    return {
      id: a._id,
      productId: a.productId,
      productName: a.productName,
      barId: a.barId,
      barName: a.barName,
      type: a.type,
      currentStock: a.currentStock,
      threshold: a.threshold,
      severity: a.severity,
      message: a.message,
      acknowledged: a.acknowledged,
      acknowledgedBy: a.acknowledgedBy,
      acknowledgedAt: a.acknowledgedAt,
      createdAt: a['createdAt'],
    };
  }

  private mapTransfer(t: StockTransferDocument): IStockTransfer {
    return {
      id: t._id,
      productId: t.productId,
      productName: t.productName,
      fromBarId: t.fromBarId,
      fromBarName: t.fromBarName,
      toBarId: t.toBarId,
      toBarName: t.toBarName,
      eventId: t.eventId,
      eventName: t.eventName,
      quantity: t.quantity,
      reason: t.reason,
      requestedBy: t.requestedBy,
      requestedByName: t.requestedByName,
      approvedBy: t.approvedBy,
      approvedByName: t.approvedByName,
      status: t.status,
      createdAt: t['createdAt'],
      updatedAt: t['updatedAt'],
    };
  }

  // Placeholder methods for controller completeness
  async getStockStats(query: StockStatsQueryDto): Promise<IStockStats> {
    return {} as any;
  }
  async generateStockReport(query: StockReportQueryDto): Promise<IStockReport> {
    return {} as any;
  }
  async getProductAvailability(
    productId: string,
    eventId?: string,
  ): Promise<any> {
    return {} as any;
  }
  async getEventStockSummary(eventId: string): Promise<any> {
    return {} as any;
  }
  async getStockConfig(): Promise<any> {
    return {} as any;
  }
  async updateStockConfig(configData: any): Promise<void> {}
  async performBulkOperation(
    bulkData: BulkStockOperationDto,
    performedBy: string,
  ): Promise<any> {
    return {} as any;
  }
}

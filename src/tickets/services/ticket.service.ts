import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketDocument } from '../../shared/schemas/ticket.schema';
import { ThermalPrinterService } from '../../shared/services/thermal-printer.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AddTicketItemDto,
  UpdateTicketItemDto,
  ProcessPaymentDto,
  TicketQueryDto,
  TicketStatsQueryDto,
} from '../dto/ticket.dto';
import {
  ITicket,
  ITicketItem,
  ITicketStats,
} from '../../shared/interfaces/ticket.interface';
import { ProductService } from '../../products/services/product.service';
import { AuthService } from '../../auth/services/auth.service';
import { BarService } from '../../bars/services/bar.service';
import { EventService } from '../../events/services/event.service';
import { BusinessConfigService } from '../../shared/services/business-config.service';
import { StockService } from '../../stock/services/stock.service';
import { PriceListService } from '../../price-lists/services/price-list.service';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly thermalPrinterService: ThermalPrinterService,
    private readonly productService: ProductService,
    private readonly authService: AuthService,
    private readonly barService: BarService,
    private readonly eventService: EventService,
    private readonly businessConfigService: BusinessConfigService,
    private readonly stockService: StockService,
    private readonly priceListService: PriceListService,
  ) {}

  async create(
    createTicketDto: CreateTicketDto,
    userId: string,
  ): Promise<ITicket> {
    try {
      const user = await this.authService.findUserById(userId);
      if (!user) throw new BadRequestException('User not found.');

      const bar = await this.barService.findOne(createTicketDto.barId);
      const event = await this.eventService.findOne(bar.eventId);
      const listSnapshot = await this.priceListService.getSnapshotForBar(
        bar.id,
      );

      const items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        taxRate: number;
        subtotal: number;
        tax: number;
        total: number;
      }> = [];

      if (createTicketDto.items && createTicketDto.items.length > 0) {
        for (const itemDto of createTicketDto.items) {
          const product = await this.productService.findOne(itemDto.productId);
          if (!product.available || !product.active) {
            throw new BadRequestException(
              `Product '${product.name}' is not available for sale.`,
            );
          }
          const { unitPrice, taxRate } =
            await this.priceListService.resolveForBar(bar.id, product);
          const quantity = itemDto.quantity;
          const subtotal = unitPrice * quantity;
          const tax = subtotal * (taxRate / 100);
          const total = subtotal + tax;
          items.push({
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            taxRate,
            subtotal,
            tax,
            total,
          });
        }
      }

      const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
      const totalTax = items.reduce((sum, i) => sum + i.tax, 0);
      const total = items.reduce((sum, i) => sum + i.total, 0);

      const status =
        createTicketDto.items?.length && createTicketDto.paymentMethod
          ? 'paid'
          : 'open';

      const { items: _dtoItems, ...ticketPayload } = createTicketDto;

      const newTicket = new this.ticketModel({
        ...ticketPayload,
        userId: user.id,
        userName: user.name,
        barId: bar.id,
        barName: bar.name,
        eventId: event.id,
        eventName: event.name,
        priceListId: listSnapshot.priceListId,
        priceListName: listSnapshot.priceListName,
        items,
        subtotal,
        totalTax,
        total,
        status,
        paidAmount: status === 'paid' ? total : 0,
        changeAmount: 0,
        printed: false,
      });

      const savedTicket = await newTicket.save();

      try {
        const printSuccess = await this.thermalPrinterService.printTicket(
          this.mapTicket(savedTicket),
          savedTicket.barId,
        );
        if (printSuccess) {
          savedTicket.printed = true;
          await savedTicket.save();
        }
      } catch (printError) {
        this.logger.error(
          `Error printing ticket ${savedTicket._id}:`,
          printError,
        );
      }

      return this.mapTicket(savedTicket);
    } catch (error) {
      this.logger.error('Error creating ticket:', error.message);
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException('Failed to create ticket.');
    }
  }

  async findAll(query: TicketQueryDto = {}): Promise<ITicket[]> {
    try {
      const filter: any = {};

      if (query.userId) filter.userId = query.userId;
      if (query.barId) filter.barId = query.barId;
      if (query.eventId) filter.eventId = query.eventId;
      if (query.status) filter.status = query.status;
      if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
      if (query.printed !== undefined) filter.printed = query.printed;

      if (query.dateFrom || query.dateTo) {
        filter.createdAt = {};
        if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
        if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
      }

      if (query.search) {
        const searchRegex = { $regex: query.search, $options: 'i' };
        filter.$or = [{ userName: searchRegex }, { barName: searchRegex }];
      }

      const tickets = await this.ticketModel
        .find(filter)
        .sort({ createdAt: -1 });
      return tickets.map((t) => this.mapTicket(t));
    } catch (error) {
      this.logger.error('Error fetching tickets:', error.message);
      return [];
    }
  }

  async findOne(id: string): Promise<ITicket> {
    const ticket = await this.ticketModel.findById(id);
    if (!ticket)
      throw new NotFoundException(`Ticket with ID '${id}' not found.`);
    return this.mapTicket(ticket);
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<ITicket> {
    const ticket = await this.ticketModel.findById(id);
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (
      ticket.status === 'paid' &&
      updateTicketDto.status &&
      updateTicketDto.status !== 'paid'
    ) {
      throw new BadRequestException('Cannot modify status of a paid ticket');
    }

    Object.assign(ticket, updateTicketDto);
    const saved = await ticket.save();
    return this.mapTicket(saved);
  }

  async delete(id: string): Promise<void> {
    const result = await this.ticketModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Ticket not found');
  }

  async addItem(
    ticketId: string,
    addItemDto: AddTicketItemDto,
  ): Promise<ITicketItem> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'open')
      throw new BadRequestException('Cannot add items to a closed ticket');

    const product = await this.productService.findOne(addItemDto.productId);
    if (!product.available || !product.active)
      throw new BadRequestException('Product is not available');
    if (product.stock < addItemDto.quantity)
      throw new BadRequestException('Insufficient stock');

    const { unitPrice, taxRate } = await this.priceListService.resolveForBar(
      ticket.barId,
      product,
    );
    const subtotal = unitPrice * addItemDto.quantity;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: addItemDto.quantity,
      unitPrice,
      taxRate,
      subtotal,
      tax,
      total,
    };

    ticket.items.push(newItem as any);
    this.recalculateTotals(ticket);
    await ticket.save();

    return ticket.items[ticket.items.length - 1] as any;
  }

  async updateItem(
    ticketId: string,
    itemId: string,
    updateItemDto: UpdateTicketItemDto,
  ): Promise<ITicketItem> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'open')
      throw new BadRequestException('Cannot modify items in a closed ticket');

    const item: any = ticket.items.find(
      (i: any) => i._id.toString() === itemId,
    );
    if (!item) throw new NotFoundException('Ticket item not found');

    const product = await this.productService.findOne(item.productId);
    if (product.stock < updateItemDto.quantity)
      throw new BadRequestException('Insufficient stock');

    item.quantity = updateItemDto.quantity;
    item.subtotal = item.unitPrice * item.quantity;
    item.tax = item.subtotal * (item.taxRate / 100);
    item.total = item.subtotal + item.tax;

    this.recalculateTotals(ticket);
    await ticket.save();

    return item;
  }

  async removeItem(ticketId: string, itemId: string): Promise<void> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'open')
      throw new BadRequestException('Cannot remove items from a closed ticket');

    ticket.items = ticket.items.filter(
      (i: any) => i._id.toString() !== itemId,
    ) as any;
    this.recalculateTotals(ticket);
    await ticket.save();
  }

  async processPayment(
    ticketId: string,
    paymentDto: ProcessPaymentDto,
  ): Promise<ITicket> {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'open')
      throw new BadRequestException(
        'Cannot process payment for a closed ticket',
      );
    if (ticket.items.length === 0)
      throw new BadRequestException(
        'Cannot process payment for an empty ticket',
      );

    if (paymentDto.paidAmount < ticket.total) {
      throw new BadRequestException(
        `Insufficient payment amount. Required: ${ticket.total}`,
      );
    }

    const changeAmount =
      paymentDto.paymentMethod === 'cash'
        ? Math.max(0, paymentDto.paidAmount - ticket.total)
        : 0;

    ticket.status = 'paid';
    ticket.paymentMethod = paymentDto.paymentMethod;
    ticket.paidAmount = paymentDto.paidAmount;
    ticket.changeAmount = changeAmount;

    for (const item of ticket.items) {
      await this.productService.updateStock(item.productId, {
        quantity: item.quantity,
        type: 'subtract',
        reason: `Ticket ${ticketId} - Sale`,
      });
    }

    try {
      await this.stockService.processSaleStock(
        ticketId,
        ticket.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        ticket.barId,
      );
    } catch (stockError) {
      this.logger.warn(
        `Error processing stock for ticket ${ticketId}:`,
        stockError.message,
      );
    }

    await ticket.save();
    return this.mapTicket(ticket);
  }

  async getStats(query: TicketStatsQueryDto = {}): Promise<ITicketStats> {
    const filter: any = { status: 'paid' };
    if (query.barId) filter.barId = query.barId;
    if (query.eventId) filter.eventId = query.eventId;

    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
      if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
    }

    const tickets = await this.ticketModel.find(filter);

    const totalRevenue = tickets.reduce((sum, t) => sum + t.total, 0);
    const productSales = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantity: number;
        revenue: number;
      }
    >();

    tickets.forEach((ticket) => {
      ticket.items.forEach((item) => {
        const existing = productSales.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        productSales.set(item.productId, existing);
      });
    });

    const mostSoldProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, query.topProducts || 10);

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
      total: tickets.length,
      open: 0,
      paid: tickets.length,
      cancelled: 0,
      refunded: 0,
      totalRevenue,
      averageTicketValue:
        tickets.length > 0 ? totalRevenue / tickets.length : 0,
      mostSoldProducts,
      salesByPriceList,
    };
  }

  async getPrintFormat(id: string): Promise<any> {
    const ticket = await this.findOne(id);
    const config = await this.businessConfigService.getActiveConfig();
    return this.thermalPrinterService.generatePrintFormat(
      ticket,
      config as any,
    );
  }

  async markAsPrinted(id: string): Promise<void> {
    await this.ticketModel.findByIdAndUpdate(id, { $set: { printed: true } });
  }

  private recalculateTotals(ticket: TicketDocument) {
    ticket.subtotal = ticket.items.reduce((sum, i) => sum + i.subtotal, 0);
    ticket.totalTax = ticket.items.reduce((sum, i) => sum + i.tax, 0);
    ticket.total = ticket.items.reduce((sum, i) => sum + i.total, 0);
  }

  private mapTicket(ticket: TicketDocument): ITicket {
    return {
      id: ticket._id,
      userId: ticket.userId,
      userName: ticket.userName,
      barId: ticket.barId,
      barName: ticket.barName,
      eventId: ticket.eventId,
      eventName: ticket.eventName,
      priceListId: ticket.priceListId,
      priceListName: ticket.priceListName,
      status: ticket.status,
      paymentMethod: ticket.paymentMethod,
      subtotal: ticket.subtotal,
      totalTax: ticket.totalTax,
      total: ticket.total,
      paidAmount: ticket.paidAmount,
      changeAmount: ticket.changeAmount,
      items: ticket.items.map((i: any) => ({
        id: i._id,
        ticketId: ticket._id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
        subtotal: i.subtotal,
        tax: i.tax,
        total: i.total,
        createdAt: i['createdAt']?.toISOString() || new Date().toISOString(),
        updatedAt: i['updatedAt']?.toISOString() || new Date().toISOString(),
      })),
      notes: ticket.notes,
      printed: ticket.printed,
      createdAt: ticket['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: ticket['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }
}

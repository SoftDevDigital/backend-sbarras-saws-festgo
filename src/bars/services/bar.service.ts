import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bar, BarDocument } from '../../shared/schemas/bar.schema';
import { Ticket, TicketDocument } from '../../shared/schemas/ticket.schema';
import { Event, EventDocument } from '../../shared/schemas/event.schema';
import { CreateBarDto, UpdateBarDto, BarQueryDto } from '../dto/bar.dto';
import { IBar } from '../../shared/interfaces/bar.interface';
import { PriceListService } from '../../price-lists/services/price-list.service';

@Injectable()
export class BarService {
  constructor(
    @InjectModel(Bar.name) private readonly barModel: Model<BarDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    private readonly priceListService: PriceListService,
  ) {}

  async create(createBarDto: CreateBarDto): Promise<IBar> {
    // Validar entrada
    if (!createBarDto.name || !createBarDto.eventId || !createBarDto.printer) {
      throw new BadRequestException('Name, event ID, and printer are required');
    }

    // Verificar que el evento existe
    await this.validateEventExists(createBarDto.eventId);

    if (createBarDto.priceListId) {
      await this.priceListService.findOne(createBarDto.priceListId);
    }

    // Verificar si ya existe un bar con el mismo nombre en el mismo evento
    const existingBar = await this.barModel.findOne({
      name: createBarDto.name,
      eventId: createBarDto.eventId,
    });

    if (existingBar) {
      throw new ConflictException(
        `Bar '${createBarDto.name}' already exists in this event.`,
      );
    }

    // Crear nuevo bar
    const newBar = new this.barModel({
      ...createBarDto,
      status: 'active',
    });

    const savedBar = await newBar.save();

    return this.mapBar(savedBar);
  }

  async findAll(query: BarQueryDto = {}): Promise<IBar[]> {
    try {
      const filter: any = {};

      if (query.eventId) {
        filter.eventId = query.eventId;
      }

      if (query.status) {
        filter.status = query.status;
      }

      if (query.search) {
        filter.name = { $regex: query.search, $options: 'i' };
      }

      const bars = await this.barModel.find(filter).sort({ createdAt: -1 });
      return bars.map((bar) => this.mapBar(bar));
    } catch (error) {
      console.error('Error in findAll:', error.message);
      return [];
    }
  }

  async findOne(id: string): Promise<IBar> {
    const bar = await this.barModel.findById(id);

    if (!bar) {
      throw new NotFoundException(`Bar with ID '${id}' not found.`);
    }

    const mapped = this.mapBar(bar);
    if (mapped.priceListId) {
      try {
        const pl = await this.priceListService.findOne(mapped.priceListId);
        mapped.priceListName = pl.name;
      } catch {
        /* lista borrada o inconsistente: dejamos solo el id */
      }
    }
    return mapped;
  }

  async update(id: string, updateBarDto: UpdateBarDto): Promise<IBar> {
    const existingBar = await this.findOne(id);

    // Si se está actualizando el nombre, verificar duplicados
    if (updateBarDto.name && updateBarDto.name !== existingBar.name) {
      const duplicateBar = await this.barModel.findOne({
        name: updateBarDto.name,
        eventId: existingBar.eventId,
      });

      if (duplicateBar && duplicateBar._id !== id) {
        throw new ConflictException(
          `A bar with name '${updateBarDto.name}' already exists in this event.`,
        );
      }
    }

    if (updateBarDto.priceListId) {
      await this.priceListService.findOne(updateBarDto.priceListId);
    }

    const updatedBar = await this.barModel.findByIdAndUpdate(
      id,
      { ...updateBarDto },
      { new: true },
    );

    if (!updatedBar) {
      throw new NotFoundException(`Bar with ID '${id}' not found.`);
    }

    return this.mapBar(updatedBar);
  }

  async remove(id: string): Promise<{ message: string; deletedBar: IBar }> {
    const bar = await this.findOne(id);

    await this.barModel.findByIdAndDelete(id);

    return {
      message: `Bar '${bar.name}' has been successfully deleted`,
      deletedBar: bar,
    };
  }

  async findByEvent(eventId: string): Promise<IBar[]> {
    const bars = await this.barModel.find({ eventId }).sort({ name: 1 });
    return bars.map((bar) => this.mapBar(bar));
  }

  async findByStatus(status: 'active' | 'closed'): Promise<IBar[]> {
    const bars = await this.barModel.find({ status }).sort({ createdAt: -1 });
    return bars.map((bar) => this.mapBar(bar));
  }

  async changeStatus(id: string, status: 'active' | 'closed'): Promise<IBar> {
    return this.update(id, { status });
  }

  private async validateEventExists(eventId: string): Promise<void> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new BadRequestException(
        `Event with ID '${eventId}' does not exist.`,
      );
    }
  }

  async getBarSalesSummary(barId: string): Promise<any> {
    try {
      const bar = await this.findOne(barId);

      // Obtener todos los tickets de esta barra
      const tickets = await this.ticketModel.find({ barId });

      // Calcular totales
      const totalTickets = tickets.length;
      const totalRevenue = tickets.reduce((sum, t) => sum + (t.total || 0), 0);
      const totalSales = tickets.filter((t) => t.status === 'paid').length;
      const averageTicketValue =
        totalTickets > 0 ? totalRevenue / totalTickets : 0;

      // Productos más vendidos
      const productsMap = new Map<
        string,
        { name: string; quantity: number; revenue: number }
      >();

      for (const ticket of tickets) {
        for (const item of ticket.items) {
          const existing = productsMap.get(item.productId) || {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
          existing.quantity += item.quantity;
          existing.revenue += item.total;
          productsMap.set(item.productId, existing);
        }
      }

      const productsSold = Array.from(productsMap.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          quantitySold: data.quantity,
          revenue: data.revenue,
          percentage:
            totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Productos vendidos por método de pago
      const calculateByPayment = (method: string) => {
        const filtered = tickets.filter((t) => t.paymentMethod === method);
        const methodRevenue = filtered.reduce(
          (sum, t) => sum + (t.total || 0),
          0,
        );
        const map = new Map<
          string,
          { name: string; quantity: number; revenue: number }
        >();

        for (const t of filtered) {
          for (const i of t.items) {
            const ex = map.get(i.productId) || {
              name: i.productName,
              quantity: 0,
              revenue: 0,
            };
            ex.quantity += i.quantity;
            ex.revenue += i.total;
            map.set(i.productId, ex);
          }
        }

        return Array.from(map.entries())
          .map(([id, data]) => ({
            productId: id,
            productName: data.name,
            quantitySold: data.quantity,
            revenue: data.revenue,
            percentage:
              methodRevenue > 0 ? (data.revenue / methodRevenue) * 100 : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue);
      };

      const productsSoldByPaymentMethod = {
        cash: calculateByPayment('cash'),
        card: calculateByPayment('card'),
        transfer: calculateByPayment('transfer'),
        administrator: calculateByPayment('administrator'),
        dj: calculateByPayment('dj'),
      };

      // Ventas por usuario
      const usersMap = new Map<
        string,
        { name: string; count: number; total: number }
      >();
      for (const t of tickets) {
        const ex = usersMap.get(t.userId) || {
          name: t.userName,
          count: 0,
          total: 0,
        };
        ex.count += 1;
        ex.total += t.total || 0;
        usersMap.set(t.userId, ex);
      }

      const salesByUser = Array.from(usersMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.name,
          ticketCount: data.count,
          totalSales: data.total,
        }))
        .sort((a, b) => b.totalSales - a.totalSales);

      // Ventas por método de pago
      const salesByPaymentMethod = {
        cash: tickets
          .filter((t) => t.paymentMethod === 'cash')
          .reduce((sum, t) => sum + t.total, 0),
        card: tickets
          .filter((t) => t.paymentMethod === 'card')
          .reduce((sum, t) => sum + t.total, 0),
        transfer: tickets
          .filter((t) => t.paymentMethod === 'transfer')
          .reduce((sum, t) => sum + t.total, 0),
        administrator: tickets
          .filter((t) => t.paymentMethod === 'administrator')
          .reduce((sum, t) => sum + t.total, 0),
        dj: tickets
          .filter((t) => t.paymentMethod === 'dj')
          .reduce((sum, t) => sum + t.total, 0),
      };

      // Distribución por hora
      const hoursMap = new Map<string, { count: number; revenue: number }>();
      for (const t of tickets) {
        const hour =
          new Date(t['createdAt']).getHours().toString().padStart(2, '0') +
          ':00';
        const ex = hoursMap.get(hour) || { count: 0, revenue: 0 };
        ex.count += 1;
        ex.revenue += t.total || 0;
        hoursMap.set(hour, ex);
      }

      const hourlyDistribution = Array.from(hoursMap.entries())
        .map(([hour, data]) => ({
          hour,
          ticketCount: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      let priceListId: string | undefined;
      let priceListName: string | undefined;
      if (bar.priceListId) {
        priceListId = bar.priceListId;
        try {
          const pl = await this.priceListService.findOne(bar.priceListId);
          priceListName = pl.name;
        } catch {
          /* ignore */
        }
      }

      const eventDoc = await this.eventModel.findById(bar.eventId);
      const eventSummary = eventDoc
        ? { id: eventDoc._id, name: eventDoc.name, status: eventDoc.status }
        : { id: bar.eventId, name: '(evento no encontrado)', status: null as string | null };

      // Ventas agrupadas por snapshot de lista de precios en cada ticket (si cambió la lista de la barra en el tiempo).
      const listKey = (t: TicketDocument) =>
        `${t.priceListId || '_sin_lista'}|${t.priceListName || ''}`;
      const byListSnap = new Map<
        string,
        {
          priceListId: string | null;
          priceListName: string | null;
          ticketCount: number;
          revenue: number;
        }
      >();
      for (const t of tickets) {
        const k = listKey(t);
        const ex = byListSnap.get(k) || {
          priceListId: t.priceListId || null,
          priceListName: t.priceListName || null,
          ticketCount: 0,
          revenue: 0,
        };
        ex.ticketCount += 1;
        ex.revenue += t.total || 0;
        byListSnap.set(k, ex);
      }
      const salesByPriceListSnapshot = Array.from(byListSnap.values()).sort(
        (a, b) => b.revenue - a.revenue,
      );

      return {
        bar,
        event: eventSummary,
        /** Lista de precios actualmente asignada a la barra (configuración vigente). */
        assignedPriceList: {
          priceListId: bar.priceListId ?? null,
          priceListName: priceListName ?? null,
        },
        /** @deprecated usar assignedPriceList */
        priceListId,
        /** @deprecated usar assignedPriceList */
        priceListName,
        /** Desglose por lista de precios guardada en cada ticket (histórico). */
        salesByPriceListSnapshot,
        reportLegend: {
          assignedPriceList:
            'Lista de precios vinculada a la barra hoy (PATCH /bars/:id).',
          salesByPriceListSnapshot:
            'Cada ticket guarda el nombre/id de lista al momento de la venta; si cambiaste la lista de la barra, verás más de un grupo aquí.',
          productsSold:
            'Importes y cantidades según lo cobrado en cada ticket (precios de la lista vigente al vender).',
        },
        totalSales,
        totalTickets,
        totalRevenue,
        averageTicketValue,
        productsSold,
        productsSoldByPaymentMethod,
        salesByUser,
        salesByPaymentMethod,
        hourlyDistribution,
      };
    } catch (error) {
      console.error('Error getting bar sales summary:', error);
      throw new BadRequestException('Failed to retrieve bar sales summary.');
    }
  }

  private mapBar(bar: BarDocument): IBar {
    return {
      id: bar._id,
      name: bar.name,
      eventId: bar.eventId,
      printer: bar.printer,
      priceListId: bar.priceListId,
      status: bar.status,
      createdAt: bar['createdAt'],
      updatedAt: bar['updatedAt'],
    };
  }
}

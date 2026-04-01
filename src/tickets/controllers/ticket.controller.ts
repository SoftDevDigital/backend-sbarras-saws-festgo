import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TicketService } from '../services/ticket.service';
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
  ITicketPrintFormat,
} from '../../shared/interfaces/ticket.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('tickets')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('tickets')
@UseGuards(JwtAuthGuard, RoleGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // ===== RUTAS SIMPLIFICADAS AL MÁXIMO =====

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Crear ticket',
    description:
      'Nuevo ticket asociado al usuario del JWT (`userId` desde token). Precios y snapshot de lista (`priceListId` / `priceListName`) según barra/evento del DTO.',
  })
  @ApiResponse({ status: 201, description: 'Ticket creado.' })
  @ApiResponse({ status: 400, description: 'Validación o datos incompletos.' })
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @Request() req: any,
  ): Promise<ITicket> {
    return this.ticketService.create(createTicketDto, req.user.sub);
  }

  @Get('search')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Buscar tickets (filtros en query)',
    description:
      '**Bartender:** el backend fuerza `userId` al `sub` del JWT (solo ve sus tickets). **Admin:** puede filtrar por usuario y resto de campos de `TicketQueryDto`.',
  })
  @ApiResponse({ status: 200, description: 'Lista de tickets que cumplen filtros.' })
  async searchTickets(
    @Query() query: TicketQueryDto,
    @Request() req: any,
  ): Promise<ITicket[]> {
    // Si es bartender, solo puede ver sus propios tickets
    if (req.user.role === 'bartender') {
      query.userId = req.user.sub;
    }
    return this.ticketService.findAll(query);
  }

  @Get('stats')
  @Roles('admin')
  @ApiOperation({
    summary: 'Estadísticas de tickets',
    description:
      'Agregados y métricas según `TicketStatsQueryDto` (evento, fechas, etc.). Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Objeto de estadísticas.' })
  @ApiResponse({ status: 403, description: 'Solo rol `admin`.' })
  async getStats(@Query() query: TicketStatsQueryDto): Promise<ITicketStats> {
    return this.ticketService.getStats(query);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Obtener ticket por ID',
    description:
      '**Bartender:** solo si el ticket pertenece a su `userId`; si no → `400` con mensaje de acceso denegado.',
  })
  @ApiResponse({ status: 200, description: 'Ticket completo con ítems.' })
  @ApiResponse({ status: 400, description: 'Bartender intentando ver ticket ajeno.' })
  @ApiResponse({ status: 404, description: 'Ticket no existe.' })
  async findOne(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ITicket> {
    const ticket = await this.ticketService.findOne(id);

    // Si es bartender, solo puede ver sus propios tickets
    if (req.user.role === 'bartender' && ticket.userId !== req.user.sub) {
      throw new BadRequestException(
        'Access denied. You can only view your own tickets.',
      );
    }

    return ticket;
  }

  @Patch(':id')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Actualizar ticket (multifunción por body)',
    description:
      '**Comportamiento según body:** si vienen `paymentMethod` y `paidAmount` → **cobro**. Si vienen `productId` y `quantity` → **añadir línea**. En otro caso → **actualización** de campos del ticket. Mismas reglas de propiedad que en GET para bartender.',
  })
  @ApiResponse({ status: 200, description: 'Ticket actualizado o ítem añadido según caso.' })
  @ApiResponse({ status: 400, description: 'Validación o ticket ajeno (bartender).' })
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any,
  ): Promise<ITicket | ITicketItem> {
    // Verificar permisos específicos por operación
    const ticket = await this.ticketService.findOne(id);

    // Si es bartender, solo puede modificar sus propios tickets
    if (req.user.role === 'bartender' && ticket.userId !== req.user.sub) {
      throw new BadRequestException(
        'Access denied. You can only modify your own tickets.',
      );
    }

    // Determinar tipo de operación por el contenido del body
    if (updateData.paymentMethod && updateData.paidAmount) {
      // Procesar pago - Todos los roles pueden procesar pagos
      return this.ticketService.processPayment(id, updateData);
    } else if (updateData.productId && updateData.quantity) {
      // Agregar item - Todos los roles
      return this.ticketService.addItem(id, updateData);
    } else {
      // Actualizar ticket - Todos los roles autorizados
      return this.ticketService.update(id, updateData);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Eliminar ticket o línea',
    description:
      'Sin query `itemId` → borra el ticket completo. Con `?itemId=` → borra solo esa línea. **Bartender:** solo sobre sus propios tickets.',
  })
  @ApiResponse({ status: 204, description: 'Eliminado correctamente.' })
  async delete(
    @Param('id') id: string,
    @Query('itemId') itemId?: string,
    @Request() req?: any,
  ): Promise<void> {
    // Verificar permisos - Solo quien creó el ticket puede eliminarlo
    if (req && req.user.role === 'bartender') {
      const ticket = await this.ticketService.findOne(id);
      if (ticket.userId !== req.user.sub) {
        throw new BadRequestException(
          'Access denied. You can only delete your own tickets.',
        );
      }
    }

    if (itemId) {
      // Eliminar item específico
      return this.ticketService.removeItem(id, itemId);
    } else {
      // Eliminar ticket completo
      return this.ticketService.delete(id);
    }
  }

  // ===== TICKET PRINTING =====

  @Get(':id/print')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Formato de impresión del ticket',
    description:
      'Estructura lista para impresora térmica / UI. Bartender solo sus tickets.',
  })
  @ApiResponse({ status: 200, description: 'Payload de impresión.' })
  async getPrintFormat(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ITicketPrintFormat> {
    // Si es bartender, solo puede imprimir sus propios tickets
    if (req.user.role === 'bartender') {
      const ticket = await this.ticketService.findOne(id);
      if (ticket.userId !== req.user.sub) {
        throw new BadRequestException(
          'Access denied. You can only print your own tickets.',
        );
      }
    }

    return this.ticketService.getPrintFormat(id);
  }

  @Patch(':id/print')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Marcar ticket como impreso',
    description: 'Actualiza estado de impresión en el ticket. Bartender solo los propios.',
  })
  @ApiResponse({ status: 200, description: 'Operación completada (sin body según servicio).' })
  async markAsPrinted(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<void> {
    // Si es bartender, solo puede marcar como impreso sus propios tickets
    if (req.user.role === 'bartender') {
      const ticket = await this.ticketService.findOne(id);
      if (ticket.userId !== req.user.sub) {
        throw new BadRequestException(
          'Access denied. You can only mark your own tickets as printed.',
        );
      }
    }

    return this.ticketService.markAsPrinted(id);
  }
}

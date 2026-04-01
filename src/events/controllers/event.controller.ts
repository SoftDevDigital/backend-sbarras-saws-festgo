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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { EventService } from '../services/event.service';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
} from '../dto/event.dto';
import { IEvent } from '../../shared/interfaces/event.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('events')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('events')
@UseGuards(JwtAuthGuard, RoleGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Crear evento',
    description: 'Alta de evento (nombre, fechas, estado inicial, etc.). Solo **admin**.',
  })
  @ApiResponse({ status: 201, description: 'Evento creado.' })
  @ApiResponse({ status: 403, description: 'Solo rol `admin`.' })
  async create(@Body() createEventDto: CreateEventDto): Promise<IEvent> {
    return this.eventService.create(createEventDto);
  }

  @Get()
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Listar eventos',
    description: 'Lista filtrada según `EventQueryDto` (búsqueda, estado, paginación).',
  })
  @ApiResponse({ status: 200, description: 'Array de eventos.' })
  async findAll(@Query() query: EventQueryDto): Promise<IEvent[]> {
    return this.eventService.findAll(query);
  }

  @Get('active')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Eventos activos',
    description: 'Subconjunto de eventos en estado activo (útil para selector en POS).',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos activos.' })
  async getActiveEvents(): Promise<IEvent[]> {
    return this.eventService.getActiveEvents();
  }

  @Get('closed')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Eventos cerrados',
    description: 'Historial / eventos ya cerrados.',
  })
  @ApiResponse({ status: 200, description: 'Lista de eventos cerrados.' })
  async getClosedEvents(): Promise<IEvent[]> {
    return this.eventService.getClosedEvents();
  }

  @Get('status/:status')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Eventos por estado',
    description: 'Filtra por `active` o `closed` en la ruta.',
  })
  @ApiResponse({ status: 200, description: 'Lista filtrada.' })
  async findByStatus(
    @Param('status') status: 'active' | 'closed',
  ): Promise<IEvent[]> {
    return this.eventService.findByStatus(status);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  @ApiOperation({ summary: 'Obtener evento por ID', description: 'UUID del evento.' })
  @ApiResponse({ status: 200, description: 'Evento encontrado.' })
  @ApiResponse({ status: 404, description: 'No existe.' })
  async findOne(@Param('id') id: string): Promise<IEvent> {
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Actualizar evento',
    description: 'Campos parciales. Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Evento actualizado.' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<IEvent> {
    return this.eventService.update(id, updateEventDto);
  }

  @Patch(':id/status/:status')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({
    summary: 'Cambiar estado del evento',
    description: 'Atajo para poner el evento en `active` o `closed`. Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Evento con nuevo estado.' })
  async changeStatus(
    @Param('id') id: string,
    @Param('status') status: 'active' | 'closed',
  ): Promise<IEvent> {
    return this.eventService.changeStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({
    summary: 'Eliminar evento',
    description: 'Solo **admin**. Respuesta incluye mensaje y copia del evento eliminado.',
  })
  @ApiResponse({ status: 200, description: 'Eliminación procesada.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; deletedEvent: IEvent }> {
    return this.eventService.remove(id);
  }
}

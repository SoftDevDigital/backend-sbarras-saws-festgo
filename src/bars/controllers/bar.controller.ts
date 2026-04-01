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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BarService } from '../services/bar.service';
import { CreateBarDto, UpdateBarDto, BarQueryDto } from '../dto/bar.dto';
import { IBar } from '../../shared/interfaces/bar.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('bars')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('bars')
@UseGuards(JwtAuthGuard, RoleGuard)
export class BarController {
  constructor(private readonly barService: BarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Crear barra',
    description:
      'Solo **admin**. Asocia la barra a un `eventId`.\n\n**Listas de precios — opción 1:** envía `priceListId` con el UUID de una lista **ya creada** (`GET /price-lists`). Así la barra queda ligada a esa lista para ventas e informes.\n\n**Opción 2** (crear lista y ligar barra desde el lado de la lista): usa `POST /price-lists` con `barId` en el body en lugar de pasar `priceListId` aquí.',
  })
  async create(@Body() createBarDto: CreateBarDto): Promise<IBar> {
    return this.barService.create(createBarDto);
  }

  @Get()
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Listar barras',
    description: '**Admin** y **bartender**. Filtros: `eventId`, `status`, `search`.',
  })
  async findAll(@Query() query: BarQueryDto): Promise<IBar[]> {
    return this.barService.findAll(query);
  }

  @Get('event/:eventId')
  @Roles('admin', 'bartender')
  @ApiOperation({ summary: 'Barras de un evento', description: 'Ordenadas por nombre.' })
  async findByEvent(@Param('eventId') eventId: string): Promise<IBar[]> {
    return this.barService.findByEvent(eventId);
  }

  @Get('status/:status')
  @Roles('admin', 'bartender')
  @ApiOperation({ summary: 'Barras por estado', description: '`active` o `closed`.' })
  async findByStatus(
    @Param('status') status: 'active' | 'closed',
  ): Promise<IBar[]> {
    return this.barService.findByStatus(status);
  }

  @Get(':id/sales-summary')
  @Roles('admin')
  @ApiOperation({
    summary: 'Reporte de ventas de la barra',
    description:
      'Solo **admin**. Incluye `event`, `assignedPriceList` (lista actual de la barra), `salesByPriceListSnapshot` (histórico por snapshot en tickets), productos vendidos, métodos de pago, horarios, etc.',
  })
  async getBarSalesSummary(@Param('id') id: string): Promise<{
    bar: IBar;
    priceListId?: string;
    priceListName?: string;
    totalSales: number;
    totalTickets: number;
    totalRevenue: number;
    averageTicketValue: number;
    productsSold: Array<{
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
      percentage: number;
    }>;
    productsSoldByPaymentMethod: {
      cash: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      card: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      transfer: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      administrator: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      dj: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
    };
    salesByUser: Array<{
      userId: string;
      userName: string;
      ticketCount: number;
      totalSales: number;
    }>;
    salesByPaymentMethod: {
      cash: number;
      card: number;
      transfer: number;
      administrator: number;
      dj: number;
    };
    hourlyDistribution: Array<{
      hour: string;
      ticketCount: number;
      revenue: number;
    }>;
  }> {
    return this.barService.getBarSalesSummary(id);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Obtener barra por ID',
    description: 'Incluye `priceListId` y, si aplica, `priceListName` resuelto.',
  })
  async findOne(@Param('id') id: string): Promise<IBar> {
    return this.barService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Actualizar barra',
    description:
      'Solo **admin**. Puedes cambiar `priceListId` (**opción 1**: enlazar lista ya creada), `printer`, `name`, `status`. Para **opción 2** también puedes usar `PATCH /price-lists/:id` con `barId`.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBarDto: UpdateBarDto,
  ): Promise<IBar> {
    return this.barService.update(id, updateBarDto);
  }

  @Patch(':id/status/:status')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({ summary: 'Cambiar estado de la barra', description: '`active` | `closed`.' })
  async changeStatus(
    @Param('id') id: string,
    @Param('status') status: 'active' | 'closed',
  ): Promise<IBar> {
    return this.barService.changeStatus(id, status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar barra', description: 'Solo **admin**.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; deletedBar: IBar }> {
    return this.barService.remove(id);
  }
}

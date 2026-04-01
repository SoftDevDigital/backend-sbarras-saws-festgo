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
import { StockService } from '../services/stock.service';
import {
  CreateStockMovementDto,
  CreateBarStockDto,
  CreateStockTransferDto,
  StockMovementQueryDto,
  BarStockQueryDto,
  StockTransferQueryDto,
  StockReportQueryDto,
  BulkStockOperationDto,
  StockValidationDto,
  StockStatsQueryDto,
  AcknowledgeAlertDto,
  UpdateStockTransferDto,
} from '../dto/stock.dto';
import {
  IStockMovement,
  IBarStock,
  IStockAlert,
  IStockTransfer,
  IStockReport,
  IStockStats,
  IStockValidation,
} from '../../shared/interfaces/stock.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('stock')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('stock')
@UseGuards(JwtAuthGuard, RoleGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ===== RUTAS SIMPLIFICADAS AL MÁXIMO (6 endpoints principales) =====

  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Asignar stock inicial a una barra',
    description: 'Crea vínculo producto–barra según `CreateBarStockDto`. Solo **admin**.',
  })
  @ApiResponse({ status: 201, description: 'Registro de stock en barra creado.' })
  async assignStockToBar(
    @Body() assignData: CreateBarStockDto,
    @Request() req: any,
  ): Promise<IBarStock> {
    return this.stockService.assignStockToBar(assignData, req.user.sub);
  }

  @Post('move')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Registrar movimiento de stock',
    description:
      'Entrada, salida o ajuste según `CreateStockMovementDto`. Admin y bartender según reglas del servicio.',
  })
  @ApiResponse({ status: 201, description: 'Movimiento registrado.' })
  async createStockMovement(
    @Body() movementData: CreateStockMovementDto,
    @Request() req: any,
  ): Promise<IStockMovement> {
    return this.stockService.createMovement(movementData, req.user.sub);
  }

  @Get('search')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Búsqueda unificada de stock',
    description:
      'Un solo endpoint con ramas según query: **`transferId`** → transferencias; **`alertId`** → alertas; **`type=movements`** (o `barId` / `eventId` / `productId`) → movimientos; **`type=alerts`** → alertas; **`type=transfers`** → transferencias; por defecto → stock por barra (`BarStockQueryDto`).',
  })
  @ApiResponse({
    status: 200,
    description: 'Array de movimientos, stock por barra, alertas o transferencias.',
  })
  async searchStock(
    @Query('type') type?: string,
    @Query('barId') barId?: string,
    @Query('eventId') eventId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('outOfStock') outOfStock?: boolean,
    @Query('transferId') transferId?: string,
    @Query('alertId') alertId?: string,
    @Request() req?: any,
  ): Promise<
    IBarStock[] | IStockMovement[] | IStockAlert[] | IStockTransfer[]
  > {
    // Búsqueda unificada que maneja TODOS los tipos de consulta

    // Si se especifica transferId, buscar transferencias
    if (transferId) {
      return this.stockService.findTransfers({});
    }

    // Si se especifica alertId, buscar alertas
    if (alertId) {
      return this.stockService.findAlerts({});
    }

    // Si se especifica type=movements, buscar movimientos
    if (type === 'movements' || barId || eventId || productId) {
      const query: StockMovementQueryDto = {
        barId,
        eventId,
        productId,
        type: type as any,
      };
      return this.stockService.findMovements(query);
    }

    // Si se especifica type=alerts, buscar alertas
    if (type === 'alerts') {
      return this.stockService.findAlerts({});
    }

    // Si se especifica type=transfers, buscar transferencias
    if (type === 'transfers') {
      return this.stockService.findTransfers({});
    }

    // Por defecto, buscar stock por barra
    const query: BarStockQueryDto = {
      barId,
      eventId,
      productId,
      status: status as any,
      lowStock,
      outOfStock,
    };
    return this.stockService.findBarStock(query);
  }

  @Get('info')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Información agregada (validación, stats, reportes, etc.)',
    description:
      'Obligatorio query **`type`**: `validate` (requiere productId, barId, quantity, operation), `stats`, `report`, `availability`, `summary` (requiere eventId), `config`. Otros parámetros según rama; ver errores `400` con mensaje descriptivo.',
  })
  @ApiResponse({ status: 200, description: 'Objeto según `type`.' })
  @ApiResponse({ status: 400, description: 'Faltan parámetros para la rama elegida.' })
  async getStockInfo(
    @Query('type') type: string,
    @Query('id') id?: string,
    @Query('productId') productId?: string,
    @Query('barId') barId?: string,
    @Query('eventId') eventId?: string,
    @Query('quantity') quantity?: number,
    @Query('operation') operation?: string,
    @Request() req?: any,
  ): Promise<IStockValidation | IStockStats | IStockReport | any> {
    // Endpoint unificado para obtener información específica

    switch (type) {
      case 'validate':
        if (!productId || !barId || !quantity || !operation) {
          throw new BadRequestException(
            'productId, barId, quantity, and operation are required for validation',
          );
        }
        const validationData: StockValidationDto = {
          productId,
          barId,
          quantity: Number(quantity),
          operation: operation as 'sale' | 'transfer' | 'adjustment',
        };
        return this.stockService.validateStock(validationData);

      case 'stats':
        const statsQuery: StockStatsQueryDto = {
          eventId,
          barId,
          dateFrom: undefined,
          dateTo: undefined,
          includeAlerts: true,
          includeTransfers: true,
        };
        return this.stockService.getStockStats(statsQuery);

      case 'report':
        const reportQuery: StockReportQueryDto = {
          eventId,
          barId,
          productId,
          dateFrom: undefined,
          dateTo: undefined,
          type: 'summary',
          includeClosed: false,
          includeAlerts: true,
          includeMovements: true,
        };
        return this.stockService.generateStockReport(reportQuery);

      case 'availability':
        if (!productId) {
          throw new BadRequestException(
            'productId is required for availability check',
          );
        }
        return this.stockService.getProductAvailability(productId, eventId);

      case 'summary':
        if (!eventId) {
          throw new BadRequestException(
            'eventId is required for event summary',
          );
        }
        return this.stockService.getEventStockSummary(eventId);

      case 'config':
        return this.stockService.getStockConfig();

      default:
        throw new BadRequestException(
          'Invalid info type. Valid types: validate, stats, report, availability, summary, config',
        );
    }
  }

  @Patch(':id')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Actualización unificada por ID',
    description:
      'Ramas según **`type`** query y body: `transfer` → estado de transferencia; `alert` → reconocer alerta; `config` → configuración; si el body parece stock de barra → `updateBarStock`; si parece movimiento → `updateMovement`. Revisar validación en servicio.',
  })
  @ApiResponse({ status: 200, description: 'Recurso actualizado.' })
  @ApiResponse({ status: 400, description: 'Combinación query/body inválida.' })
  async updateStock(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req: any,
    @Query('type') type?: string,
  ): Promise<IBarStock | IStockMovement | IStockTransfer | void> {
    // Endpoint unificado para actualizaciones

    if (type === 'transfer') {
      // Actualizar estado de transferencia
      const updateTransferDto: UpdateStockTransferDto = {
        status: updateData.status,
        reason: updateData.reason,
      };
      return this.stockService.updateTransferStatus(
        id,
        updateTransferDto,
        req.user.sub,
      );
    } else if (type === 'alert') {
      // Reconocer alerta
      const acknowledgeDto: AcknowledgeAlertDto = {
        alertId: id,
        note: updateData.note,
      };
      return this.stockService.acknowledgeAlert(
        id,
        acknowledgeDto,
        req.user.sub,
      );
    } else if (type === 'config') {
      // Actualizar configuración
      return this.stockService.updateStockConfig(updateData);
    } else if (
      updateData.currentStock !== undefined ||
      updateData.finalStock !== undefined ||
      updateData.status
    ) {
      // Actualizar stock de barra
      return this.stockService.updateBarStock(id, updateData);
    } else if (updateData.quantity !== undefined || updateData.reason) {
      // Actualizar movimiento de stock
      return this.stockService.updateMovement(id, updateData);
    } else {
      throw new BadRequestException('Invalid update data provided');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({
    summary: 'Eliminar recurso de stock',
    description:
      'Query **`type`**: `movement` → borra movimiento; `transfer` → borra transferencia; sin type o otro → stock de barra. Solo **admin**.',
  })
  @ApiResponse({ status: 204, description: 'Eliminado.' })
  async deleteStock(
    @Param('id') id: string,
    @Query('type') type?: string,
  ): Promise<void> {
    // Endpoint unificado para eliminaciones

    if (type === 'movement') {
      return this.stockService.deleteMovement(id);
    } else if (type === 'transfer') {
      return this.stockService.deleteTransfer(id);
    } else {
      return this.stockService.deleteBarStock(id);
    }
  }

  // ===== ENDPOINT ESPECIAL PARA OPERACIONES MASIVAS =====

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Operación masiva sobre stock',
    description: '`BulkStockOperationDto`: importaciones o ajustes en lote. Solo **admin**.',
  })
  @ApiResponse({ status: 201, description: 'Resultado del lote.' })
  async bulkStockOperation(
    @Body() bulkData: BulkStockOperationDto,
    @Request() req: any,
  ): Promise<any> {
    return this.stockService.performBulkOperation(bulkData, req.user.sub);
  }
}

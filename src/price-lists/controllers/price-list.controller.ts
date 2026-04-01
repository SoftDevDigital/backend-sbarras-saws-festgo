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
import { PriceListService } from '../services/price-list.service';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  PriceListQueryDto,
  AddPriceListItemsDto,
  PatchPriceListItemDto,
} from '../dto/price-list.dto';
import { IPriceList } from '../../shared/interfaces/price-list.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('price-lists')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('price-lists')
@UseGuards(JwtAuthGuard, RoleGuard)
export class PriceListController {
  constructor(private readonly priceListService: PriceListService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Crear lista de precios',
    description:
      'Solo **admin**.\n\n**Opción 2 — adjuntar barra al crear la lista:** envía `barId` (UUID de la barra). Tras guardar la lista, el backend asigna `priceListId` en esa barra. Si no envías `eventId`, se toma el del bar. Si envías ambos, deben coincidir con el evento de la barra.\n\n**Opción 1** (lista existente → barra): crea la lista sin `barId` y luego en `POST /bars` o `PATCH /bars/:id` pasa `priceListId`.\n\nPuedes crear la lista sin ítems y luego usar `POST /price-lists/:id/items`. Cada producto solo puede estar en una lista a la vez.',
  })
  async create(@Body() dto: CreatePriceListDto): Promise<IPriceList> {
    return this.priceListService.create(dto);
  }

  @Get()
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Listar listas de precios',
    description: 'Filtros opcionales: `eventId`, `search` (nombre).',
  })
  async findAll(@Query() query: PriceListQueryDto): Promise<IPriceList[]> {
    return this.priceListService.findAll(query);
  }

  @Get('meta/unassigned-product-ids')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Productos sin ninguna lista',
    description:
      'Devuelve IDs de catálogo que aún no figuran en ninguna lista de precios (útiles para armar una lista nueva).',
  })
  async getUnassignedProductIds(): Promise<{ productIds: string[] }> {
    return this.priceListService.getUnassignedProductIds();
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({
    summary: 'Añadir productos a una lista',
    description:
      'Solo **admin**. Agrega líneas sin reemplazar toda la lista (merge). No puede repetirse un `productId` ya presente ni estar en otra lista.',
  })
  async addItems(
    @Param('id') id: string,
    @Body() dto: AddPriceListItemsDto,
  ): Promise<IPriceList> {
    return this.priceListService.addItems(id, dto);
  }

  @Patch(':id/items/:productId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Editar precio/impuesto de una línea',
    description: 'Solo **admin**. `productId` = UUID del producto en esa lista.',
  })
  async patchItem(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() dto: PatchPriceListItemDto,
  ): Promise<IPriceList> {
    return this.priceListService.updateItem(id, productId, dto);
  }

  @Delete(':id/items/:productId')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({ summary: 'Quitar producto de la lista', description: 'Solo **admin**.' })
  async removeItem(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ): Promise<IPriceList> {
    return this.priceListService.removeItem(id, productId);
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  @ApiOperation({ summary: 'Detalle de lista de precios', description: 'Incluye todas las líneas (`items`).' })
  async findOne(@Param('id') id: string): Promise<IPriceList> {
    return this.priceListService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Actualizar lista (metadatos o reemplazar ítems)',
    description:
      'Solo **admin**. Si envías `items`, reemplaza todas las líneas de la lista.\n\n**Opción 2 (alternativa):** puedes enviar `barId` para asignar esta lista como lista activa de esa barra (mismo criterio de evento que en el POST).',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
  ): Promise<IPriceList> {
    return this.priceListService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({
    summary: 'Eliminar lista de precios',
    description: 'Solo si ninguna barra usa esta lista (`priceListId`).',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.priceListService.remove(id);
  }
}

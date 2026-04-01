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
import { ProductService } from '../services/product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  StockUpdateDto,
} from '../dto/product.dto';
import {
  IProduct,
  IProductKey,
  IProductStockAlert,
} from '../../shared/interfaces/product.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('products')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('products')
@UseGuards(JwtAuthGuard, RoleGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Crear producto',
    description:
      'Alta en catálogo (admin). El producto puede asignarse después a una lista de precios desde `/price-lists`.',
  })
  @ApiResponse({ status: 201, description: 'Producto creado.' })
  @ApiResponse({ status: 400, description: 'Validación del body.' })
  @ApiResponse({ status: 403, description: 'Solo rol `admin`.' })
  async create(@Body() createProductDto: CreateProductDto): Promise<IProduct> {
    return this.productService.create(createProductDto);
  }

  @Get()
  @Roles('admin', 'bartender') // Ambos pueden consultar
  @ApiOperation({
    summary: 'Listar productos o teclas rápidas',
    description:
      '**Modos:** sin `keys_only` → listado/filtros (`search`, categoría, paginación). `keys_only=true` → solo teclas (`quickKey`) con precio; usar **`bar_id`** para precios según lista de la barra. Si `search` tiene texto → búsqueda por nombre/código.',
  })
  @ApiResponse({ status: 200, description: 'Lista de productos o de teclas según query.' })
  async findAll(
    @Query() query: ProductQueryDto,
  ): Promise<IProduct[] | IProductKey[]> {
    // Si se solicita solo teclas rápidas (contraparte: keys_only=false o sin parámetro = productos completos)
    if (query.keys_only === 'true') {
      return this.productService.getProductKeys({
        bar_id: query.bar_id || 'default',
      });
    }

    // Si hay término de búsqueda, usar búsqueda (contraparte: search vacío = todos los productos)
    if (query.search && query.search.trim().length > 0) {
      return this.productService.searchProducts(query.search);
    }

    // Listar productos con filtros (incluye todos los casos restantes)
    return this.productService.findAll(query);
  }

  @Get('stats/summary')
  @Roles('admin') // Solo admin puede ver estadísticas
  @ApiOperation({
    summary: 'Resumen de estadísticas del catálogo',
    description:
      'Totales de productos, activos/inactivos, con tecla, stock bajo, valor inventario, etc. Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Objeto con contadores y métricas.' })
  @ApiResponse({ status: 403, description: 'Solo rol `admin`.' })
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withKeys: number;
    lowStock: number;
    outOfStock: number;
    totalStockValue: number;
  }> {
    return this.productService.getProductStats();
  }

  @Get('stock/alerts')
  @Roles('admin') // Solo admin puede ver alertas de stock
  @ApiOperation({
    summary: 'Alertas de stock del catálogo',
    description:
      'Productos bajo mínimo o sin stock según reglas del servicio. Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Lista de alertas.' })
  @ApiResponse({ status: 403, description: 'Solo rol `admin`.' })
  async getStockAlerts(): Promise<IProductStockAlert[]> {
    return this.productService.getStockAlerts();
  }

  @Get(':id')
  @Roles('admin', 'bartender') // Ambos pueden consultar un producto específico
  @ApiOperation({
    summary: 'Obtener un producto por ID',
    description: 'UUID del producto en el catálogo.',
  })
  @ApiResponse({ status: 200, description: 'Producto encontrado.' })
  @ApiResponse({ status: 404, description: 'Producto no existe.' })
  async findOne(@Param('id') id: string): Promise<IProduct> {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin') // Solo admin puede modificar
  @ApiOperation({
    summary: 'Actualizar producto',
    description: 'Campos parciales según `UpdateProductDto`. Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Producto actualizado.' })
  @ApiResponse({ status: 404, description: 'Producto no existe.' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<IProduct> {
    return this.productService.update(id, updateProductDto);
  }

  @Patch(':id/stock')
  @HttpCode(HttpStatus.OK)
  @Roles('admin') // Solo admin puede actualizar stock
  @ApiOperation({
    summary: 'Ajustar stock del producto',
    description:
      'Actualización de cantidad/stock a nivel catálogo (no confundir con stock por barra en `/stock`). Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Producto con stock actualizado.' })
  async updateStock(
    @Param('id') id: string,
    @Body() stockUpdateDto: StockUpdateDto,
  ): Promise<IProduct> {
    return this.productService.updateStock(id, stockUpdateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin') // Solo admin puede eliminar
  @ApiOperation({
    summary: 'Eliminar producto (baja lógica o según implementación)',
    description: 'Solo **admin**. Devuelve mensaje y copia del producto afectado.',
  })
  @ApiResponse({ status: 200, description: 'Eliminación procesada.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; deletedProduct: IProduct }> {
    return this.productService.remove(id);
  }
}

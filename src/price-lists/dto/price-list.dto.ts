import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PriceListItemDto {
  @ApiProperty({ description: 'UUID del producto en el catálogo (`/products`).' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1500.5, description: 'Precio de venta en esta lista.' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'IVA u otro % (0–100). Si omites, puede heredarse del producto al cobrar.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class CreatePriceListDto {
  @ApiProperty({ example: 'Lista Noche Año Nuevo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Opcional: filtra/agrupa listas por evento. Si envías **`barId`**, y omites `eventId`, se toma el `eventId` de esa barra automáticamente.',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    description:
      '**Opción 2 (adjuntar barra al crear la lista):** UUID de la barra que usará esta lista como `priceListId`. Tras crear la lista, el backend actualiza esa barra. Debe ser del mismo evento que `eventId` si ambos van; si solo va `barId`, el `eventId` de la lista se rellena con el de la barra.',
  })
  @IsOptional()
  @IsString()
  barId?: string;

  @ApiPropertyOptional({
    type: [PriceListItemDto],
    description:
      'Líneas de la lista. Puede vacío: luego se agregan con `POST /price-lists/:id/items`. Un producto no puede estar en dos listas.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemDto)
  items?: PriceListItemDto[];

  @ApiPropertyOptional({
    description: 'Deprecated: ignorado. La exclusividad de productos entre listas siempre aplica.',
    deprecated: true,
  })
  @IsOptional()
  @IsBoolean()
  onlyUnassignedProducts?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePriceListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    description:
      '**Opción 2 (paso alternativo):** asigna esta lista como lista activa de la barra (`bar.priceListId`). La barra debe pertenecer al mismo `eventId` que la lista (cuando la lista tiene `eventId`).',
  })
  @IsOptional()
  @IsString()
  barId?: string;

  @ApiPropertyOptional({
    type: [PriceListItemDto],
    description: 'Reemplaza todas las líneas si se envía.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemDto)
  items?: PriceListItemDto[];

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsBoolean()
  onlyUnassignedProducts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PriceListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({ description: 'Filtra por nombre de lista.' })
  @IsOptional()
  @IsString()
  search?: string;
}

/** Añadir ítems a una lista ya creada (merge). */
export class AddPriceListItemsDto {
  @ApiProperty({ type: [PriceListItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemDto)
  items: PriceListItemDto[];

  @ApiPropertyOptional({ deprecated: true })
  @IsOptional()
  @IsBoolean()
  onlyUnassignedProducts?: boolean;
}

export class PatchPriceListItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;
}

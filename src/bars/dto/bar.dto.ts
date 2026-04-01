import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateBarDto {
  @ApiProperty({ example: 'Barra principal', description: 'Nombre único dentro del mismo evento.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'UUID del evento al que pertenece la barra.' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    example: 'EPSON_TM_T20',
    description: 'Identificador/nombre de impresora en el entorno (según despliegue).',
  })
  @IsString()
  @IsNotEmpty()
  printer: string;

  @ApiPropertyOptional({
    description:
      '**Opción 1 — lista ya existente:** UUID de una lista creada en `POST /price-lists` (o varias barras pueden compartir la misma lista). El POS y los tickets usan precios de esa lista para esta barra. Si se omite, se usan precios del catálogo global del producto. Alternativa: crear la lista con `barId` en `POST /price-lists` (**opción 2**).',
  })
  @IsOptional()
  @IsString()
  priceListId?: string;
}

export class UpdateBarDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  printer?: string;

  @ApiPropertyOptional({
    description:
      '**Opción 1:** UUID de una lista existente para cambiar la lista de precios de esta barra.',
  })
  @IsOptional()
  @IsString()
  priceListId?: string;

  @ApiPropertyOptional({ enum: ['active', 'closed'] })
  @IsEnum(['active', 'closed'])
  @IsOptional()
  status?: 'active' | 'closed';
}

export class BarQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ enum: ['active', 'closed'] })
  @IsEnum(['active', 'closed'])
  @IsOptional()
  status?: 'active' | 'closed';

  @ApiPropertyOptional({ description: 'Búsqueda por nombre de barra.' })
  @IsString()
  @IsOptional()
  search?: string;
}

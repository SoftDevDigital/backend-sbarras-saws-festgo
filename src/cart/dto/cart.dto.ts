import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Body de `POST /bartender/input`: escaneo/teclado POS. */
export class BartenderInputDto {
  @ApiProperty({
    example: 'CCC2',
    description:
      'Texto capturado (código de producto + cantidad). Ej.: `CCC2` = 2 unidades del producto con quick key CCC; `FER1` = 1 unidad.',
  })
  @IsString()
  input: string;

  @ApiProperty({
    description: 'UUID del evento en el que opera el bartender.',
  })
  @IsString()
  eventId: string;

  @ApiPropertyOptional({
    description:
      'UUID de la barra activa. Si se envía, precios y catálogo se alinean con la lista de precios de esa barra.',
  })
  @IsOptional()
  @IsString()
  barId?: string;
}

/** Body de `DELETE /bartender/cart/item`. */
export class RemoveCartItemDto {
  @ApiProperty({
    description: 'UUID del producto a eliminar del carrito del usuario autenticado.',
  })
  @IsString()
  productId: string;
}

/** Body de `POST /bartender/cart/confirm`: cierra la venta y crea el ticket. */
export class ConfirmCartDto {
  @ApiProperty({
    description: 'UUID de la barra donde se registra la venta (obligatorio para el ticket).',
  })
  @IsString()
  barId: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente (ticket / impresión).' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Email del cliente (opcional).' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiProperty({
    enum: ['cash', 'card', 'transfer', 'administrator', 'dj'],
    description:
      'Medio de pago — **obligatorio**: el servicio responde `400` si falta.',
  })
  @IsString()
  paymentMethod: 'cash' | 'card' | 'transfer' | 'administrator' | 'dj';

  @ApiPropertyOptional({ description: 'Notas internas u observaciones.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

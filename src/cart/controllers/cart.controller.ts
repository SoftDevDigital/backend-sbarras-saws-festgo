import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CartService } from '../services/cart.service';
import {
  IBartenderInputResponse,
  ICartSummary,
  IConfirmCartResponse,
} from '../../shared/interfaces/cart.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';
import {
  BartenderInputDto,
  ConfirmCartDto,
  RemoveCartItemDto,
} from '../dto/cart.dto';

@ApiTags('bartender')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('bartender')
@UseGuards(JwtAuthGuard, RoleGuard)
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(private readonly cartService: CartService) {}

  // Endpoint principal: Procesar entrada del bartender (ej: "CCC2", "FER1")
  @Post('input')
  @HttpCode(HttpStatus.OK)
  @Roles('bartender')
  @ApiOperation({
    summary: 'Entrada POS (código + cantidad)',
    description:
      'Parsea `input` (ej. `CCC2`), valida producto y añade al carrito del usuario del JWT. **`eventId`** obligatorio; **`barId`** opcional para precios de lista de la barra.',
  })
  @ApiResponse({ status: 200, description: 'Línea añadida o error de negocio en `success`/`message`.' })
  @ApiResponse({ status: 403, description: 'Solo rol `bartender`.' })
  async processInput(
    @Body() body: BartenderInputDto,
    @Request() req: any,
  ): Promise<IBartenderInputResponse> {
    this.logger.log(
      `Processing bartender input: ${body.input}`,
      'CartController.processInput',
    );

    try {
      const userId = req.user.sub;
      const userName = req.user.name || req.user.email;

      const result = await this.cartService.processBartenderInput(
        body.input,
        userId,
        userName,
        body.eventId,
        body.barId,
      );

      this.logger.log(
        `Input processed successfully: ${body.input}`,
        'CartController.processInput',
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing input:`,
        error.stack,
        'CartController.processInput',
      );
      throw error;
    }
  }

  // Ver carrito actual
  @Get('cart')
  @Roles('bartender')
  @ApiOperation({
    summary: 'Resumen del carrito actual',
    description:
      'Carrito en memoria del **usuario del token** (sub). Incluye ítems, subtotal, impuestos y total.',
  })
  @ApiResponse({ status: 200, description: 'Resumen del carrito.' })
  async getCart(@Request() req: any): Promise<ICartSummary> {
    this.logger.log('Getting cart summary', 'CartController.getCart');

    try {
      const userId = req.user.sub;
      const result = await this.cartService.getCartSummary(userId);

      this.logger.log(
        `Cart summary retrieved: ${result.totalItems} items`,
        'CartController.getCart',
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error getting cart:`,
        error.stack,
        'CartController.getCart',
      );
      throw error;
    }
  }

  // Eliminar un item específico del carrito
  @Delete('cart/item')
  @HttpCode(HttpStatus.OK)
  @Roles('bartender')
  @ApiOperation({
    summary: 'Quitar un producto del carrito',
    description: 'Elimina la línea identificada por `productId` del carrito del usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Resultado con `success` y nuevo resumen opcional.' })
  async removeItemFromCart(
    @Body() body: RemoveCartItemDto,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string; cartSummary?: any }> {
    this.logger.log(
      `Removing item from cart: ${body.productId}`,
      'CartController.removeItemFromCart',
    );

    try {
      const userId = req.user.sub;
      const result = await this.cartService.removeItemFromCart(
        userId,
        body.productId,
      );

      this.logger.log(
        'Item removed from cart successfully',
        'CartController.removeItemFromCart',
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error removing item from cart:`,
        error.stack,
        'CartController.removeItemFromCart',
      );
      throw error;
    }
  }

  // Limpiar carrito
  @Delete('cart')
  @HttpCode(HttpStatus.OK)
  @Roles('bartender')
  @ApiOperation({
    summary: 'Vaciar carrito',
    description: 'Elimina todos los ítems del carrito del usuario sin generar ticket.',
  })
  @ApiResponse({ status: 200, description: '`success` y mensaje.' })
  async clearCart(
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Clearing cart', 'CartController.clearCart');

    try {
      const userId = req.user.sub;
      const result = await this.cartService.clearCart(userId);

      this.logger.log('Cart cleared successfully', 'CartController.clearCart');
      return result;
    } catch (error) {
      this.logger.error(
        `Error clearing cart:`,
        error.stack,
        'CartController.clearCart',
      );
      throw error;
    }
  }

  // Confirmar carrito y generar ticket
  @Post('cart/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles('bartender')
  @ApiOperation({
    summary: 'Confirmar venta (crear ticket)',
    description:
      'Obligatorio **`barId`**: cierra el carrito, genera ticket y devuelve `ticketId` y datos para impresión cuando aplique. Errores de negocio pueden venir con `success: false` sin HTTP 4xx según implementación.',
  })
  @ApiResponse({ status: 200, description: 'Ticket creado o error en payload.' })
  async confirmCart(
    @Body() request: ConfirmCartDto,
    @Request() req: any,
  ): Promise<IConfirmCartResponse> {
    this.logger.log(
      'Confirming cart and generating ticket',
      'CartController.confirmCart',
    );

    try {
      const userId = req.user.sub;
      console.log(`[CartController] Token payload:`, req.user);
      console.log(`[CartController] User ID from token: ${userId}`);
      console.log(`[CartController] User email from token: ${req.user.email}`);
      console.log(`[CartController] User name from token: ${req.user.name}`);

      const result = await this.cartService.confirmCart(userId, request);

      if (result.success) {
        this.logger.log(
          `Ticket generated successfully: ${result.ticketId}`,
          'CartController.confirmCart',
        );
      } else {
        this.logger.warn(
          `Cart confirmation failed: ${result.error}`,
          'CartController.confirmCart',
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error confirming cart:`,
        error.stack,
        'CartController.confirmCart',
      );
      throw error;
    }
  }

  // Endpoint de prueba para verificar que el sistema funciona
  @Get('test')
  @Roles('bartender')
  @ApiOperation({
    summary: 'Comprobación de sesión (debug)',
    description: 'Devuelve mensaje fijo y payload básico del usuario del JWT. Útil para verificar token en entornos de prueba.',
  })
  @ApiResponse({ status: 200, description: 'Eco de usuario y mensaje.' })
  async testEndpoint(
    @Request() req: any,
  ): Promise<{ message: string; user: any }> {
    return {
      message: 'Sistema de carrito funcionando correctamente',
      user: {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
      },
    };
  }
}

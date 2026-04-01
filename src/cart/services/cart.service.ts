import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductService } from '../../products/services/product.service';
import { TicketService } from '../../tickets/services/ticket.service';
import {
  ICart,
  ICartItem,
  ICartSummary,
  IAddToCartRequest,
  IAddToCartResponse,
  IConfirmCartRequest,
  IConfirmCartResponse,
  IBartenderInputResponse,
} from '../../shared/interfaces/cart.interface';
import { IProduct } from '../../shared/interfaces/product.interface';
import { Product, ProductDocument } from '../../shared/schemas/product.schema';
import { BarService } from '../../bars/services/bar.service';
import { PriceListService } from '../../price-lists/services/price-list.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  private activeCarts: Map<string, ICart> = new Map(); // Keep in memory as per original

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly productService: ProductService,
    private readonly ticketService: TicketService,
    private readonly barService: BarService,
    private readonly priceListService: PriceListService,
  ) {}

  async processBartenderInput(
    input: string,
    userId: string,
    userName: string,
    eventId: string,
    barId?: string,
  ): Promise<IBartenderInputResponse> {
    try {
      if (!eventId) throw new BadRequestException('eventId is required.');
      const { code, quantity } = this.parseInput(input);

      const product = await this.findProductByCode(code, eventId, barId);
      if (!product) throw new NotFoundException(`Product ${code} not found.`);
      if (product.stock < quantity)
        throw new BadRequestException(
          `Insufficient stock for ${product.name}.`,
        );

      const addResult = await this.addToCart(
        { productCode: code, quantity },
        userId,
        userName,
        eventId,
        barId,
      );
      if (!addResult.success)
        throw new BadRequestException(
          addResult.error || 'Error adding to cart',
        );

      const cartSummary = await this.getCartSummary(userId);

      return {
        success: true,
        message: `${quantity}x ${product.name} added to cart`,
        product: {
          name: product.name,
          code: product.code,
          price: product.price,
          quantity,
          total: product.price * quantity,
        },
        cartSummary,
      };
    } catch (error) {
      this.logger.error(`Error processing bartender input:`, error.stack);
      throw error;
    }
  }

  async addToCart(
    request: IAddToCartRequest,
    userId: string,
    userName: string,
    eventId: string,
    barId?: string,
  ): Promise<IAddToCartResponse> {
    try {
      const { productCode: code, quantity } = request;
      const product = await this.findProductByCode(code, eventId, barId);
      if (!product) throw new NotFoundException(`Product ${code} not found`);
      if (product.stock < quantity)
        throw new BadRequestException(`Insufficient stock.`);

      const cart =
        this.activeCarts.get(userId) ||
        (await this.createCart(userId, userName, eventId, barId));

      if (barId && cart.barId && cart.barId !== barId) {
        throw new BadRequestException(
          'Cart was started for a different bar. Clear the cart or use the same bar.',
        );
      }
      if (barId && !cart.barId) {
        cart.barId = barId;
        this.activeCarts.set(userId, cart);
      }

      const existingItemIndex = cart.items.findIndex(
        (item) => item.productCode === code,
      );
      if (existingItemIndex >= 0) {
        cart.items[existingItemIndex].quantity = quantity;
        cart.items[existingItemIndex].total = quantity * product.price;
      } else {
        cart.items.push({
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          price: product.price,
          quantity,
          total: product.price * quantity,
          unit: product.unit,
        });
      }

      this.recalculateCartTotals(cart);
      cart.updatedAt = new Date().toISOString();
      this.activeCarts.set(userId, cart);

      return {
        success: true,
        message: `${quantity}x ${product.name} added to cart`,
        cartItem: cart.items.find((i) => i.productCode === code),
        cartTotal: cart.total,
      };
    } catch (error) {
      this.logger.error(`Error adding to cart:`, error.stack);
      return {
        success: false,
        message: 'Error adding to cart',
        error: error.message,
      };
    }
  }

  async getCartSummary(userId: string): Promise<ICartSummary> {
    const cart = this.activeCarts.get(userId);
    if (!cart)
      return {
        totalItems: 0,
        totalQuantity: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        items: [],
      };

    return {
      totalItems: cart.items.length,
      totalQuantity: cart.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: cart.subtotal,
      tax: cart.tax,
      total: cart.total,
      items: cart.items,
    };
  }

  async removeItemFromCart(userId: string, productId: string): Promise<any> {
    const cart = this.activeCarts.get(userId);
    if (!cart) throw new NotFoundException('Cart not found');

    const index = cart.items.findIndex((i) => i.productId === productId);
    if (index === -1) throw new NotFoundException('Product not in cart');

    const name = cart.items[index].productName;
    cart.items.splice(index, 1);
    this.recalculateCartTotals(cart);

    if (cart.items.length === 0) this.activeCarts.delete(userId);
    else this.activeCarts.set(userId, cart);

    return {
      success: true,
      message: `${name} removed`,
      cartSummary: await this.getCartSummary(userId),
    };
  }

  async clearCart(userId: string): Promise<any> {
    this.activeCarts.delete(userId);
    return { success: true, message: 'Cart cleared' };
  }

  async confirmCart(
    userId: string,
    request: IConfirmCartRequest,
  ): Promise<IConfirmCartResponse | any> {
    try {
      if (!request.barId) throw new BadRequestException('barId is required.');
      if (!request.paymentMethod)
        throw new BadRequestException('paymentMethod is required.');

      const cart = this.activeCarts.get(userId);
      if (!cart || cart.items.length === 0)
        throw new BadRequestException('Cart is empty.');

      // Check stock
      for (const item of cart.items) {
        const product = await this.productService.findOne(item.productId);
        if (product.stock < item.quantity)
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
      }

      const ticket = await this.ticketService.create(
        {
          barId: request.barId,
          items: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
          customerName: request.customerName || 'Cliente',
          paymentMethod: request.paymentMethod as any,
          notes: request.notes,
        },
        cart.userId,
      );

      // Update stock
      for (const item of cart.items) {
        await this.productService.updateStock(item.productId, {
          quantity: item.quantity,
          type: 'subtract',
          reason: `Venta - Ticket ${ticket.id}`,
        });
      }

      const printFormat = await this.ticketService.getPrintFormat(ticket.id);
      await this.ticketService.markAsPrinted(ticket.id);

      this.activeCarts.delete(userId);

      return {
        success: true,
        ticketId: ticket.id,
        message: 'Ticket generated and printed',
        printFormat,
      };
    } catch (error) {
      this.logger.error(`Error confirming cart:`, error.stack);
      throw error;
    }
  }

  private parseInput(input: string): { code: string; quantity: number } {
    const match = input.trim().match(/^([A-Za-z]{2,3})(\d+)$/);
    if (!match)
      throw new BadRequestException('Invalid format. Use COD+QTY (e.g. CCC2)');
    return { code: match[1].toUpperCase(), quantity: parseInt(match[2], 10) };
  }

  private async findProductByCode(
    code: string,
    eventId: string,
    barId?: string,
  ): Promise<IProduct | null> {
    const p = await this.productModel.findOne({
      code,
      active: true,
      available: true,
    });
    if (!p) return null;

    const product = await this.productService.findOne(p._id);

    if (!barId) {
      return product;
    }

    const bar = await this.barService.findOne(barId);
    if (bar.eventId !== eventId) {
      throw new BadRequestException(
        'The selected bar does not belong to this event.',
      );
    }

    const { unitPrice, taxRate } = await this.priceListService.resolveForBar(
      barId,
      product,
    );
    return {
      ...product,
      price: unitPrice,
      taxRate,
    };
  }

  private async createCart(
    userId: string,
    userName: string,
    eventId: string,
    barId?: string,
  ): Promise<ICart> {
    const cart: ICart = {
      id: `cart_${Date.now()}`,
      userId,
      userName,
      eventId,
      barId,
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.activeCarts.set(userId, cart);
    return cart;
  }

  private recalculateCartTotals(cart: ICart): void {
    cart.subtotal = cart.items.reduce((sum, i) => sum + i.total, 0);
    cart.tax = 0;
    cart.total = cart.subtotal;
  }
}

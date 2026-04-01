import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../../shared/schemas/product.schema';
import { Ticket, TicketDocument } from '../../shared/schemas/ticket.schema';
import { CustomLoggerService } from '../../shared/services/logger.service';
import {
  IProduct,
  IProductKey,
  IProductStockAlert,
} from '../../shared/interfaces/product.interface';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  StockUpdateDto,
} from '../dto/product.dto';
import { BarService } from '../../bars/services/bar.service';
import { PriceListService } from '../../price-lists/services/price-list.service';

@Injectable()
export class ProductService {
  private readonly logger = new CustomLoggerService();

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    private readonly barService: BarService,
    private readonly priceListService: PriceListService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<IProduct> {
    try {
      if (
        !createProductDto ||
        !createProductDto.name ||
        !createProductDto.price
      ) {
        throw new BadRequestException('Product name and price are required');
      }

      if (createProductDto.quickKey) {
        await this.validateQuickKeyUniqueness(createProductDto.quickKey);
      }

      const newProduct = new this.productModel({
        ...createProductDto,
        active: createProductDto.active ?? true,
      });

      const savedProduct = await newProduct.save();

      this.logger.success(
        `Product created: ${savedProduct.name} (ID: ${savedProduct._id})`,
        'ProductService',
      );
      return this.mapProduct(savedProduct);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        'Error creating product:',
        error.message,
        'ProductService',
      );
      throw new BadRequestException(
        `Failed to create product '${createProductDto.name}'.`,
      );
    }
  }

  async findAll(query: ProductQueryDto): Promise<IProduct[]> {
    try {
      const filter: any = {};

      if (query.bar_id) {
        const bar = await this.barService.findOne(query.bar_id);
        if (bar.priceListId) {
          const ids = await this.priceListService.getProductIdsInList(
            bar.priceListId,
          );
          if (ids.length === 0) {
            return [];
          }
          filter._id = { $in: ids };
        }
      }

      if (query.status === 'active') filter.active = true;
      if (query.status === 'inactive') filter.active = false;
      if (query.category)
        filter.category = { $regex: query.category, $options: 'i' };
      if (query.low_stock) filter.$expr = { $lte: ['$stock', '$minStock'] };
      if (query.out_of_stock) filter.stock = { $lte: 0 };

      const sort: any = {};
      if (query.sort_by) {
        sort[query.sort_by] = query.sort_order === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1;
      }

      const products = await this.productModel
        .find(filter)
        .sort(sort)
        .skip(query.offset || 0)
        .limit(query.limit || 1000);

      return products.map((p) => this.mapProduct(p));
    } catch (error) {
      this.logger.error(
        'Error fetching products:',
        error.message,
        'ProductService',
      );
      throw new BadRequestException('Failed to retrieve products.');
    }
  }

  async findOne(id: string): Promise<IProduct> {
    const product = await this.productModel.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found.`);
    }

    return this.mapProduct(product);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<IProduct> {
    try {
      const existingProduct = await this.findOne(id);

      if (
        updateProductDto.quickKey &&
        updateProductDto.quickKey !== existingProduct.quickKey
      ) {
        await this.validateQuickKeyUniqueness(updateProductDto.quickKey, id);
      }

      const updatedProduct = await this.productModel.findByIdAndUpdate(
        id,
        { ...updateProductDto },
        { new: true },
      );

      if (!updatedProduct) {
        throw new NotFoundException(`Product with ID '${id}' not found.`);
      }

      return this.mapProduct(updatedProduct);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update product with ID '${id}'.`,
      );
    }
  }

  async remove(
    id: string,
  ): Promise<{ message: string; deletedProduct: IProduct }> {
    const product = await this.findOne(id);

    const hasTickets = await this.ticketModel.exists({ 'items.productId': id });
    if (hasTickets) {
      throw new ConflictException(
        `Cannot delete product '${product.name}' because it has associated sales.`,
      );
    }

    await this.productModel.findByIdAndDelete(id);

    return {
      message: `Product '${product.name}' deleted successfully`,
      deletedProduct: product,
    };
  }

  async getProductKeys(query: { bar_id?: string }): Promise<IProductKey[]> {
    let products: ProductDocument[];

    if (query.bar_id) {
      const bar = await this.barService.findOne(query.bar_id);
      if (bar.priceListId) {
        const list = await this.priceListService.findOne(bar.priceListId);
        const priceByProductId = new Map(
          list.items.map((i) => [i.productId, i.unitPrice]),
        );
        const ids = list.items.map((i) => i.productId);
        products = await this.productModel.find({
          _id: { $in: ids },
          active: true,
          quickKey: { $ne: null },
        });
        return products.map((product) => ({
          productId: product._id,
          productName: product.name,
          price: priceByProductId.get(product._id) ?? product.price,
          quickKey: product.quickKey,
          code: product.code,
          stock: product.stock,
          available: product.active,
        }));
      }
    }

    products = await this.productModel.find({
      active: true,
      quickKey: { $ne: null },
    });

    return products.map((product) => ({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quickKey: product.quickKey,
      code: product.code,
      stock: product.stock,
      available: product.active,
    }));
  }

  async updateStock(
    productId: string,
    stockUpdateDto: StockUpdateDto,
  ): Promise<IProduct> {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    let newStock = product.stock;
    if (stockUpdateDto.type === 'add') newStock += stockUpdateDto.quantity;
    if (stockUpdateDto.type === 'subtract') {
      if (newStock < stockUpdateDto.quantity)
        throw new BadRequestException('Insufficient stock');
      newStock -= stockUpdateDto.quantity;
    }
    if (stockUpdateDto.type === 'set') newStock = stockUpdateDto.quantity;

    product.stock = newStock;
    const saved = await product.save();
    return this.mapProduct(saved);
  }

  async getProductStats(): Promise<any> {
    const products = await this.productModel.find();

    return {
      total: products.length,
      active: products.filter((p) => p.active).length,
      inactive: products.filter((p) => !p.active).length,
      withKeys: products.filter((p) => p.quickKey).length,
      lowStock: products.filter((p) => p.stock <= p.minStock).length,
      outOfStock: products.filter((p) => p.stock <= 0).length,
      totalStockValue: products.reduce(
        (total, p) => total + p.stock * (p.cost || p.price),
        0,
      ),
    };
  }

  async getStockAlerts(): Promise<IProductStockAlert[]> {
    const products = await this.productModel.find({
      $or: [
        { stock: { $lte: 0 } },
        { $expr: { $lte: ['$stock', '$minStock'] } },
      ],
    });

    return products.map((p) => ({
      productId: p._id,
      productName: p.name,
      currentStock: p.stock,
      minStock: p.minStock,
      alertType: p.stock <= 0 ? 'out_of_stock' : 'low_stock',
    }));
  }

  async searchProducts(query: string): Promise<IProduct[]> {
    if (!query) return this.findAll({});
    const products = await this.productModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
      ],
    });
    return products.map((p) => this.mapProduct(p));
  }

  private async validateQuickKeyUniqueness(
    quickKey: string,
    excludeId?: string,
  ): Promise<void> {
    const query: any = { quickKey };
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await this.productModel.exists(query);
    if (exists) {
      throw new ConflictException(`Quick key '${quickKey}' is already in use.`);
    }
  }

  private mapProduct(product: ProductDocument): IProduct {
    return {
      id: product._id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      code: product.code,
      quickKey: product.quickKey,
      barcode: product.barcode,
      taxRate: product.taxRate,
      active: product.active,
      available: product.available,
      createdAt:
        product['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt:
        product['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }
}

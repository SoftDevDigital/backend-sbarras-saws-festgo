import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PriceList,
  PriceListDocument,
} from '../../shared/schemas/price-list.schema';
import { Bar, BarDocument } from '../../shared/schemas/bar.schema';
import { Product, ProductDocument } from '../../shared/schemas/product.schema';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  PriceListQueryDto,
  AddPriceListItemsDto,
  PatchPriceListItemDto,
} from '../dto/price-list.dto';
import { IPriceList } from '../../shared/interfaces/price-list.interface';
import { IProduct } from '../../shared/interfaces/product.interface';

@Injectable()
export class PriceListService {
  constructor(
    @InjectModel(PriceList.name)
    private readonly priceListModel: Model<PriceListDocument>,
    @InjectModel(Bar.name) private readonly barModel: Model<BarDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreatePriceListDto): Promise<IPriceList> {
    const barId = dto.barId?.trim();
    let barToLink: BarDocument | null = null;
    let resolvedEventId = dto.eventId;

    if (barId) {
      barToLink = await this.barModel.findById(barId);
      if (!barToLink) {
        throw new NotFoundException(`Bar with ID '${barId}' not found.`);
      }
      if (resolvedEventId && barToLink.eventId !== resolvedEventId) {
        throw new BadRequestException(
          'eventId does not match the bar\'s event. Omit eventId or use the bar\'s event.',
        );
      }
      if (!resolvedEventId) {
        resolvedEventId = barToLink.eventId;
      }
    }

    const rawItems = dto.items ?? [];
    if (rawItems.length) {
      this.validateDuplicateProductIds(rawItems);
      await this.ensureProductsExist(rawItems.map((i) => i.productId));
      // Un producto solo puede pertenecer a una lista de precios (no repetir en otras listas).
      await this.ensureProductsNotInAnyPriceList(
        rawItems.map((i) => i.productId),
        undefined,
      );
    }

    const doc = new this.priceListModel({
      name: dto.name.trim(),
      description: dto.description,
      eventId: resolvedEventId,
      items: rawItems.map((i) => ({
        productId: i.productId,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })),
      active: dto.active ?? true,
    });
    const saved = await doc.save();

    if (barToLink) {
      barToLink.priceListId = saved._id;
      await barToLink.save();
    }

    return this.mapList(saved);
  }

  /**
   * Productos del catálogo que no aparecen en ninguna lista (para armar la lista con “genéricos”).
   */
  async getUnassignedProductIds(): Promise<{ productIds: string[] }> {
    const lists = await this.priceListModel
      .find({})
      .select('items.productId')
      .lean();
    const assigned = new Set<string>();
    for (const l of lists) {
      for (const row of l.items || []) {
        assigned.add(row.productId);
      }
    }
    const allProducts = await this.productModel.find({}).select('_id').lean();
    const unassigned = allProducts
      .map((p) => p._id)
      .filter((id) => !assigned.has(id));
    return { productIds: unassigned };
  }

  /** Opción 2: añadir ítems a una lista ya existente (merge; no reemplaza la lista completa). */
  async addItems(
    listId: string,
    dto: AddPriceListItemsDto,
  ): Promise<IPriceList> {
    const list = await this.priceListModel.findById(listId);
    if (!list)
      throw new NotFoundException(`Price list with ID '${listId}' not found.`);

    if (!dto.items?.length) {
      throw new BadRequestException('At least one item is required.');
    }

    this.validateDuplicateProductIds(dto.items);
    await this.ensureProductsExist(dto.items.map((i) => i.productId));

    const existingIds = new Set((list.items || []).map((i) => i.productId));
    for (const i of dto.items) {
      if (existingIds.has(i.productId)) {
        throw new ConflictException(
          `Product ${i.productId} is already in this price list. Use PATCH to update the line.`,
        );
      }
    }

    await this.ensureProductsNotInAnyPriceList(
      dto.items.map((i) => i.productId),
      listId,
    );

    const merged = [
      ...(list.items || []),
      ...dto.items.map((i) => ({
        productId: i.productId,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })),
    ];
    this.validateDuplicateProductIds(merged);

    list.items = merged as any;
    const saved = await list.save();
    return this.mapList(saved);
  }

  async updateItem(
    listId: string,
    productId: string,
    dto: PatchPriceListItemDto,
  ): Promise<IPriceList> {
    const list = await this.priceListModel.findById(listId);
    if (!list)
      throw new NotFoundException(`Price list with ID '${listId}' not found.`);

    const item = (list.items || []).find((i) => i.productId === productId);
    if (!item) {
      throw new NotFoundException(
        `Product '${productId}' is not in this price list.`,
      );
    }

    if (dto.unitPrice !== undefined) item.unitPrice = dto.unitPrice;
    if (dto.taxRate !== undefined) item.taxRate = dto.taxRate;

    const saved = await list.save();
    return this.mapList(saved);
  }

  async removeItem(listId: string, productId: string): Promise<IPriceList> {
    const list = await this.priceListModel.findById(listId);
    if (!list)
      throw new NotFoundException(`Price list with ID '${listId}' not found.`);

    const next = (list.items || []).filter((i) => i.productId !== productId);
    if (next.length === (list.items || []).length) {
      throw new NotFoundException(
        `Product '${productId}' is not in this price list.`,
      );
    }

    list.items = next as any;
    const saved = await list.save();
    return this.mapList(saved);
  }

  async findAll(query: PriceListQueryDto = {}): Promise<IPriceList[]> {
    const filter: Record<string, unknown> = {};
    if (query.eventId) filter.eventId = query.eventId;
    if (query.search?.trim()) {
      filter.name = { $regex: query.search.trim(), $options: 'i' };
    }
    const lists = await this.priceListModel
      .find(filter)
      .sort({ createdAt: -1 });
    return lists.map((l) => this.mapList(l));
  }

  async findOne(id: string): Promise<IPriceList> {
    const list = await this.priceListModel.findById(id);
    if (!list)
      throw new NotFoundException(`Price list with ID '${id}' not found.`);
    return this.mapList(list);
  }

  async update(id: string, dto: UpdatePriceListDto): Promise<IPriceList> {
    const existing = await this.priceListModel.findById(id);
    if (!existing)
      throw new NotFoundException(`Price list with ID '${id}' not found.`);

    if (dto.items) {
      this.validateDuplicateProductIds(dto.items);
      if (dto.items.length) {
        await this.ensureProductsExist(dto.items.map((i) => i.productId));
        await this.ensureProductsNotInAnyPriceList(
          dto.items.map((i) => i.productId),
          id,
        );
      }
    }

    const updated = await this.priceListModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.eventId !== undefined && { eventId: dto.eventId }),
          ...(dto.items !== undefined && {
            items: dto.items.map((i) => ({
              productId: i.productId,
              unitPrice: i.unitPrice,
              taxRate: i.taxRate,
            })),
          }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
      },
      { new: true },
    );

    if (!updated)
      throw new NotFoundException(`Price list with ID '${id}' not found.`);

    const linkBarId = dto.barId?.trim();
    if (linkBarId) {
      const bar = await this.barModel.findById(linkBarId);
      if (!bar) {
        throw new NotFoundException(`Bar with ID '${linkBarId}' not found.`);
      }
      if (updated.eventId && bar.eventId !== updated.eventId) {
        throw new BadRequestException(
          'The bar belongs to a different event than this price list.',
        );
      }
      bar.priceListId = id;
      await bar.save();
    }

    return this.mapList(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const inUse = await this.barModel.exists({ priceListId: id });
    if (inUse) {
      throw new ConflictException(
        'This price list is assigned to one or more bars. Remove the assignment first.',
      );
    }
    const res = await this.priceListModel.findByIdAndDelete(id);
    if (!res)
      throw new NotFoundException(`Price list with ID '${id}' not found.`);
    return { message: 'Price list deleted successfully' };
  }

  /** IDs de productos incluidos en la lista (para filtros de catálogo/teclas). */
  async getProductIdsInList(priceListId: string): Promise<string[]> {
    const list = await this.priceListModel.findById(priceListId).lean();
    if (!list) return [];
    return (list.items || []).map((i: { productId: string }) => i.productId);
  }

  /**
   * Precio efectivo para una venta según la barra: si la barra tiene lista, el producto debe estar en la lista.
   */
  async resolveForBar(
    barId: string,
    product: IProduct,
  ): Promise<{ unitPrice: number; taxRate: number }> {
    const bar = await this.barModel.findById(barId);
    if (!bar) throw new NotFoundException(`Bar with ID '${barId}' not found.`);

    if (!bar.priceListId) {
      return {
        unitPrice: product.price,
        taxRate: product.taxRate ?? 0,
      };
    }

    const list = await this.priceListModel.findById(bar.priceListId);
    if (!list) {
      throw new BadRequestException(
        `Price list '${bar.priceListId}' not found for this bar.`,
      );
    }

    const entry = list.items.find((i) => i.productId === product.id);
    if (!entry) {
      throw new BadRequestException(
        `Product '${product.name}' is not available in this bar's price list.`,
      );
    }

    return {
      unitPrice: entry.unitPrice,
      taxRate: entry.taxRate ?? product.taxRate ?? 0,
    };
  }

  /** Resolución usando solo el id de lista (p. ej. validaciones). */
  async resolveForPriceList(
    priceListId: string,
    product: IProduct,
  ): Promise<{ unitPrice: number; taxRate: number }> {
    const list = await this.priceListModel.findById(priceListId);
    if (!list)
      throw new NotFoundException(
        `Price list with ID '${priceListId}' not found.`,
      );

    const entry = list.items.find((i) => i.productId === product.id);
    if (!entry) {
      throw new BadRequestException(
        `Product '${product.name}' is not in this price list.`,
      );
    }

    return {
      unitPrice: entry.unitPrice,
      taxRate: entry.taxRate ?? product.taxRate ?? 0,
    };
  }

  async getSnapshotForBar(
    barId: string,
  ): Promise<{ priceListId?: string; priceListName?: string }> {
    const bar = await this.barModel.findById(barId);
    if (!bar?.priceListId) return {};
    const list = await this.priceListModel.findById(bar.priceListId);
    if (!list) return { priceListId: bar.priceListId };
    return { priceListId: list._id, priceListName: list.name };
  }

  private validateDuplicateProductIds(items: { productId: string }[]): void {
    if (!items?.length) return;
    const seen = new Set<string>();
    for (const i of items) {
      if (seen.has(i.productId)) {
        throw new BadRequestException(
          `Duplicate productId in list: ${i.productId}`,
        );
      }
      seen.add(i.productId);
    }
  }

  /**
   * Excluye `excludeListId` si se está editando esa lista (reemplazo total o ampliación).
   */
  private async ensureProductsNotInAnyPriceList(
    productIds: string[],
    excludeListId?: string,
  ): Promise<void> {
    if (!productIds.length) return;
    const filter: Record<string, unknown> = {
      'items.productId': { $in: productIds },
    };
    if (excludeListId) {
      filter._id = { $ne: excludeListId };
    }
    const conflict = await this.priceListModel.findOne(filter).lean();
    if (conflict) {
      throw new ConflictException(
        `One or more products are already assigned to another price list (e.g. "${(conflict as any).name}").`,
      );
    }
  }

  private async ensureProductsExist(productIds: string[]): Promise<void> {
    const count = await this.productModel.countDocuments({
      _id: { $in: productIds },
    });
    if (count !== productIds.length) {
      throw new BadRequestException(
        'One or more product IDs do not exist in the catalog.',
      );
    }
  }

  private mapList(list: PriceListDocument): IPriceList {
    return {
      id: list._id,
      name: list.name,
      description: list.description,
      eventId: list.eventId,
      items: (list.items || []).map((i) => ({
        productId: i.productId,
        unitPrice: i.unitPrice,
        taxRate: i.taxRate,
      })),
      active: list.active,
      createdAt: list['createdAt']?.toISOString?.() || new Date().toISOString(),
      updatedAt: list['updatedAt']?.toISOString?.() || new Date().toISOString(),
    };
  }
}

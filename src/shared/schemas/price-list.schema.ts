import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ _id: false })
export class PriceListItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true, type: Number })
  unitPrice: number;

  @Prop({ type: Number })
  taxRate?: number;
}

export const PriceListItemSchema = SchemaFactory.createForClass(PriceListItem);

@Schema({ timestamps: true, collection: 'price_lists' })
export class PriceList {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  /** Opcional: agrupa listas por evento (misma barra puede reutilizar listas de otros eventos si se desea) */
  @Prop({ index: true })
  eventId?: string;

  @Prop({ type: [PriceListItemSchema], default: [] })
  items: PriceListItem[];

  @Prop({ default: true })
  active: boolean;
}

export type PriceListDocument = PriceList & Document;
export const PriceListSchema = SchemaFactory.createForClass(PriceList);

PriceListSchema.index({ eventId: 1, name: 1 });

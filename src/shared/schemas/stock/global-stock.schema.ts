import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'global_stock' })
export class GlobalStock {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, unique: true, index: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, type: Number, default: 0 })
  totalStock: number;

  @Prop({ required: true, type: Number, default: 0 })
  reservedStock: number;

  @Prop({ required: true, type: Number, default: 0 })
  availableStock: number;

  @Prop({ required: true, type: Number, default: 0 })
  minStock: number;

  @Prop({ type: Number })
  maxStock?: number;

  @Prop({ default: () => new Date().toISOString() })
  lastUpdated: string;
}

export type GlobalStockDocument = GlobalStock & Document;
export const GlobalStockSchema = SchemaFactory.createForClass(GlobalStock);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ type: Number })
  cost?: number;

  @Prop({ type: String, default: null })
  quickKey: string | null;

  @Prop({ required: true })
  code: string;

  @Prop({ default: 'General' })
  category: string;

  @Prop({ default: 'unidad' })
  unit: string;

  @Prop({ default: 0, type: Number })
  stock: number;

  @Prop({ default: 0, type: Number })
  minStock: number;

  @Prop()
  barcode?: string;

  @Prop({ default: 0, type: Number })
  taxRate: number;

  @Prop({ default: true })
  available: boolean;

  @Prop({ default: true })
  active: boolean;
}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);

// Indexes for performance (replacing DynamoDB GSIs)
ProductSchema.index({ active: 1, name: 1 });
ProductSchema.index({ quickKey: 1 }, { sparse: true });
ProductSchema.index({ category: 1, name: 1 });

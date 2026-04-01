import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'bar_stock' })
export class BarStock {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, index: true })
  barId: string;

  @Prop({ required: true })
  barName: string;

  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true })
  eventName: string;

  @Prop({ required: true, type: Number })
  initialStock: number;

  @Prop({ required: true, type: Number })
  currentStock: number;

  @Prop({ default: 0, type: Number })
  minStock: number;

  @Prop({ type: Number })
  finalStock?: number;

  @Prop({ default: 0, type: Number })
  totalSold: number;

  @Prop({ default: 0, type: Number })
  totalReplenished: number;

  @Prop({ default: 0, type: Number })
  totalTransferred: number;

  @Prop({ default: () => new Date().toISOString() })
  lastMovement: string;

  @Prop({
    type: String,
    enum: ['active', 'closed', 'pending'],
    default: 'active',
  })
  status: 'active' | 'closed' | 'pending';
}

export type BarStockDocument = BarStock & Document;
export const BarStockSchema = SchemaFactory.createForClass(BarStock);

// Compound index for finding product in specific bar/event
BarStockSchema.index({ barId: 1, productId: 1 }, { unique: true });
BarStockSchema.index({ eventId: 1, barId: 1, productId: 1 });

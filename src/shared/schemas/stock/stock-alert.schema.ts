import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'stock_alerts' })
export class StockAlert {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ index: true })
  barId?: string;

  @Prop()
  barName?: string;

  @Prop({
    type: String,
    enum: ['low_stock', 'out_of_stock', 'over_stock', 'negative_stock'],
    required: true,
  })
  type: 'low_stock' | 'out_of_stock' | 'over_stock' | 'negative_stock';

  @Prop({ required: true, type: Number })
  currentStock: number;

  @Prop({ required: true, type: Number })
  threshold: number;

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  acknowledged: boolean;

  @Prop()
  acknowledgedBy?: string;

  @Prop()
  acknowledgedAt?: string;
}

export type StockAlertDocument = StockAlert & Document;
export const StockAlertSchema = SchemaFactory.createForClass(StockAlert);

// Indexes
StockAlertSchema.index({ type: 1, severity: 1 });
StockAlertSchema.index({ acknowledged: 1, createdAt: -1 });
StockAlertSchema.index({ productId: 1, createdAt: -1 });

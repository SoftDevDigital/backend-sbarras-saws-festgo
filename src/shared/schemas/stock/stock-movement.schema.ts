import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'stock_movements' })
export class StockMovement {
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

  @Prop({ index: true })
  eventId?: string;

  @Prop()
  eventName?: string;

  @Prop({
    type: String,
    enum: ['initial', 'replenish', 'transfer', 'sale', 'adjustment', 'final'],
    required: true,
  })
  type: 'initial' | 'replenish' | 'transfer' | 'sale' | 'adjustment' | 'final';

  @Prop({ required: true, type: Number })
  quantity: number;

  @Prop({ required: true, type: Number })
  previousQuantity: number;

  @Prop({ required: true, type: Number })
  newQuantity: number;

  @Prop()
  reason?: string;

  @Prop({ index: true })
  ticketId?: string;

  @Prop({ required: true })
  recordedBy: string;

  @Prop({ required: true })
  recordedByName: string;
}

export type StockMovementDocument = StockMovement & Document;
export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

// Indexes for reports and dashboard
StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ barId: 1, createdAt: -1 });
StockMovementSchema.index({ eventId: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1, createdAt: -1 });

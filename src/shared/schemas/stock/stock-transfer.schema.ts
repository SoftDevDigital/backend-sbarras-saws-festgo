import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'stock_transfers' })
export class StockTransfer {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, index: true })
  fromBarId: string;

  @Prop({ required: true })
  fromBarName: string;

  @Prop({ required: true, index: true })
  toBarId: string;

  @Prop({ required: true })
  toBarName: string;

  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true })
  eventName: string;

  @Prop({ required: true, type: Number })
  quantity: number;

  @Prop()
  reason?: string;

  @Prop({ required: true })
  requestedBy: string;

  @Prop({ required: true })
  requestedByName: string;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvedByName?: string;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

export type StockTransferDocument = StockTransfer & Document;
export const StockTransferSchema = SchemaFactory.createForClass(StockTransfer);

// Indexes
StockTransferSchema.index({ eventId: 1, createdAt: -1 });
StockTransferSchema.index({ fromBarId: 1, toBarId: 1, status: 1 });
StockTransferSchema.index({ status: 1, createdAt: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true })
export class TicketItem {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, type: Number })
  quantity: number;

  @Prop({ required: true, type: Number })
  unitPrice: number;

  @Prop({ required: true, type: Number })
  taxRate: number;

  @Prop({ required: true, type: Number })
  subtotal: number;

  @Prop({ required: true, type: Number })
  tax: number;

  @Prop({ required: true, type: Number })
  total: number;
}

export type TicketItemDocument = TicketItem & Document;
export const TicketItemSchema = SchemaFactory.createForClass(TicketItem);

@Schema({ timestamps: true, collection: 'tickets' })
export class Ticket {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true, index: true })
  barId: string;

  @Prop({ required: true })
  barName: string;

  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true })
  eventName: string;

  /** Snapshot de lista de precios usada en la venta (armonía con reportes) */
  @Prop({ index: true })
  priceListId?: string;

  @Prop()
  priceListName?: string;

  @Prop({
    type: String,
    enum: ['open', 'paid', 'cancelled', 'refunded'],
    default: 'open',
  })
  status: 'open' | 'paid' | 'cancelled' | 'refunded';

  @Prop({
    type: String,
    enum: ['cash', 'card', 'transfer', 'administrator', 'dj'],
  })
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'administrator' | 'dj';

  @Prop({ required: true, type: Number, default: 0 })
  subtotal: number;

  @Prop({ required: true, type: Number, default: 0 })
  totalTax: number;

  @Prop({ required: true, type: Number, default: 0 })
  total: number;

  @Prop({ type: Number })
  paidAmount?: number;

  @Prop({ type: Number })
  changeAmount?: number;

  @Prop({ type: [TicketItemSchema], default: [] })
  items: TicketItem[];

  @Prop()
  notes?: string;

  @Prop({ default: false })
  printed: boolean;
}

export type TicketDocument = Ticket & Document;
export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Indexes for reports and dashboard
TicketSchema.index({ eventId: 1, createdAt: -1 });
TicketSchema.index({ barId: 1, createdAt: -1 });
TicketSchema.index({ userId: 1, createdAt: -1 });
TicketSchema.index({ status: 1 });

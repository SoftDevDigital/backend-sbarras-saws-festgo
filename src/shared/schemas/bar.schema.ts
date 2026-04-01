import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'bars' })
export class Bar {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true })
  printer: string;

  /** Lista de precios asignada a la barra (opcional). Si no hay, se usa el precio del catálogo global del producto. */
  @Prop({ index: true })
  priceListId?: string;

  @Prop({ type: String, enum: ['active', 'closed'], default: 'active' })
  status: 'active' | 'closed';
}

export type BarDocument = Bar & Document;
export const BarSchema = SchemaFactory.createForClass(Bar);

// Indexes
BarSchema.index({ eventId: 1, name: 1 }, { unique: true });
BarSchema.index({ status: 1 });

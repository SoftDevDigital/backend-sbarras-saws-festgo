import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'events' })
export class Event {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  startDate: string;

  @Prop({ required: true })
  endDate: string;

  @Prop({ type: String, enum: ['active', 'closed'], default: 'active' })
  status: 'active' | 'closed';
}

export type EventDocument = Event & Document;
export const EventSchema = SchemaFactory.createForClass(Event);

// Indexes
EventSchema.index({ status: 1, startDate: -1 });

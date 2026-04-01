import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'expenses' })
export class Expense {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({
    type: String,
    enum: ['supplies', 'staff', 'equipment', 'other'],
    default: 'other',
  })
  type: 'supplies' | 'staff' | 'equipment' | 'other';

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true })
  description: string;
}

export type ExpenseDocument = Expense & Document;
export const ExpenseSchema = SchemaFactory.createForClass(Expense);

// Indexes
ExpenseSchema.index({ eventId: 1, createdAt: -1 });
ExpenseSchema.index({ type: 1, createdAt: -1 });

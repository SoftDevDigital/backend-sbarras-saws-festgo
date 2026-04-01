import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'employee_assignments' })
export class EmployeeAssignment {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true, index: true })
  barId: string;

  @Prop({ required: true })
  shift: string;

  @Prop({ default: () => new Date().toISOString() })
  assignedAt: string;

  @Prop({
    required: true,
    default: 'active',
    enum: ['active', 'completed', 'cancelled'],
  })
  status: 'active' | 'completed' | 'cancelled';
}

export type EmployeeAssignmentDocument = EmployeeAssignment & Document;
export const EmployeeAssignmentSchema =
  SchemaFactory.createForClass(EmployeeAssignment);

// Compound indexes for common queries
EmployeeAssignmentSchema.index({ eventId: 1, barId: 1 });
EmployeeAssignmentSchema.index({ userId: 1, eventId: 1, shift: 1 });
EmployeeAssignmentSchema.index({ userId: 1, status: 1 });

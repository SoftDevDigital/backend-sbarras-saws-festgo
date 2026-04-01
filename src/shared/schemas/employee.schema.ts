import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'employees' })
export class Employee {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  userId: string; // Vínculo con el usuario de auth

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  role: 'admin' | 'manager' | 'bartender' | 'waiter' | 'cashier';

  @Prop({ required: true, default: 'active' })
  status: 'active' | 'inactive' | 'suspended';

  @Prop({ index: true })
  eventId?: string; // Vínculo con el evento actual (si aplica)

  @Prop({ index: true })
  barId?: string; // Vínculo con la barra asignada (si aplica)

  @Prop({ type: Object })
  permissions?: Record<string, boolean>;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export type EmployeeDocument = Employee & Document;
export const EmployeeSchema = SchemaFactory.createForClass(Employee);

// Indexación para búsquedas rápidas
EmployeeSchema.index({ userId: 1 });
EmployeeSchema.index({ eventId: 1, barId: 1 });
EmployeeSchema.index({ email: 1 }, { unique: true });

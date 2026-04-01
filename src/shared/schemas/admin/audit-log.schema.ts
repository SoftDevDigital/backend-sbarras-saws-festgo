import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  userRole: string;

  @Prop({ required: true, index: true })
  action: string; // CREATE, UPDATE, DELETE, etc.

  @Prop({ required: true, index: true })
  resource: string; // expense, product, etc.

  @Prop({ required: true })
  resourceId: string;

  @Prop({ type: Object })
  changes: {
    before?: any;
    after: any;
  };

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export type AuditLogDocument = AuditLog & Document;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

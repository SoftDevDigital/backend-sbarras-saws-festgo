import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'backups' })
export class Backup {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, enum: ['full', 'incremental', 'manual'] })
  type: string;

  @Prop({
    required: true,
    default: 'pending',
    enum: ['pending', 'completed', 'failed'],
  })
  status: string;

  @Prop()
  downloadUrl?: string;

  @Prop()
  createdBy: string;
}

export type BackupDocument = Backup & Document;
export const BackupSchema = SchemaFactory.createForClass(Backup);

@Schema({ timestamps: true, collection: 'admin_notifications' })
export class AdminNotification {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  type: string; // email, push, system

  @Prop({ required: true })
  recipient: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    required: true,
    default: 'pending',
    enum: ['pending', 'sent', 'failed'],
  })
  status: string;

  @Prop({
    required: true,
    default: 'medium',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  priority: string;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: Date })
  sentAt?: Date;

  @Prop()
  createdBy: string;
}

export type AdminNotificationDocument = AdminNotification & Document;
export const AdminNotificationSchema =
  SchemaFactory.createForClass(AdminNotification);

@Schema({ timestamps: true, collection: 'data_exports' })
export class DataExport {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  type: string; // csv, excel, json

  @Prop({ required: true })
  entity: string; // tickets, products, etc.

  @Prop({ type: Object })
  filters: any;

  @Prop({
    required: true,
    default: 'pending',
    enum: ['pending', 'completed', 'failed'],
  })
  status: string;

  @Prop()
  downloadUrl?: string;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop()
  createdBy: string;
}

export type DataExportDocument = DataExport & Document;
export const DataExportSchema = SchemaFactory.createForClass(DataExport);

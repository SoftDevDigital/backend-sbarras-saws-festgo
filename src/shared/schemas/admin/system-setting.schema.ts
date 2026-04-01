import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'system_settings' })
export class SystemSetting {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ required: true, index: true, unique: true })
  key: string;

  @Prop({ required: true, type: Object })
  value: any;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isEditable: boolean;

  @Prop()
  updatedBy: string;
}

export type SystemSettingDocument = SystemSetting & Document;
export const SystemSettingSchema = SchemaFactory.createForClass(SystemSetting);

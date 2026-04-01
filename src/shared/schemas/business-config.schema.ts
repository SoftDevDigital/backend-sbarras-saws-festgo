import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'business_config' })
export class BusinessConfig {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  businessName: string;

  @Prop({ required: true })
  businessAddress: string;

  @Prop({ required: true })
  businessPhone: string;

  @Prop({ required: true })
  businessEmail: string;

  @Prop({ required: true })
  businessTaxId: string;

  @Prop({ required: true })
  businessWebsite: string;

  @Prop({ required: true, default: 'ARS' })
  currency: string;

  @Prop({ required: true, default: 10 })
  taxRate: number;

  @Prop({ required: true })
  thankYouMessage: string;

  @Prop({ required: true })
  receiptFooter: string;

  @Prop({
    type: Object,
    default: { paperWidth: 80, fontSize: 12, fontFamily: 'monospace' },
  })
  printerSettings: {
    paperWidth: number;
    fontSize: number;
    fontFamily: string;
  };

  @Prop({ default: true })
  active: boolean;
}

export type BusinessConfigDocument = BusinessConfig & Document;
export const BusinessConfigSchema =
  SchemaFactory.createForClass(BusinessConfig);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, enum: ['admin', 'bartender'], default: 'bartender' })
  role: 'admin' | 'bartender';

  @Prop()
  document?: string;

  @Prop()
  contact?: string;

  @Prop({
    type: String,
    enum: ['bartender', 'manager', 'cashier'],
    default: 'bartender',
  })
  employeeRole?: 'bartender' | 'manager' | 'cashier';
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PriceList,
  PriceListSchema,
} from '../shared/schemas/price-list.schema';
import { Bar, BarSchema } from '../shared/schemas/bar.schema';
import { Product, ProductSchema } from '../shared/schemas/product.schema';
import { PriceListService } from './services/price-list.service';
import { PriceListController } from './controllers/price-list.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PriceList.name, schema: PriceListSchema },
      { name: Bar.name, schema: BarSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    AuthModule,
  ],
  controllers: [PriceListController],
  providers: [PriceListService],
  exports: [PriceListService],
})
export class PriceListsModule {}

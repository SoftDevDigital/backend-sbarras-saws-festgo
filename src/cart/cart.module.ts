import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartController } from './controllers/cart.controller';
import { CartService } from './services/cart.service';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { TicketsModule } from '../tickets/tickets.module';
import { Product, ProductSchema } from '../shared/schemas/product.schema';
import { BarsModule } from '../bars/bars.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    SharedModule,
    AuthModule,
    ProductsModule,
    TicketsModule,
    BarsModule,
    PriceListsModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

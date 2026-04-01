import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';
import { Product, ProductSchema } from '../shared/schemas/product.schema';
import { Ticket, TicketSchema } from '../shared/schemas/ticket.schema';
import { AuthModule } from '../auth/auth.module';
import { BarsModule } from '../bars/bars.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Ticket.name, schema: TicketSchema },
    ]),
    AuthModule,
    BarsModule,
    PriceListsModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductsModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TicketController } from './controllers/ticket.controller';
import { TicketService } from './services/ticket.service';
import { Ticket, TicketSchema } from '../shared/schemas/ticket.schema';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { BarsModule } from '../bars/bars.module';
import { EventsModule } from '../events/events.module';
import { StockModule } from '../stock/stock.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema }]),
    AuthModule,
    ProductsModule,
    BarsModule,
    EventsModule,
    StockModule,
    PriceListsModule,
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketsModule {}

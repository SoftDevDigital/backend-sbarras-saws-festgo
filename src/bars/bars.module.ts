import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BarController } from './controllers/bar.controller';
import { BarService } from './services/bar.service';
import { Bar, BarSchema } from '../shared/schemas/bar.schema';
import { Ticket, TicketSchema } from '../shared/schemas/ticket.schema';
import { Event, EventSchema } from '../shared/schemas/event.schema';
import { AuthModule } from '../auth/auth.module';
import { PriceListsModule } from '../price-lists/price-lists.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bar.name, schema: BarSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    AuthModule,
    PriceListsModule,
  ],
  controllers: [BarController],
  providers: [BarService],
  exports: [BarService],
})
export class BarsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { BarsModule } from './bars/bars.module';
import { ProductsModule } from './products/products.module';
import { EmployeesModule } from './employees/employees.module'; // DEPRECADO: Ahora se usa AuthModule directamente
import { TicketsModule } from './tickets/tickets.module';
import { StockModule } from './stock/stock.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AdminModule } from './admin/admin.module';
import { CartModule } from './cart/cart.module';
import { PriceListsModule } from './price-lists/price-lists.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    SharedModule,
    AuthModule,
    EventsModule,
    BarsModule,
    ProductsModule,
    EmployeesModule, // DEPRECADO: Mantener temporalmente para asignaciones, migrar a AuthModule
    TicketsModule,
    StockModule,
    ExpensesModule,
    AdminModule,
    CartModule,
    PriceListsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockController } from './controllers/stock.controller';
import { StockService } from './services/stock.service';
import {
  GlobalStock,
  GlobalStockSchema,
} from '../shared/schemas/stock/global-stock.schema';
import {
  BarStock,
  BarStockSchema,
} from '../shared/schemas/stock/bar-stock.schema';
import {
  StockMovement,
  StockMovementSchema,
} from '../shared/schemas/stock/stock-movement.schema';
import {
  StockAlert,
  StockAlertSchema,
} from '../shared/schemas/stock/stock-alert.schema';
import {
  StockTransfer,
  StockTransferSchema,
} from '../shared/schemas/stock/stock-transfer.schema';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { BarsModule } from '../bars/bars.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GlobalStock.name, schema: GlobalStockSchema },
      { name: BarStock.name, schema: BarStockSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: StockAlert.name, schema: StockAlertSchema },
      { name: StockTransfer.name, schema: StockTransferSchema },
    ]),
    AuthModule,
    EventsModule,
    BarsModule,
    ProductsModule,
  ],
  controllers: [StockController],
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}

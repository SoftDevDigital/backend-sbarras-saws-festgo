import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessConfigService } from './services/business-config.service';
import {
  BusinessConfig,
  BusinessConfigSchema,
} from './schemas/business-config.schema';
import { ThermalPrinterService } from './services/thermal-printer.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessConfig.name, schema: BusinessConfigSchema },
    ]),
  ],
  providers: [BusinessConfigService, ThermalPrinterService],
  exports: [BusinessConfigService, ThermalPrinterService],
})
export class SharedModule {}

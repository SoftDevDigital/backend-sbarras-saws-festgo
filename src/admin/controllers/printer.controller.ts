import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ThermalPrinterService,
  PrinterStatus,
  PrinterConfig,
} from '../../shared/services/thermal-printer.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('printer')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('admin/printer')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('admin')
export class PrinterController {
  private readonly logger = new Logger(PrinterController.name);

  constructor(private readonly thermalPrinterService: ThermalPrinterService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Estado de impresoras configuradas',
    description:
      'Lista de impresoras con flag `connected`, totales y timestamp. Errores pueden devolverse con `success: false` en payload.',
  })
  @ApiResponse({ status: 200, description: 'Estado agregado o error en body.' })
  async getPrintersStatus(): Promise<{
    success: boolean;
    printers?: PrinterStatus[];
    totalConnected?: number;
    totalConfigured?: number;
    timestamp: string;
    error?: string;
  }> {
    this.logger.log(
      'Getting printers status',
      'PrinterController.getPrintersStatus',
    );

    try {
      const statuses = await this.thermalPrinterService.getPrintersStatus();
      return {
        success: true,
        printers: statuses,
        totalConnected: statuses.filter((p) => p.connected).length,
        totalConfigured: statuses.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting printers status:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('available')
  @ApiOperation({
    summary: 'Impresoras USB disponibles en el host',
    description: 'Descubrimiento de dispositivos para asociar vendor/product ID.',
  })
  @ApiResponse({ status: 200, description: 'Listado o error en payload.' })
  async getAvailablePrinters(): Promise<{
    success: boolean;
    printers?: PrinterConfig[];
    timestamp: string;
    error?: string;
  }> {
    this.logger.log(
      'Getting available printers',
      'PrinterController.getAvailablePrinters',
    );

    try {
      const printers = await this.thermalPrinterService.getAvailablePrinters();
      return {
        success: true,
        printers,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting available printers:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test')
  @ApiOperation({
    summary: 'Imprimir página de prueba',
    description: 'Body opcional `{ printerId }`; si se omite usa la impresora por defecto.',
  })
  @ApiResponse({ status: 200, description: 'Resultado de impresión.' })
  async printTestPage(@Body() body: { printerId?: string }) {
    this.logger.log(
      `Printing test page on printer ${body.printerId || 'default'}`,
      'PrinterController.printTestPage',
    );

    try {
      const success = await this.thermalPrinterService.printTestPage(
        body.printerId,
      );
      return {
        success,
        message: success
          ? 'Test page printed successfully'
          : 'Failed to print test page',
        printerId: body.printerId || 'default',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error printing test page:', error);
      return {
        success: false,
        error: error.message,
        printerId: body.printerId || 'default',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test/:printerId')
  @ApiOperation({
    summary: 'Página de prueba en impresora concreta',
    description: 'Mismo efecto que POST `/test` pero el ID va en la ruta.',
  })
  @ApiResponse({ status: 200, description: 'Resultado de impresión.' })
  async printTestPageById(@Param('printerId') printerId: string) {
    this.logger.log(
      `Printing test page on printer ${printerId}`,
      'PrinterController.printTestPageById',
    );

    try {
      const success = await this.thermalPrinterService.printTestPage(printerId);
      return {
        success,
        message: success
          ? 'Test page printed successfully'
          : 'Failed to print test page',
        printerId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error printing test page on printer ${printerId}:`,
        error,
      );
      return {
        success: false,
        error: error.message,
        printerId,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('reconnect')
  @ApiOperation({
    summary: 'Reconectar todas las impresoras',
    description: 'Reintenta apertura USB/conexión según implementación del servicio.',
  })
  @ApiResponse({ status: 200, description: 'Éxito o fallo en payload.' })
  async reconnectAllPrinters() {
    this.logger.log(
      'Reconnecting all printers',
      'PrinterController.reconnectAllPrinters',
    );

    try {
      const success = await this.thermalPrinterService.reconnectPrinter();
      return {
        success,
        message: success
          ? 'All printers reconnected successfully'
          : 'Failed to reconnect printers',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error reconnecting printers:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('reconnect/:printerId')
  @ApiOperation({ summary: 'Reconectar una impresora por ID' })
  @ApiResponse({ status: 200, description: 'Éxito o fallo en payload.' })
  async reconnectPrinter(@Param('printerId') printerId: string) {
    this.logger.log(
      `Reconnecting printer ${printerId}`,
      'PrinterController.reconnectPrinter',
    );

    try {
      const success =
        await this.thermalPrinterService.reconnectPrinter(printerId);
      return {
        success,
        message: success
          ? `Printer ${printerId} reconnected successfully`
          : `Failed to reconnect printer ${printerId}`,
        printerId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error reconnecting printer ${printerId}:`, error);
      return {
        success: false,
        error: error.message,
        printerId,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('add')
  @ApiOperation({
    summary: 'Registrar configuración de impresora',
    description:
      '`name`, `vendorId`, `productId` (USB), opcional `barId`, `active`. Devuelve `printerId` generado.',
  })
  @ApiResponse({ status: 200, description: 'Configuración guardada o error en payload.' })
  async addPrinter(
    @Body()
    body: {
      name: string;
      vendorId: number;
      productId: number;
      barId?: string;
      active: boolean;
    },
  ) {
    this.logger.log(
      `Adding new printer: ${body.name}`,
      'PrinterController.addPrinter',
    );

    try {
      const printerId = await this.thermalPrinterService.addPrinterConfig(body);
      return {
        success: true,
        message: 'Printer configuration added successfully',
        printerId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error adding printer configuration:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('remove/:printerId')
  @ApiOperation({ summary: 'Quitar configuración de impresora', description: 'Elimina por `printerId`.' })
  @ApiResponse({ status: 200, description: 'Eliminado o error en payload.' })
  async removePrinter(@Param('printerId') printerId: string) {
    this.logger.log(
      `Removing printer ${printerId}`,
      'PrinterController.removePrinter',
    );

    try {
      const success =
        await this.thermalPrinterService.removePrinterConfig(printerId);
      return {
        success,
        message: success
          ? `Printer ${printerId} removed successfully`
          : `Failed to remove printer ${printerId}`,
        printerId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error removing printer ${printerId}:`, error);
      return {
        success: false,
        error: error.message,
        printerId,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BusinessConfig,
  BusinessConfigDocument,
} from '../schemas/business-config.schema';
import {
  IBusinessConfig,
  IBusinessConfigCreate,
  IBusinessConfigUpdate,
} from '../interfaces/business-config.interface';

@Injectable()
export class BusinessConfigService {
  private readonly logger = new Logger(BusinessConfigService.name);

  constructor(
    @InjectModel(BusinessConfig.name)
    private readonly businessConfigModel: Model<BusinessConfigDocument>,
  ) {}

  async getActiveConfig(): Promise<IBusinessConfig> {
    try {
      const config = await this.businessConfigModel
        .findOne({ active: true })
        .sort({ createdAt: -1 });

      if (!config) {
        this.logger.warn('No business configuration found, creating default');
        return this.createDefaultConfig();
      }

      return this.mapConfig(config);
    } catch (error) {
      this.logger.error('Error getting business configuration:', error.message);
      return this.mapConfig(this.getDefaultConfig());
    }
  }

  async updateConfig(
    configId: string,
    updateData: IBusinessConfigUpdate,
  ): Promise<IBusinessConfig> {
    try {
      const updated = await this.businessConfigModel.findByIdAndUpdate(
        configId,
        { $set: { ...updateData, updatedAt: new Date() } },
        { new: true },
      );

      if (!updated)
        throw new NotFoundException(
          `Business configuration with ID '${configId}' not found.`,
        );

      return this.mapConfig(updated);
    } catch (error) {
      this.logger.error(
        'Error updating business configuration:',
        error.message,
      );
      throw error instanceof NotFoundException
        ? error
        : new BadRequestException('Unable to update business configuration.');
    }
  }

  async createConfig(
    createData: IBusinessConfigCreate,
  ): Promise<IBusinessConfig> {
    try {
      const newConfig = new this.businessConfigModel({
        ...createData,
        active: true,
      });
      const saved = await newConfig.save();
      return this.mapConfig(saved);
    } catch (error) {
      this.logger.error(
        'Error creating business configuration:',
        error.message,
      );
      throw new BadRequestException('Unable to create business configuration.');
    }
  }

  private async createDefaultConfig(): Promise<IBusinessConfig> {
    const defaultConfig = new this.businessConfigModel(this.getDefaultConfig());
    await defaultConfig.save();
    return this.mapConfig(defaultConfig);
  }

  private getDefaultConfig(): any {
    return {
      businessName: 'Despedida de año G&G',
      businessAddress: 'Av. Principal 123, Ciudad',
      businessPhone: '+1 (555) 123-4567',
      businessEmail: 'info@groovebar.com',
      businessTaxId: 'RUC: 12345678901',
      businessWebsite: 'fest-go.com',
      currency: 'ARS',
      taxRate: 10,
      thankYouMessage: '¡Gracias por su compra!',
      receiptFooter: 'Sistema de Barras Fest-Go',
      printerSettings: {
        paperWidth: 80,
        fontSize: 12,
        fontFamily: 'monospace',
      },
      active: true,
    };
  }

  private mapConfig(config: BusinessConfigDocument | any): IBusinessConfig {
    return {
      id: config._id || 'default',
      businessName: config.businessName,
      businessAddress: config.businessAddress,
      businessPhone: config.businessPhone,
      businessEmail: config.businessEmail,
      businessTaxId: config.businessTaxId,
      businessWebsite: config.businessWebsite,
      currency: config.currency,
      taxRate: config.taxRate,
      thankYouMessage: config.thankYouMessage,
      receiptFooter: config.receiptFooter,
      printerSettings: config.printerSettings || {
        paperWidth: 80,
        fontSize: 12,
        fontFamily: 'monospace',
      },
      createdAt: config['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: config['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }
}

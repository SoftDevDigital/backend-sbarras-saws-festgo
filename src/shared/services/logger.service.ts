import { Injectable, LoggerService, LogLevel } from '@nestjs/common';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private readonly isDevelopment = process.env.NODE_ENV === 'development';
  private readonly isProduction = process.env.NODE_ENV === 'production';

  log(message: any, context?: string) {
    if (this.isDevelopment) {
      console.log(`📝 [${context || 'LOG'}] ${message}`);
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (this.isDevelopment || this.isProduction) {
      console.error(`❌ [${context || 'ERROR'}] ${message}`);
      if (trace && this.isDevelopment) {
        console.error(`📍 Trace: ${trace}`);
      }
    }
  }

  warn(message: any, context?: string) {
    if (this.isDevelopment || this.isProduction) {
      console.warn(`⚠️ [${context || 'WARN'}] ${message}`);
    }
  }

  debug(message: any, context?: string) {
    if (this.isDevelopment) {
      console.debug(`🐛 [${context || 'DEBUG'}] ${message}`);
    }
  }

  verbose(message: any, context?: string) {
    if (this.isDevelopment) {
      console.log(`💬 [${context || 'VERBOSE'}] ${message}`);
    }
  }

  // Métodos específicos para diferentes tipos de operaciones
  success(message: any, context?: string) {
    if (this.isDevelopment) {
      console.log(`✅ [${context || 'SUCCESS'}] ${message}`);
    }
  }

  info(message: any, context?: string) {
    if (this.isDevelopment) {
      console.log(`ℹ️ [${context || 'INFO'}] ${message}`);
    }
  }

  // Método para loggear operaciones de API de manera más limpia
  apiCall(method: string, url: string, status: number, message?: string) {
    const emoji = this.getStatusEmoji(status);
    if (this.isDevelopment) {
      if (status >= 400) {
        console.log(
          `${emoji} ${method} ${url} - ${status}${message ? ` - ${message}` : ''}`,
        );
      } else {
        console.log(`${emoji} ${method} ${url} - ${status}`);
      }
    }
  }

  private getStatusEmoji(status: number): string {
    if (status >= 200 && status < 300) return '✅';
    if (status >= 300 && status < 400) return '🔄';
    if (status >= 400 && status < 500) return '⚠️';
    if (status >= 500) return '❌';
    return '📡';
  }
}

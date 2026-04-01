import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { appConfig, validateConfig } from './shared/config/app.config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { setupSwagger } from './swagger.setup';
import * as dotenv from 'dotenv';
import { Server } from 'net';

// Cargar variables de entorno
dotenv.config();

// Función para verificar si un puerto está disponible
const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = new Server();

    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });

    server.on('error', () => {
      resolve(false);
    });
  });
};

// Función para encontrar un puerto disponible
const findAvailablePort = async (
  startPort: number,
  maxAttempts = 10,
): Promise<number> => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);

    if (available) {
      return port;
    }

    console.log(`Port ${port} is in use, trying ${port + 1}...`);
  }

  throw new Error(
    `Could not find an available port after ${maxAttempts} attempts`,
  );
};

async function bootstrap() {
  // Validar configuración
  validateConfig();

  const app = await NestFactory.create(AppModule);

  // MongoDB se inicializa automáticamente al importar MongooseModule en AppModule

  // Habilitar CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (ej: mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Permitir localhost:3000 y el origen configurado en variables de entorno
      const allowedOrigins = [
        'http://localhost:3003',
        'http://127.0.0.1:3003',
        'https://festgo-barras.com',
        'https://www.festgo-barras.com',
        'http://festgo-barras.com',
        appConfig.corsOrigin,
      ].filter((origin) => origin && origin !== '*');

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // En desarrollo, permitir cualquier origen localhost
      if (appConfig.nodeEnv === 'development' && origin.includes('localhost')) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Configurar validación global con mensajes específicos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          value: error.value,
          constraints: error.constraints,
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: result,
          statusCode: 400,
        });
      },
    }),
  );

  // Configurar filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // OpenAPI / Swagger UI (documentación para frontend; no cambia la lógica de negocio)
  setupSwagger(app, { port: appConfig.port, env: appConfig.nodeEnv });

  try {
    // Intentar usar el puerto configurado primero
    const isDefaultPortAvailable = await isPortAvailable(appConfig.port);

    if (isDefaultPortAvailable) {
      await app.listen(appConfig.port);
      console.log(
        `Application is running on: http://localhost:${appConfig.port}`,
      );
      console.log(
        `Swagger UI (OpenAPI): http://localhost:${appConfig.port}/docs`,
      );
    } else {
      console.log(
        `Port ${appConfig.port} is in use, searching for alternative port...`,
      );
      const availablePort = await findAvailablePort(appConfig.port);
      await app.listen(availablePort);
      console.log(
        `Application is running on: http://localhost:${availablePort}`,
      );
      console.log(
        `Swagger UI (OpenAPI): http://localhost:${availablePort}/docs`,
      );
      console.log(
        `Original port ${appConfig.port} was occupied, using port ${availablePort}`,
      );
    }
  } catch (error) {
    console.error('Error starting application:', error.message);
    process.exit(1);
  }

  console.log(`Environment: ${appConfig.nodeEnv}`);
  console.log(`CORS Origin: ${appConfig.corsOrigin}`);
  console.log(
    `MongoDB Database: ${process.env.MONGODB_URI ? 'Connected' : 'Missing MONGODB_URI'}`,
  );
}
// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // No hacer process.exit() para mantener la app funcionando
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // No hacer process.exit() para mantener la app funcionando
});

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});

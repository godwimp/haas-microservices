import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Get configurations
  const port = configService.get<number>('app.port');
  const apiPrefix = configService.get<string>('app.apiPrefix');
  const corsOrigin = configService.get<string>('app.corsOrigin');
  const swaggerEnabled = configService.get<boolean>('swagger.enabled');
  const swaggerPath = configService.get<string>('swagger.path');

  // Enable CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Class serializer for excluding fields (like password)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger Documentation
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Urbansolv API')
      .setDescription('Urbansolv NestJS Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document, {
      useGlobalPrefix: true,
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    console.log(`\n📚 Swagger documentation available at: http://localhost:${port}/api/${swaggerPath}\n`);
  }

  await app.listen(port);

  console.log(`\n🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`🌍 Environment: ${configService.get<string>('app.env')}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🏓 Ping endpoint: http://localhost:${port}/ping\n`);

}

bootstrap();

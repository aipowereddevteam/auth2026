import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security Middleware
  app.use(helmet());
  app.use(cookieParser()); // <--- Enable Cookies
  app.enableCors({
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true, // Allow Cookies
  });

  // Global Validation (Strips malicious extra fields)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 1. Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Monolith API')
    .setDescription('The Monolith API description')
    .setVersion('1.0')
    .addTag('users')
    .build();

  // 2. Create the document
  const document = SwaggerModule.createDocument(app, config);

  // 3. Setup the route (http://localhost:3000/api)
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();

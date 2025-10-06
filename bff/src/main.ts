import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS para PWA y AVI_LAB
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:4300',
      'http://127.0.0.1:4300',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      process.env.PWA_URL || 'http://localhost:4200'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });
  
  // Validation pipe global
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Conductores AVI API')
    .setDescription('Voice Intelligence & Resilience Scoring API')
    .setVersion('1.0')
    .addTag('voice', 'Voice analysis and scoring endpoints')
    .addTag('health', 'Health check endpoints')
    .addTag('odoo', 'Odoo quotes integration endpoints')
    .addTag('gnv', 'GNV ingestion health endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Conductores BFF running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/docs`);
  console.log(`🎯 Ready to receive requests from PWA: ${process.env.PWA_URL || 'http://localhost:4200'}`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';

async function bootstrap() {
  const app = (await NestFactory.create(AppModule)).setGlobalPrefix('api');
  const configService = app.get(ConfigService);
  const enviroment = configService.get<string>('NODE_ENV');

  const config = new DocumentBuilder()
    .setTitle('Ticket Já API')
    .setDescription(
      'Robust ticket-selling REST API built with NestJS, Prisma, and PostgreSQL.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  if (enviroment !== 'production') {
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalFilters(new PrismaClientExceptionFilter());
  app.useGlobalFilters(new ThrottlerExceptionFilter());
  app.use(helmet());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((e) => {
  console.log(e);
});

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";
import * as dotenv from "dotenv";
import { AppModule } from "./app.module";
import { createCorsOptions, validateEnvironment } from "./config/app.config";

async function bootstrap() {
  dotenv.config();
  const config = validateEnvironment(process.env);

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors(createCorsOptions(config.cors));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("HomePedia API")
    .setDescription("Backend API for HomePedia exploratory data endpoints.")
    .setVersion("1.0")
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  await app.listen(config.port);
}

bootstrap();

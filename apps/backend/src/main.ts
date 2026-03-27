import { NestFactory } from "@nestjs/core";
import { resolve } from "node:path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";
import * as dotenv from "dotenv";
import { AppModule } from "./app.module";
import { createValidationPipe } from "./common/validation";
import { createCorsOptions, validateEnvironment } from "./config/app.config";
import { HttpExceptionFilter } from "./filters/http-exception.filter";

function loadEnvironment() {
  const envPaths = [
    resolve(__dirname, "..", "..", "..", ".env"),
    resolve(__dirname, "..", ".env")
  ];

  for (const path of envPaths) {
    dotenv.config({ path, override: false });
  }
}

async function bootstrap() {
  loadEnvironment();
  const config = validateEnvironment(process.env);

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors(createCorsOptions(config.cors));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

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

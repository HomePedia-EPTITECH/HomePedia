import { NestFactory } from "@nestjs/core";
import { resolve } from "node:path";
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
  app.enableCors(createCorsOptions(config.cors));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.port);
}

bootstrap();

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import "reflect-metadata";
import * as dotenv from "dotenv";
import { AppModule } from "./app.module";
import { createValidationPipe } from "./common/validation";
import { createCorsOptions, validateEnvironment } from "./config/app.config";
import { createSwaggerDocument } from "./config/swagger";
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

  const app = await NestFactory.create(AppModule, {
    logger: false
  });

  app.setGlobalPrefix("api");
  app.enableCors(createCorsOptions(config.cors));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  const openApiDocument = createSwaggerDocument(app);
  const outputPath = resolve(__dirname, "..", "openapi.json");

  await writeFile(outputPath, `${JSON.stringify(openApiDocument, null, 2)}\n`, "utf-8");
  await app.close();

  process.stdout.write(`[openapi] Generated ${outputPath}\n`);
}

bootstrap();

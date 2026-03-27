import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const swaggerConfig = new DocumentBuilder()
    .setTitle("HomePedia API")
    .setDescription("Backend API for HomePedia exploratory data endpoints.")
    .setVersion("1.0")
    .build();

  return SwaggerModule.createDocument(app, swaggerConfig);
}

export function setupSwagger(app: INestApplication): OpenAPIObject {
  const document = createSwaggerDocument(app);
  SwaggerModule.setup("api/docs", app, document);
  return document;
}

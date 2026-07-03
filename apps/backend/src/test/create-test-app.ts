import { INestApplication, Provider, Type } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { createValidationPipe } from "../common/validation";
import { HttpExceptionFilter } from "../filters/http-exception.filter";

export async function createTestApp(
  controller: Type<unknown>,
  providers: Provider[]
): Promise<{ app: INestApplication; module: TestingModule }> {
  const module = await Test.createTestingModule({
    controllers: [controller],
    providers
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  return { app, module };
}

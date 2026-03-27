import { BadRequestException, ValidationPipe, ValidationPipeOptions } from "@nestjs/common";
import { ValidationError } from "class-validator";

export function createValidationPipe(): ValidationPipe {
  const options: ValidationPipeOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) =>
      new BadRequestException({
        message: "Validation failed",
        details: flattenValidationErrors(errors)
      })
  };

  return new ValidationPipe(options);
}

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => collectValidationMessages(error));
}

function collectValidationMessages(error: ValidationError): string[] {
  const currentMessages = Object.values(error.constraints ?? {});
  const nestedMessages = (error.children ?? []).flatMap((child) =>
    collectValidationMessages(child)
  );

  return [...currentMessages, ...nestedMessages];
}

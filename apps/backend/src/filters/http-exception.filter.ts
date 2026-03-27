import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  details?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<{
      status: (code: number) => { json: (body: ErrorBody) => void };
    }>();
    const request = context.getRequest<{ url: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorBody = this.buildErrorBody(exception, request.url, status);
    response.status(status).json(errorBody);
  }

  private buildErrorBody(
    exception: unknown,
    path: string,
    statusCode: number
  ): ErrorBody {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode,
        error: this.formatStatusLabel(statusCode),
        message: "Internal server error",
        path,
        timestamp: new Date().toISOString()
      };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === "string") {
      return {
        statusCode,
        error: this.formatStatusLabel(statusCode),
        message:
          statusCode === HttpStatus.BAD_REQUEST
            ? "Validation failed"
            : exceptionResponse,
        path,
        timestamp: new Date().toISOString(),
        ...(statusCode === HttpStatus.BAD_REQUEST
          ? { details: [exceptionResponse] }
          : {})
      };
    }

    const responseObject = exceptionResponse as Record<string, unknown>;
    const message = this.extractMessage(responseObject, statusCode);
    const details = this.extractDetails(responseObject, statusCode);

    return {
      statusCode,
      error: this.extractErrorLabel(responseObject, statusCode),
      message,
      path,
      timestamp: new Date().toISOString(),
      ...(details === undefined ? {} : { details })
    };
  }

  private extractMessage(
    responseObject: Record<string, unknown>,
    statusCode: number
  ): string {
    const message = responseObject.message;

    if (typeof message === "string") {
      return statusCode === HttpStatus.BAD_REQUEST
        ? "Validation failed"
        : message;
    }

    if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
      return statusCode === HttpStatus.BAD_REQUEST
        ? "Validation failed"
        : message.join(", ");
    }

    return HttpStatus[statusCode] ?? "Error";
  }

  private extractDetails(
    responseObject: Record<string, unknown>,
    statusCode: number
  ): unknown {
    if ("details" in responseObject) {
      return responseObject.details;
    }

    if (statusCode === HttpStatus.BAD_REQUEST && typeof responseObject.message === "string") {
      return [responseObject.message];
    }

    if (
      Array.isArray(responseObject.message) &&
      responseObject.message.every((item) => typeof item === "string")
    ) {
      return responseObject.message;
    }

    return undefined;
  }

  private extractErrorLabel(
    responseObject: Record<string, unknown>,
    statusCode: number
  ): string {
    const error = responseObject.error;
    return typeof error === "string" ? error : this.formatStatusLabel(statusCode);
  }

  private formatStatusLabel(statusCode: number): string {
    const label = HttpStatus[statusCode];
    if (typeof label !== "string") {
      return "Error";
    }

    return label
      .toLowerCase()
      .split("_")
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }
}

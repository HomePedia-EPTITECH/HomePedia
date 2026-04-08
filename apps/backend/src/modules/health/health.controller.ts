import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";
import { ApiErrorResponse } from "../../models/api-error.model";
import { HealthResponse } from "./models/health.model";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: "Check backend and data source availability" })
  @ApiOkResponse({ type: HealthResponse })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponse })
  @Get()
  async check() {
    const result = await this.healthService.check();

    if (!result.healthy) {
      throw new ServiceUnavailableException({
        message: "Backend dependencies unavailable",
        details: {
          checks: result.response.checks
        }
      });
    }

    return result.response;
  }
}

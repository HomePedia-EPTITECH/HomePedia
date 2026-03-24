import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";
import { HealthResponse } from "../models/health.model";
import { HEALTH_BASE_PATH } from "../routes/health.routes";
import { HealthService } from "../services/health.service";

@ApiTags("health")
@Controller(HEALTH_BASE_PATH)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: "Check backend and data source availability" })
  @ApiOkResponse({ type: HealthResponse })
  @ApiServiceUnavailableResponse({ type: HealthResponse })
  @Get()
  async check() {
    const result = await this.healthService.check();

    if (!result.healthy) {
      throw new HttpException(result.response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result.response;
  }
}

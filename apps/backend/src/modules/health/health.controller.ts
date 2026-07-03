import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { HealthResponseDto } from "./dto/health-response.dto";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("api/health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Check service health" })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: "Dependencies unavailable" })
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

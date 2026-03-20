import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HEALTH_BASE_PATH } from "../routes/health.routes";

@ApiTags("health")
@Controller(HEALTH_BASE_PATH)
export class HealthController {
  @ApiOperation({ summary: "Check backend availability" })
  @Get()
  check() {
    return {
      status: "ok",
      service: "homepedia-backend",
      timestamp: new Date().toISOString()
    };
  }
}

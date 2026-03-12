import { Controller, Get } from "@nestjs/common";
import { HEALTH_BASE_PATH } from "../routes/health.routes";

@Controller(HEALTH_BASE_PATH)
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "homepedia-backend",
      timestamp: new Date().toISOString()
    };
  }
}


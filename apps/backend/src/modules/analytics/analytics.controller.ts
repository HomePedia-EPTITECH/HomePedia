import { Controller, Get } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";
import { OverviewResponseDto } from "./dto/analytics-overview-response.dto";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get overview metrics" })
  @ApiOkResponse({ type: OverviewResponseDto })
  @ApiServiceUnavailableResponse({ description: "Overview data source unavailable" })
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get("analytics/overview")
  @ApiOperation({ summary: "Get analytics overview metrics" })
  @ApiOkResponse({ type: OverviewResponseDto })
  @ApiServiceUnavailableResponse({ description: "Overview data source unavailable" })
  getAnalyticsOverview() {
    return this.analyticsService.getOverview();
  }
}

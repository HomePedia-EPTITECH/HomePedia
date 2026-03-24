import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OverviewResponse } from "./models/overview.model";
import { OverviewService } from "./overview.service";

@ApiTags("overview")
@Controller("overview")
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @ApiOperation({ summary: "Get a simple dashboard overview for the frontend" })
  @ApiOkResponse({ type: OverviewResponse })
  @Get()
  getOverview() {
    return this.overviewService.getOverview();
  }
}


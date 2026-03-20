import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OverviewService } from "./overview.service";

@ApiTags("overview")
@Controller("overview")
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @ApiOperation({ summary: "Get a simple dashboard overview for the frontend" })
  @Get()
  getOverview() {
    return this.overviewService.getOverview();
  }
}


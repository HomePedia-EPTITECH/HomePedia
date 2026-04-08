import { Controller, Get } from "@nestjs/common";
import { OverviewService } from "./overview.service";

@Controller("overview")
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get()
  getOverview() {
    return this.overviewService.getOverview();
  }
}

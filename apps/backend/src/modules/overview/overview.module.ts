import { Module } from "@nestjs/common";
import { CitiesModule } from "../cities/cities.module";
import { OverviewController } from "./overview.controller";
import { OverviewService } from "./overview.service";
import { ReviewsModule } from "../reviews/reviews.module";

@Module({
  imports: [CitiesModule, ReviewsModule],
  controllers: [OverviewController],
  providers: [OverviewService]
})
export class OverviewModule {}

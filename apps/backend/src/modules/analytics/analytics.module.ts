import { Module } from "@nestjs/common";
import { GeoModule } from "../geo/geo.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { ReviewsModule } from "../reviews/reviews.module";

@Module({
  imports: [GeoModule, ReviewsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}

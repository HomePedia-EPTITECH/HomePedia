import { Module } from "@nestjs/common";
import { GeoModule } from "./modules/geo/geo.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { HealthModule } from "./modules/health/health.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";

@Module({
  imports: [HealthModule, GeoModule, ReviewsModule, AnalyticsModule]
})
export class AppModule {}

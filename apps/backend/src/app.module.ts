import { Module } from "@nestjs/common";
import { GeoModule } from "./modules/geo/geo.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { HealthModule } from "./modules/health/health.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { CommunesModule } from "./modules/communes/communes.module";

@Module({
  imports: [HealthModule, GeoModule, ReviewsModule, AnalyticsModule, CommunesModule]
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { CitiesModule } from "./modules/cities/cities.module";
import { DepartementsModule } from "./modules/departements/departements.module";
import { HealthModule } from "./modules/health/health.module";
import { OverviewModule } from "./modules/overview/overview.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";

@Module({
  imports: [HealthModule, CitiesModule, DepartementsModule, ReviewsModule, OverviewModule]
})
export class AppModule {}

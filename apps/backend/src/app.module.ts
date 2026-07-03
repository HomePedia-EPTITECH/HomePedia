import { Module } from "@nestjs/common";
import { GeoModule } from "./modules/geo/geo.module";
import { HealthModule } from "./modules/health/health.module";
import { CommunesModule } from "./modules/communes/communes.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";

@Module({
  imports: [HealthModule, GeoModule, CommunesModule, ReviewsModule]
})
export class AppModule {}

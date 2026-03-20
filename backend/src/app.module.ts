import { Module } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller";
import { KpiController } from "./controllers/kpi.controller";
import { DbModule } from "./db/db.module";
import { CitiesModule } from "./modules/cities/cities.module";
import { OverviewModule } from "./modules/overview/overview.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { KpiRepository } from "./repositories/kpi.repository";
import { KpiService } from "./services/kpi.service";

@Module({
  imports: [DbModule, CitiesModule, ReviewsModule, OverviewModule],
  controllers: [HealthController, KpiController],
  providers: [KpiService, KpiRepository]
})
export class AppModule {}

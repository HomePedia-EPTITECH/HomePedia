import { Module } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller";
import { KpiController } from "./controllers/kpi.controller";
import { DbModule } from "./db/db.module";
import { MongoModule } from "./db/mongo.module";
import { CitiesModule } from "./modules/cities/cities.module";
import { DepartementsModule } from "./modules/departements/departements.module";
import { OverviewModule } from "./modules/overview/overview.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { PostgresKpiRepository } from "./repositories/kpi.postgres.repository";
import { KpiRepository } from "./repositories/kpi.repository";
import { HealthService } from "./services/health.service";
import { KpiService } from "./services/kpi.service";

@Module({
  imports: [DbModule, MongoModule, CitiesModule, DepartementsModule, ReviewsModule, OverviewModule],
  controllers: [HealthController, KpiController],
  providers: [HealthService, KpiService, KpiRepository, PostgresKpiRepository]
})
export class AppModule {}

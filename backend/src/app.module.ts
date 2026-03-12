import { Module } from "@nestjs/common";
import { HealthController } from "./controllers/health.controller";
import { KpiController } from "./controllers/kpi.controller";
import { DbModule } from "./db/db.module";
import { KpiRepository } from "./repositories/kpi.repository";
import { KpiService } from "./services/kpi.service";

@Module({
  imports: [DbModule],
  controllers: [HealthController, KpiController],
  providers: [KpiService, KpiRepository]
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { MongoModule } from "../../db/mongo.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [DbModule, MongoModule],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}

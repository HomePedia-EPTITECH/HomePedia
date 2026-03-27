import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { MongoModule } from "../../db/mongo.module";
import { CitiesController } from "./cities.controller";
import { PostgresCitiesRepository } from "./cities.postgres.repository";
import { CitiesRepository } from "./cities.repository";
import { CitiesService } from "./cities.service";

@Module({
  imports: [MongoModule, DbModule],
  controllers: [CitiesController],
  providers: [CitiesService, CitiesRepository, PostgresCitiesRepository],
  exports: [CitiesService, CitiesRepository, PostgresCitiesRepository]
})
export class CitiesModule {}

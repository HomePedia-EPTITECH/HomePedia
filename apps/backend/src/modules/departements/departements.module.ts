import { Module } from "@nestjs/common";
import { CitiesModule } from "../cities/cities.module";
import { DbModule } from "../../db/db.module";
import { MongoModule } from "../../db/mongo.module";
import { DepartementsController } from "./departements.controller";
import { PostgresDepartementsRepository } from "./departements.postgres.repository";
import { DepartementsRepository } from "./departements.repository";
import { DepartementsService } from "./departements.service";

@Module({
  imports: [MongoModule, DbModule, CitiesModule],
  controllers: [DepartementsController],
  providers: [DepartementsService, DepartementsRepository, PostgresDepartementsRepository]
})
export class DepartementsModule {}

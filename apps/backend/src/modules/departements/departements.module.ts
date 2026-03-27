import { Module } from "@nestjs/common";
import { CitiesModule } from "../cities/cities.module";
import { MongoModule } from "../../db/mongo.module";
import { DepartementsController } from "./departements.controller";
import { DepartementsRepository } from "./departements.repository";
import { DepartementsService } from "./departements.service";

@Module({
  imports: [MongoModule, CitiesModule],
  controllers: [DepartementsController],
  providers: [DepartementsService, DepartementsRepository]
})
export class DepartementsModule {}

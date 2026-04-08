import { Module } from "@nestjs/common";
import { CitiesModule } from "../cities/cities.module";
import { DbModule } from "../../db/db.module";
import { DepartementsController } from "./departements.controller";
import { PostgresDepartementsRepository } from "./departements.postgres.repository";
import { DepartementsService } from "./departements.service";

@Module({
  imports: [DbModule, CitiesModule],
  controllers: [DepartementsController],
  providers: [DepartementsService, PostgresDepartementsRepository]
})
export class DepartementsModule {}

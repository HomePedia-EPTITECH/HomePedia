import { Module } from "@nestjs/common";
import { MongoModule } from "../../db/mongo.module";
import { DepartementsController } from "./departements.controller";
import { DepartementsRepository } from "./departements.repository";
import { DepartementsService } from "./departements.service";

@Module({
  imports: [MongoModule],
  controllers: [DepartementsController],
  providers: [DepartementsService, DepartementsRepository]
})
export class DepartementsModule {}

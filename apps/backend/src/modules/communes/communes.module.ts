import { Module } from "@nestjs/common";
import { GeoModule } from "../geo/geo.module";
import { MongoModule } from "../../db/mongo.module";
import { CommunesController, GeoPublicController } from "./communes.controller";
import { CommunesRepository } from "./communes.repository";
import { CommunesService } from "./communes.service";

@Module({
  imports: [MongoModule, GeoModule],
  controllers: [CommunesController, GeoPublicController],
  providers: [CommunesRepository, CommunesService],
  exports: [CommunesService, CommunesRepository]
})
export class CommunesModule {}

import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { GeoModule } from "../geo/geo.module";
import { CommunesController, GeoPublicController } from "./communes.controller";
import { CommunesRepository } from "./communes.repository";
import { CommunesService } from "./communes.service";

@Module({
  imports: [DbModule, GeoModule],
  controllers: [CommunesController, GeoPublicController],
  providers: [CommunesRepository, CommunesService],
  exports: [CommunesService, CommunesRepository]
})
export class CommunesModule {}

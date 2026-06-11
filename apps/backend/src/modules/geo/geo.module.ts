import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { ReviewsModule } from "../reviews/reviews.module";
import {
  GeoCitiesController,
  GeoDepartementsController,
  GeoRegionsController
} from "./geo.controller";
import {
  GeoCitiesPostgresRepository
} from "./geo-cities.postgres.repository";
import {
  GeoDepartementsPostgresRepository
} from "./geo-departements.postgres.repository";
import {
  GeoRegionsPostgresRepository
} from "./geo-regions.postgres.repository";
import { GeoService } from "./geo.service";

@Module({
  imports: [DbModule, ReviewsModule],
  controllers: [GeoCitiesController, GeoDepartementsController, GeoRegionsController],
  providers: [
    GeoService,
    GeoCitiesPostgresRepository,
    GeoDepartementsPostgresRepository,
    GeoRegionsPostgresRepository
  ],
  exports: [
    GeoService,
    GeoCitiesPostgresRepository,
    GeoDepartementsPostgresRepository,
    GeoRegionsPostgresRepository
  ]
})
export class GeoModule {}

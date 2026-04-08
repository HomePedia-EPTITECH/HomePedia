import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { ReviewsModule } from "../reviews/reviews.module";
import { CitiesController } from "./cities.controller";
import { PostgresCitiesRepository } from "./cities.postgres.repository";
import { CitiesService } from "./cities.service";

@Module({
  imports: [DbModule, ReviewsModule],
  controllers: [CitiesController],
  providers: [CitiesService, PostgresCitiesRepository],
  exports: [CitiesService, PostgresCitiesRepository]
})
export class CitiesModule {}

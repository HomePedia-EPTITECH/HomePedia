import { Module } from "@nestjs/common";
import { DbModule } from "../../db/db.module";
import { MongoModule } from "../../db/mongo.module";
import { CitiesRepository } from "../cities/cities.repository";
import { OverviewController } from "./overview.controller";
import { OverviewService } from "./overview.service";
import { ReviewsRepository } from "../reviews/reviews.repository";

@Module({
  imports: [DbModule, MongoModule],
  controllers: [OverviewController],
  providers: [OverviewService, CitiesRepository, ReviewsRepository]
})
export class OverviewModule {}


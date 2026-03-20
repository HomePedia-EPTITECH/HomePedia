import { Module } from "@nestjs/common";
import { MongoModule } from "../../db/mongo.module";
import { ReviewsController } from "./reviews.controller";
import { ReviewsRepository } from "./reviews.repository";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [MongoModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository]
})
export class ReviewsModule {}


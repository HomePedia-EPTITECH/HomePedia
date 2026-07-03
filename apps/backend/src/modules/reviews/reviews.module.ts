import { Module } from "@nestjs/common";
import { MongoModule } from "../../db/mongo.module";
import { ReviewsRepository } from "./reviews.repository";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [MongoModule],
  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsRepository]
})
export class ReviewsModule {}

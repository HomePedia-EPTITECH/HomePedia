import { Controller, Get, Param } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("cities/:code")
  findByCityCode(@Param("code") code: string) {
    return this.reviewsService.getCityReviews(code);
  }
}

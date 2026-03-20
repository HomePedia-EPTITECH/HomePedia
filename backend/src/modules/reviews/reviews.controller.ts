import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({ summary: "Get text reviews and metrics snapshot for a city" })
  @ApiParam({ name: "code", type: String })
  @Get("cities/:code")
  findByCityCode(@Param("code") code: string) {
    return this.reviewsService.getCityReviews(code);
  }
}

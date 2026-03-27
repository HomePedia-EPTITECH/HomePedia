import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";
import { ApiErrorResponse } from "../../models/api-error.model";
import { CityReviewsResponse } from "./models/review.model";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({ summary: "Get text reviews and metrics snapshot for a city" })
  @ApiParam({ name: "code", type: String, example: "75056" })
  @ApiOkResponse({ type: CityReviewsResponse, description: "Raw review buckets and harvest snapshot for one city" })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponse })
  @Get("cities/:code")
  findByCityCode(@Param("code") code: string) {
    return this.reviewsService.getCityReviews(code);
  }
}

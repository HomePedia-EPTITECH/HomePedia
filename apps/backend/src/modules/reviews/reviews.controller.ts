import { Controller, Get, Param } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiServiceUnavailableResponse } from "@nestjs/swagger";
import { CityReviewsResponseDto } from "./dto/city-reviews-response.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("cities/:code")
  @ApiOperation({ summary: "Get city reviews" })
  @ApiParam({ name: "code", example: "75056" })
  @ApiOkResponse({ type: CityReviewsResponseDto })
  @ApiNotFoundResponse({ description: "Reviews not found" })
  @ApiServiceUnavailableResponse({ description: "Reviews source unavailable" })
  findByCityCode(@Param("code") code: string) {
    return this.reviewsService.getCityReviews(code);
  }
}

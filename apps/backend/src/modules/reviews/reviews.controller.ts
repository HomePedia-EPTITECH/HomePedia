import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";
import { CityReviewsResponseDto } from "./dto/city-reviews-response.dto";
import {
  CityReviewItemsResponseDto
} from "./dto/city-review-items-response.dto";
import { GetCityReviewsItemsQueryDto } from "./dto/get-city-reviews-items-query.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("cities/:cityCode")
  @ApiOperation({ summary: "Get city review summary" })
  @ApiParam({ name: "cityCode", example: "75056" })
  @ApiOkResponse({ type: CityReviewsResponseDto })
  @ApiBadRequestResponse({ description: "Invalid city code" })
  @ApiServiceUnavailableResponse({ description: "Reviews data source unavailable" })
  getCityReviews(@Param("cityCode") cityCode: string) {
    return this.reviewsService.getCityReviews(cityCode);
  }

  @Get("cities/:cityCode/items")
  @ApiOperation({ summary: "Get paginated city reviews" })
  @ApiParam({ name: "cityCode", example: "75056" })
  @ApiQuery({ type: GetCityReviewsItemsQueryDto })
  @ApiOkResponse({ type: CityReviewItemsResponseDto })
  @ApiBadRequestResponse({ description: "Invalid query parameters" })
  @ApiServiceUnavailableResponse({ description: "Reviews data source unavailable" })
  getCityReviewItems(
    @Param("cityCode") cityCode: string,
    @Query() query: GetCityReviewsItemsQueryDto
  ) {
    return this.reviewsService.getCityReviewItems(cityCode, query);
  }
}

import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { toIsoString } from "../../common/format";
import { ReviewsRepository } from "./reviews.repository";
import { CityReviewsResponseDto } from "./dto/city-reviews-response.dto";
import {
  CityReviewItemDto,
  CityReviewItemsResponseDto
} from "./dto/city-review-items-response.dto";
import { GetCityReviewsItemsQueryDto } from "./dto/get-city-reviews-items-query.dto";
import { InvalidReviewCursorError } from "./errors/invalid-review-cursor.error";

type ReviewSummaryDocument = Awaited<ReturnType<ReviewsRepository["findByCityCode"]>>;
type ReviewItemsDocument = NonNullable<Awaited<ReturnType<ReviewsRepository["findByCityCodeItems"]>>>;
type ReviewItemDocument = ReviewItemsDocument["reviews"][number];

const DEFAULT_CITY_REVIEWS_ITEMS_LIMIT = 100;

@Injectable()
export class ReviewsService {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async getCityReviews(code: string): Promise<CityReviewsResponseDto> {
    let document: ReviewSummaryDocument;
    try {
      document = await this.reviewsRepository.findByCityCode(code);
    } catch {
      throw new ServiceUnavailableException("Reviews data source is unavailable");
    }

    if (!document) {
      throw new NotFoundException(`Reviews for city ${code} not found`);
    }

    return {
      data: {
        code: document.code,
        sourceUrl: document.sourceUrl,
        harvestedAt: toIsoString(document.harvestedAt, "seconds"),
        reviews: this.groupReviews(document.reviews)
      },
      meta: {
        source: "mongo",
        collection: "reviews_raw"
      }
    };
  }

  async getCityReviewItems(
    code: string,
    query: GetCityReviewsItemsQueryDto = new GetCityReviewsItemsQueryDto()
  ): Promise<CityReviewItemsResponseDto> {
    const limit = query.limit ?? DEFAULT_CITY_REVIEWS_ITEMS_LIMIT;
    let document: ReviewItemsDocument | null;
    try {
      document = await this.reviewsRepository.findByCityCodeItems(code, { limit, cursor: query.cursor });
    } catch (error) {
      if (error instanceof InvalidReviewCursorError) {
        throw new BadRequestException(error.message);
      }

      throw new ServiceUnavailableException("Reviews data source is unavailable");
    }

    if (!document) {
      throw new NotFoundException(`Reviews for city ${code} not found`);
    }

    return {
      cityCode: document.code,
      sourceUrl: document.sourceUrl,
      harvestedAt: toIsoString(document.harvestedAt, "seconds"),
      reviews: this.mapReviewItems(document.reviews),
      pagination: document.pagination
    };
  }

  private mapReviewItems(reviews: ReviewItemDocument[]): CityReviewItemDto[] {
    return reviews.flatMap((review) => {
      const text = review.text?.trim();
      if (!text) {
        return [];
      }

      return [
        {
          id: String(review._id),
          text,
          sentimentLabel: review.sentiment_label ?? null,
          source: review.source ?? null,
          urlPage: review.url_page ?? null,
          collectedAt: toIsoString(review.collected_at, "seconds")
        }
      ];
    });
  }

  private groupReviews(
    reviews: Array<{ text?: string; sentiment_label?: string }>
  ): { positive: string[]; negative: string[]; all: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];
    const all: string[] = [];

    for (const review of reviews) {
      const text = review.text?.trim();
      if (!text) {
        continue;
      }

      if (!all.includes(text)) {
        all.push(text);
      }

      if (review.sentiment_label === "positive" && !positive.includes(text)) {
        positive.push(text);
      }

      if (review.sentiment_label === "negative" && !negative.includes(text)) {
        negative.push(text);
      }
    }

    return { positive, negative, all };
  }
}

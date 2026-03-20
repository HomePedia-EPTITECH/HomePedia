import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ReviewsRepository } from "./reviews.repository";
import { CityReviewsResponse } from "./models/review.model";

type ReviewDocument = Awaited<ReturnType<ReviewsRepository["findByCityCode"]>>;

@Injectable()
export class ReviewsService {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async getCityReviews(code: string): Promise<CityReviewsResponse> {
    let document: ReviewDocument;
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
        code: document.com,
        sourceUrl: document.url_source ?? null,
        harvestedAt: this.toIsoString(document.harvested_at),
        reviews: {
          positive: document.sentiment_analysis_source?.positive ?? [],
          negative: document.sentiment_analysis_source?.negative ?? [],
          all: document.sentiment_analysis_source?.all ?? []
        },
        metricsSnapshot: document.metrics ?? {}
      },
      meta: {
        source: "mongo",
        collection: "city_backups"
      }
    };
  }

  private toIsoString(value: number | string | Date | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "number") {
      return new Date(value * 1000).toISOString();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}

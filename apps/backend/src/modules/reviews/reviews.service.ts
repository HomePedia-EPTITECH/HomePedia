import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { ReviewsRepository } from "./reviews.repository";
import { CityReviewsResponse } from "./models/review.model";

type ReviewDocument = Awaited<ReturnType<ReviewsRepository["findByCityCode"]>>;
type PrimitiveMetric = string | number | null;

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
        code: document.commune.com,
        sourceUrl: document.commune.links?.city_page ?? document.commune.links?.avis_page ?? null,
        harvestedAt: this.toIsoString(
          document.commune.reviews_refs?.last_collected_at ??
            document.commune.updated_at ??
            document.reviews[0]?.collected_at
        ),
        reviews: this.groupReviews(document.reviews),
        metricsSnapshot: this.buildMetricsSnapshot(document)
      },
      meta: {
        source: "mongo",
        collection: "communes_harvest"
      }
    };
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

  private buildMetricsSnapshot(document: NonNullable<ReviewDocument>): Record<string, PrimitiveMetric> {
    return {
      ...(document.commune.demography ?? {}),
      ...(document.commune.quality_of_life ?? {})
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

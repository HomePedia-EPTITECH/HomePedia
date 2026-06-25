import { BadRequestException, Injectable } from "@nestjs/common";
import { Document, ObjectId } from "mongodb";
import { MongoService } from "../../db/mongo.service";

const DEFAULT_CITY_REVIEWS_LIMIT = 100;
const MAX_CITY_REVIEWS_LIMIT = 100;

type ReviewSummaryDocument = Document & {
  com: string;
  source?: string;
  url_page?: string;
  text?: string;
  sentiment_label?: string;
  collected_at?: number | string | Date;
};

type ReviewItemDocument = ReviewSummaryDocument & {
  _id: ObjectId;
};

export type CityReviewPagination = {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type CityReviewDocument = {
  code: string;
  source: string | null;
  sourceUrl: string | null;
  harvestedAt: number | string | Date | null;
  totalReviews: number;
  reviews: ReviewSummaryDocument[];
};

export type CityReviewItemsDocument = {
  code: string;
  source: string | null;
  sourceUrl: string | null;
  harvestedAt: number | string | Date | null;
  reviews: ReviewItemDocument[];
  pagination: CityReviewPagination;
};

type FindCityReviewItemsOptions = {
  limit: number;
  cursor?: string;
};

@Injectable()
export class ReviewsRepository {
  constructor(private readonly mongoService: MongoService) {}

  async findByCityCode(code: string): Promise<CityReviewDocument | null> {
    const reviewsCollection = await this.mongoService.getCollection<ReviewSummaryDocument>("reviews_raw");
    const [reviews, totalReviews] = await Promise.all([
      reviewsCollection
        .find(
          { com: code },
          {
            projection: {
              _id: 0,
              com: 1,
              source: 1,
              url_page: 1,
              text: 1,
              sentiment_label: 1,
              collected_at: 1
            }
          }
        )
        .sort({ collected_at: -1 })
        .limit(DEFAULT_CITY_REVIEWS_LIMIT)
        .toArray(),
      reviewsCollection.countDocuments({ com: code })
    ]);

    if (totalReviews === 0) {
      return null;
    }

    const latestReview = reviews[0];

    return {
      code,
      source: latestReview?.source ?? null,
      sourceUrl: latestReview?.url_page ?? null,
      harvestedAt: latestReview?.collected_at ?? null,
      totalReviews,
      reviews
    };
  }

  async findByCityCodeItems(
    code: string,
    options: FindCityReviewItemsOptions
  ): Promise<CityReviewItemsDocument | null> {
    const reviewsCollection = await this.mongoService.getCollection<ReviewItemDocument>("reviews_raw");
    const limit = Math.min(
      Math.max(Math.trunc(options.limit ?? DEFAULT_CITY_REVIEWS_LIMIT), 1),
      MAX_CITY_REVIEWS_LIMIT
    );
    const pageFilter = this.buildItemsFilter(code, options.cursor);
    const metadataFilter = { com: code };

    const [reviews, latestReviews] = await Promise.all([
      reviewsCollection
        .find(pageFilter, {
          projection: {
            _id: 1,
            com: 1,
            source: 1,
            url_page: 1,
            text: 1,
            sentiment_label: 1,
            collected_at: 1
          }
        })
        .sort({ _id: 1 })
        .limit(limit + 1)
        .toArray(),
      reviewsCollection
        .find(metadataFilter, {
          projection: {
            _id: 1,
            source: 1,
            url_page: 1,
            collected_at: 1
          }
        })
        .sort({ _id: -1 })
        .limit(1)
        .toArray()
    ]);

    if (latestReviews.length === 0) {
      return null;
    }

    const pageReviews = reviews.slice(0, limit);
    const hasMore = reviews.length > limit;
    const nextCursor =
      hasMore && pageReviews.length > 0 ? String(pageReviews[pageReviews.length - 1]._id) : null;
    const latestReview = latestReviews[0];

    return {
      code,
      source: latestReview?.source ?? null,
      sourceUrl: latestReview?.url_page ?? null,
      harvestedAt: latestReview?.collected_at ?? null,
      reviews: pageReviews,
      pagination: {
        limit,
        hasMore,
        nextCursor
      }
    };
  }

  async countReviewedCities(): Promise<number> {
    const collection = await this.mongoService.getCollection<ReviewSummaryDocument>("reviews_raw");
    const codes = await collection.distinct("com", { com: { $type: "string", $ne: "" } });
    return codes.length;
  }

  async findCityCodesWithMinimumReviews(minimumReviews: number): Promise<string[]> {
    const collection = await this.mongoService.getCollection<ReviewSummaryDocument>("reviews_raw");
    const rows = await collection
      .aggregate<{ _id: string }>([
        {
          $match: {
            com: { $type: "string", $ne: "" }
          }
        },
        {
          $group: {
            _id: "$com",
            totalReviews: { $sum: 1 }
          }
        },
        {
          $match: {
            totalReviews: { $gte: minimumReviews }
          }
        }
      ])
      .toArray();

    return rows.map((row) => row._id);
  }

  private buildItemsFilter(code: string, cursor?: string) {
    if (!cursor) {
      return { com: code };
    }

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(cursor);
    } catch {
      throw new BadRequestException("Invalid cursor");
    }

    return {
      com: code,
      _id: { $gt: objectId }
    };
  }
}

import { Injectable } from "@nestjs/common";
import { Document } from "mongodb";
import { MongoService } from "../../db/mongo.service";

const DEFAULT_CITY_REVIEWS_LIMIT = 100;

type ReviewRawDocument = Document & {
  com: string;
  source?: string;
  url_page?: string;
  text?: string;
  sentiment_label?: string;
  collected_at?: number | string | Date;
};

export type CityReviewDocument = {
  code: string;
  source: string | null;
  sourceUrl: string | null;
  harvestedAt: number | string | Date | null;
  totalReviews: number;
  reviews: ReviewRawDocument[];
};

@Injectable()
export class ReviewsRepository {
  constructor(private readonly mongoService: MongoService) {}

  async findByCityCode(code: string): Promise<CityReviewDocument | null> {
    const reviewsCollection = await this.mongoService.getCollection<ReviewRawDocument>("reviews_raw");
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

  async countReviewedCities(): Promise<number> {
    const collection = await this.mongoService.getCollection<ReviewRawDocument>("reviews_raw");
    const codes = await collection.distinct("com", { com: { $type: "string", $ne: "" } });
    return codes.length;
  }

  async findCityCodesWithMinimumReviews(minimumReviews: number): Promise<string[]> {
    const collection = await this.mongoService.getCollection<ReviewRawDocument>("reviews_raw");
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
}

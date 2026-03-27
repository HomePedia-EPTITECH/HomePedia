import { Injectable } from "@nestjs/common";
import { Document } from "mongodb";
import { MongoService } from "../../db/mongo.service";

type PrimitiveMetric = string | number | null;

type CommuneHarvestDocument = Document & {
  com: string;
  links?: {
    city_page?: string;
    avis_page?: string;
  };
  demography?: Record<string, PrimitiveMetric>;
  quality_of_life?: Record<string, PrimitiveMetric>;
  reviews_refs?: {
    count?: number;
    last_collected_at?: number | string | Date;
  };
  updated_at?: number | string | Date;
};

type ReviewRawDocument = Document & {
  text?: string;
  sentiment_label?: string;
  collected_at?: number | string | Date;
};

export type CityReviewsDocument = {
  commune: CommuneHarvestDocument;
  reviews: ReviewRawDocument[];
};

@Injectable()
export class ReviewsRepository {
  constructor(private readonly mongoService: MongoService) {}

  async findByCityCode(code: string): Promise<CityReviewsDocument | null> {
    const communes = await this.mongoService.getCollection<CommuneHarvestDocument>(
      "communes_harvest"
    );
    const commune = await communes.findOne(
      { com: code },
      {
        projection: {
          _id: 0,
          com: 1,
          links: 1,
          demography: 1,
          quality_of_life: 1,
          reviews_refs: 1,
          updated_at: 1
        }
      }
    );

    if (!commune) {
      return null;
    }

    const reviewsCollection = await this.mongoService.getCollection<ReviewRawDocument>("reviews_raw");
    const reviews = await reviewsCollection
      .find(
        { com: code },
        {
          projection: {
            _id: 0,
            text: 1,
            sentiment_label: 1,
            collected_at: 1
          }
        }
      )
      .sort({ collected_at: -1 })
      .limit(100)
      .toArray();

    return { commune, reviews };
  }

  async countReviewedCities(): Promise<number> {
    const collection = await this.mongoService.getCollection<CommuneHarvestDocument>(
      "communes_harvest"
    );
    return collection.countDocuments({ "reviews_refs.count": { $gt: 0 } });
  }
}

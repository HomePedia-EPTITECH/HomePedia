import { Injectable } from "@nestjs/common";
import { Document } from "mongodb";
import { MongoService } from "../../db/mongo.service";

type CityBackupDocument = Document & {
  com: string;
  metrics?: Record<string, string | null>;
  sentiment_analysis_source?: {
    positive?: string[];
    negative?: string[];
    all?: string[];
  };
  url_source?: string;
  harvested_at?: number | string | Date;
};

@Injectable()
export class ReviewsRepository {
  constructor(private readonly mongoService: MongoService) {}

  async findByCityCode(code: string): Promise<CityBackupDocument | null> {
    const collection = await this.mongoService.getCollection<CityBackupDocument>("city_backups");
    return collection.findOne(
      { com: code },
      {
        projection: {
          _id: 0,
          com: 1,
          metrics: 1,
          sentiment_analysis_source: 1,
          url_source: 1,
          harvested_at: 1
        }
      }
    );
  }

  async countReviewedCities(): Promise<number> {
    const collection = await this.mongoService.getCollection<CityBackupDocument>("city_backups");
    return collection.countDocuments();
  }
}

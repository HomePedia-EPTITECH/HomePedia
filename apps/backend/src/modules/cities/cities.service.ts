import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { parseMetricValue, toIsoString } from "../../common/format";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import {
  CityDetailRow,
  CityRow,
  PostgresCitiesRepository,
  PrimitiveMetric
} from "./cities.postgres.repository";
import { City, CityDetailResponse, CityResponse, CitiesResponse } from "./types";
import { ReviewsRepository } from "../reviews/reviews.repository";

type ReviewDocument = Awaited<ReturnType<ReviewsRepository["findByCityCode"]>>;

@Injectable()
export class CitiesService {
  constructor(
    private readonly postgresRepository: PostgresCitiesRepository,
    private readonly reviewsRepository: ReviewsRepository
  ) {}

  async getCities(query: GetCitiesQueryDto): Promise<CitiesResponse> {
    const scopedCodes =
      query.nb_avis_min !== undefined
        ? await this.getReviewScopedCityCodes(query.nb_avis_min)
        : undefined;

    const [rows, total] = await Promise.all([
      this.postgresRepository.findAll(query, scopedCodes),
      this.postgresRepository.countAll(query, scopedCodes)
    ]);

    return {
      data: rows.map((row) => this.toCity(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit)
      }
    };
  }

  async getCityByCode(code: string): Promise<CityResponse> {
    const row = await this.postgresRepository.findByCode(code);
    if (!row) {
      throw new NotFoundException(`City ${code} not found`);
    }

    return {
      data: this.toCity(row)
    };
  }

  async getCityDetailsByCode(code: string): Promise<CityDetailResponse> {
    const sqlDetail = await this.postgresRepository.findDetailByCode(code);
    if (!sqlDetail) {
      throw new NotFoundException(`City ${code} not found`);
    }

    const detail = this.mergeSqlDetailWithReviews(
      sqlDetail,
      await this.safeReviewLookup(code)
    );

    return {
      data: {
        city: this.toCity(detail.city),
        admin: {
          codeDept: detail.admin.codeDept,
          postalCode: detail.admin.postalCode,
          region: detail.admin.region,
          departement: detail.admin.departement,
          metropole: detail.admin.metropole,
          mayor: detail.admin.mayor
        },
        source: {
          provider: detail.source.provider,
          cityPage: detail.source.cityPage,
          reviewsPage: detail.source.reviewsPage,
          harvestedAt: toIsoString(detail.source.harvestedAt),
          updatedAt: toIsoString(detail.source.updatedAt)
        },
        blocks: {
          demography: { values: detail.blocks.demography },
          security: { values: detail.blocks.security },
          qualityOfLife: { values: detail.blocks.qualityOfLife },
          services: { values: detail.blocks.services },
          realEstate: { values: detail.blocks.realEstate }
        },
        reviews: {
          count: detail.reviews.count,
          positive: detail.reviews.positive,
          negative: detail.reviews.negative,
          all: detail.reviews.all
        }
      }
    };
  }

  private mergeSqlDetailWithReviews(
    sqlDetail: CityDetailRow,
    reviewDocument: ReviewDocument | null
  ): CityDetailRow {
    return {
      city: sqlDetail.city,
      admin: sqlDetail.admin,
      source: {
        provider: reviewDocument?.source ?? sqlDetail.source.provider ?? null,
        cityPage: sqlDetail.source.cityPage,
        reviewsPage: reviewDocument?.sourceUrl ?? sqlDetail.source.reviewsPage ?? null,
        harvestedAt: reviewDocument?.harvestedAt ?? sqlDetail.source.harvestedAt ?? null,
        updatedAt: reviewDocument?.harvestedAt ?? sqlDetail.source.updatedAt ?? null
      },
      blocks: sqlDetail.blocks,
      reviews: {
        count: reviewDocument?.totalReviews ?? 0,
        positive: this.extractReviewTexts(reviewDocument?.reviews ?? [], "positive"),
        negative: this.extractReviewTexts(reviewDocument?.reviews ?? [], "negative"),
        all: this.extractReviewTexts(reviewDocument?.reviews ?? [])
      }
    };
  }

  private extractReviewTexts(
    reviews: Array<{ text?: string; sentiment_label?: string }>,
    sentiment?: "positive" | "negative"
  ): string[] {
    const values: string[] = [];

    for (const review of reviews) {
      const text = review.text?.trim();
      if (!text) {
        continue;
      }

      if (sentiment && review.sentiment_label !== sentiment) {
        continue;
      }

      if (!values.includes(text)) {
        values.push(text);
      }
    }

    return values;
  }

  private toCity(row: CityRow): City {
    return {
      code: row.com,
      name: row.nccenr,
      metrics: {
        population: parseMetricValue(row.nb_habitant),
        averageAge: parseMetricValue(row.age_moyen),
        activePopulation: parseMetricValue(row.pop_active),
        scores: {
          security: parseMetricValue(row.score_securite),
          environment: parseMetricValue(row.score_environnement),
          practicalLife: parseMetricValue(row.score_vie_pratique),
          leisure: parseMetricValue(row.score_loisirs),
          health: parseMetricValue(row.score_sante),
          transport: parseMetricValue(row.score_transports),
          education: parseMetricValue(row.score_education)
        }
      }
    };
  }

  private async getReviewScopedCityCodes(minimumReviews: number): Promise<string[]> {
    try {
      return await this.reviewsRepository.findCityCodesWithMinimumReviews(minimumReviews);
    } catch {
      throw new ServiceUnavailableException("Reviews data source is unavailable");
    }
  }

  private async safeReviewLookup(code: string): Promise<ReviewDocument | null> {
    try {
      return await this.reviewsRepository.findByCityCode(code);
    } catch {
      return null;
    }
  }
}

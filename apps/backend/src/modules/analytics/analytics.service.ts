import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { parseMetricValue } from "../../common/format";
import { GeoCitiesPostgresRepository } from "../geo/geo-cities.postgres.repository";
import { ReviewsRepository } from "../reviews/reviews.repository";
import { OverviewResponseDto } from "./dto/analytics-overview-response.dto";

type CityRow = Awaited<ReturnType<GeoCitiesPostgresRepository["findByCode"]>>;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly postgresCitiesRepository: GeoCitiesPostgresRepository,
    private readonly reviewsRepository: ReviewsRepository,
  ) {}

  async getOverview(): Promise<OverviewResponseDto> {
    let metrics: Awaited<ReturnType<GeoCitiesPostgresRepository["getOverviewMetrics"]>>;
    let safestCities: Awaited<ReturnType<GeoCitiesPostgresRepository["findTopCitiesByScore"]>>;
    let greenestCities: Awaited<ReturnType<GeoCitiesPostgresRepository["findTopCitiesByScore"]>>;

    try {
      [metrics, safestCities, greenestCities] = await Promise.all([
        this.postgresCitiesRepository.getOverviewMetrics(),
        this.postgresCitiesRepository.findTopCitiesByScore("score_securite", 3),
        this.postgresCitiesRepository.findTopCitiesByScore("score_environnement", 3)
      ]);
    } catch {
      throw new ServiceUnavailableException("Overview data source is unavailable");
    }

    const reviewsSummary = await this.getReviewedCitiesSummary();

    return {
      data: {
        totals: {
          cities: metrics?.total_cities ?? 0,
          reviewedCities: reviewsSummary.count,
          reviewsAvailable: reviewsSummary.available
        },
        averages: {
          population: this.round(metrics?.avg_population ?? null),
          securityScore: this.round(metrics?.avg_security ?? null),
          environmentScore: this.round(metrics?.avg_environment ?? null)
        },
        highlights: {
          safestCities: (safestCities ?? []).map((city) =>
            this.toOverviewCard(city, city.score_securite, city.score_environnement)
          ),
          greenestCities: (greenestCities ?? []).map((city) =>
            this.toOverviewCard(city, city.score_securite, city.score_environnement)
          )
        }
      }
    };
  }

  private async getReviewedCitiesSummary(): Promise<{ count: number; available: boolean }> {
    try {
      const count = await this.reviewsRepository.countReviewedCities();
      return { count, available: true };
    } catch {
      return { count: 0, available: false };
    }
  }

  private toOverviewCard(
    city: NonNullable<CityRow>,
    securityValue: string | number | null,
    environmentValue: string | number | null
  ) {
    return {
      code: city.com,
      name: city.nccenr,
      securityScore: parseMetricValue(securityValue),
      environmentScore: parseMetricValue(environmentValue)
    };
  }

  private round(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    return Math.round(value * 100) / 100;
  }

}

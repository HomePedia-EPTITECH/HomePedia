import { Injectable } from "@nestjs/common";
import { PostgresCitiesRepository } from "../cities/cities.postgres.repository";
import { ReviewsRepository } from "../reviews/reviews.repository";
import { OverviewResponse } from "./models/overview.model";

type CityRow = Awaited<ReturnType<PostgresCitiesRepository["findByCode"]>>;

@Injectable()
export class OverviewService {
  constructor(
    private readonly postgresCitiesRepository: PostgresCitiesRepository,
    private readonly reviewsRepository: ReviewsRepository,
  ) {}

  async getOverview(): Promise<OverviewResponse> {
    const [metrics, safestCities, greenestCities] = await Promise.all([
      this.safePostgresCall(() => this.postgresCitiesRepository.getOverviewMetrics()),
      this.safePostgresCall(() =>
        this.postgresCitiesRepository.findTopCitiesByScore("score_securite", 3)
      ),
      this.safePostgresCall(() =>
        this.postgresCitiesRepository.findTopCitiesByScore("score_environnement", 3)
      )
    ]);

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
      securityScore: this.parseMetricValue(securityValue),
      environmentScore: this.parseMetricValue(environmentValue)
    };
  }

  private parseMetricValue(value: string | number | null): number | null {
    if (value === null) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const normalized = value
      .replace(/,/g, ".")
      .replace(/\s+/g, "")
      .replace(/[^0-9.-]/g, "");

    if (!normalized || normalized === "." || normalized === "-" || normalized === "-.") {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private round(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    return Math.round(value * 100) / 100;
  }

  private async safePostgresCall<T>(callback: () => Promise<T | null> | undefined): Promise<T | null> {
    try {
      return (await callback()) ?? null;
    } catch {
      return null;
    }
  }
}

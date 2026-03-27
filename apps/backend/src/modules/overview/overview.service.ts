import { Injectable } from "@nestjs/common";
import { CitiesRepository } from "../cities/cities.repository";
import { ReviewsRepository } from "../reviews/reviews.repository";
import { OverviewResponse } from "./models/overview.model";

type CityRow = Awaited<ReturnType<CitiesRepository["findByCode"]>>;

@Injectable()
export class OverviewService {
  constructor(
    private readonly citiesRepository: CitiesRepository,
    private readonly reviewsRepository: ReviewsRepository
  ) {}

  async getOverview(): Promise<OverviewResponse> {
    const [metrics, safestCities, greenestCities] = await Promise.all([
      this.citiesRepository.getOverviewMetrics(),
      this.citiesRepository.findTopCitiesByScore("score_securite", 3),
      this.citiesRepository.findTopCitiesByScore("score_environnement", 3)
    ]);
    const reviewsSummary = await this.getReviewedCitiesSummary();

    return {
      data: {
        totals: {
          cities: metrics.total_cities,
          reviewedCities: reviewsSummary.count,
          reviewsAvailable: reviewsSummary.available
        },
        averages: {
          population: this.round(metrics.avg_population),
          securityScore: this.round(metrics.avg_security),
          environmentScore: this.round(metrics.avg_environment)
        },
        highlights: {
          safestCities: safestCities.map((city) =>
            this.toOverviewCard(city, city.score_securite, city.score_environnement)
          ),
          greenestCities: greenestCities.map((city) =>
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
}

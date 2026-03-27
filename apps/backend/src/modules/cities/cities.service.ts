import { Injectable, NotFoundException } from "@nestjs/common";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import { CitiesRepository } from "./cities.repository";
import { City, CityDetailResponse, CityResponse, CitiesResponse } from "./models/city.model";

type CityRow = Awaited<ReturnType<CitiesRepository["findByCode"]>>;
type CityDetailRecord = Awaited<ReturnType<CitiesRepository["findDetailByCode"]>>;

@Injectable()
export class CitiesService {
  constructor(private readonly repository: CitiesRepository) {}

  async getCities(query: GetCitiesQueryDto): Promise<CitiesResponse> {
    const [rows, total] = await Promise.all([
      this.repository.findAll(query),
      this.repository.countAll(query)
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
    const row = await this.repository.findByCode(code);
    if (!row) {
      throw new NotFoundException(`City ${code} not found`);
    }

    return {
      data: this.toCity(row)
    };
  }

  async getCityDetailsByCode(code: string): Promise<CityDetailResponse> {
    const detail = await this.repository.findDetailByCode(code);
    if (!detail) {
      throw new NotFoundException(`City ${code} not found`);
    }

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
          harvestedAt: this.toIsoString(detail.source.harvestedAt),
          updatedAt: this.toIsoString(detail.source.updatedAt)
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

  private toCity(row: NonNullable<CityRow>): City {
    return {
      code: row.com,
      name: row.nccenr,
      metrics: {
        population: this.parseMetricValue(row.nb_habitant),
        averageAge: this.parseMetricValue(row.age_moyen),
        activePopulation: this.parseMetricValue(row.pop_active),
        scores: {
          security: this.parseMetricValue(row.score_securite),
          environment: this.parseMetricValue(row.score_environnement),
          practicalLife: this.parseMetricValue(row.score_vie_pratique),
          leisure: this.parseMetricValue(row.score_loisirs),
          health: this.parseMetricValue(row.score_sante),
          transport: this.parseMetricValue(row.score_transports),
          education: this.parseMetricValue(row.score_education)
        }
      }
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

  private toIsoString(value: Date | string | number | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "number") {
      return new Date(value).toISOString();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}

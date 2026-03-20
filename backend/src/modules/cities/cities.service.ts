import { Injectable, NotFoundException } from "@nestjs/common";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import { CitiesRepository } from "./cities.repository";
import { City, CityResponse, CitiesResponse } from "./models/city.model";

type CityRow = Awaited<ReturnType<CitiesRepository["findByCode"]>>;

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
}

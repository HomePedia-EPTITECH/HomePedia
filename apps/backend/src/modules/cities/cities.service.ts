import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import { PostgresCitiesRepository } from "./cities.postgres.repository";
import { CitiesRepository } from "./cities.repository";
import { City, CityDetailResponse, CityResponse, CitiesResponse } from "./models/city.model";
import { CityDetailRow, CityRow, PrimitiveMetric } from "./cities.read-model";

@Injectable()
export class CitiesService {
  constructor(
    private readonly repository: CitiesRepository,
    @Optional() private readonly postgresRepository?: PostgresCitiesRepository
  ) {}

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
    const sqlRow = await this.safePostgresCall(() => this.postgresRepository?.findByCode(code));
    const mongoRow = sqlRow ? null : await this.repository.findByCode(code);
    const row = this.mergeCityRows(sqlRow, mongoRow);

    if (!row) {
      throw new NotFoundException(`City ${code} not found`);
    }

    return {
      data: this.toCity(row)
    };
  }

  async getCityDetailsByCode(code: string): Promise<CityDetailResponse> {
    const [sqlDetail, mongoDetail] = await Promise.all([
      this.safePostgresCall(() => this.postgresRepository?.findDetailByCode(code)),
      this.safeMongoDetailLookup(code)
    ]);

    const detail = this.mergeDetails(sqlDetail, mongoDetail);
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

  private mergeDetails(
    sqlDetail: CityDetailRow | null,
    mongoDetail: CityDetailRow | null
  ): CityDetailRow | null {
    if (!sqlDetail && !mongoDetail) {
      return null;
    }

    const city = this.mergeCityRows(sqlDetail?.city ?? null, mongoDetail?.city ?? null);
    if (!city) {
      return null;
    }

    return {
      city,
      admin: {
        codeDept: sqlDetail?.admin.codeDept ?? mongoDetail?.admin.codeDept ?? null,
        postalCode: sqlDetail?.admin.postalCode ?? mongoDetail?.admin.postalCode ?? null,
        region: sqlDetail?.admin.region ?? mongoDetail?.admin.region ?? null,
        departement: sqlDetail?.admin.departement ?? mongoDetail?.admin.departement ?? null,
        metropole: sqlDetail?.admin.metropole ?? mongoDetail?.admin.metropole ?? null,
        mayor: sqlDetail?.admin.mayor ?? mongoDetail?.admin.mayor ?? null
      },
      source: {
        provider: mongoDetail?.source.provider ?? sqlDetail?.source.provider ?? null,
        cityPage: mongoDetail?.source.cityPage ?? sqlDetail?.source.cityPage ?? null,
        reviewsPage: mongoDetail?.source.reviewsPage ?? sqlDetail?.source.reviewsPage ?? null,
        harvestedAt: mongoDetail?.source.harvestedAt ?? sqlDetail?.source.harvestedAt ?? null,
        updatedAt: mongoDetail?.source.updatedAt ?? sqlDetail?.source.updatedAt ?? null
      },
      blocks: {
        demography: this.pickBlock(sqlDetail?.blocks.demography, mongoDetail?.blocks.demography),
        security: this.pickBlock(sqlDetail?.blocks.security, mongoDetail?.blocks.security),
        qualityOfLife: this.pickBlock(
          sqlDetail?.blocks.qualityOfLife,
          mongoDetail?.blocks.qualityOfLife
        ),
        services: this.pickBlock(sqlDetail?.blocks.services, mongoDetail?.blocks.services),
        realEstate: this.pickBlock(sqlDetail?.blocks.realEstate, mongoDetail?.blocks.realEstate)
      },
      reviews: {
        count: mongoDetail?.reviews.count ?? sqlDetail?.reviews.count ?? 0,
        positive: mongoDetail?.reviews.positive ?? sqlDetail?.reviews.positive ?? [],
        negative: mongoDetail?.reviews.negative ?? sqlDetail?.reviews.negative ?? [],
        all: mongoDetail?.reviews.all ?? sqlDetail?.reviews.all ?? []
      }
    };
  }

  private mergeCityRows(sqlRow: CityRow | null, mongoRow: CityRow | null): CityRow | null {
    if (!sqlRow && !mongoRow) {
      return null;
    }

    return {
      com: sqlRow?.com ?? mongoRow?.com ?? "",
      nccenr: sqlRow?.nccenr ?? mongoRow?.nccenr ?? "",
      nb_habitant: sqlRow?.nb_habitant ?? mongoRow?.nb_habitant ?? null,
      age_moyen: sqlRow?.age_moyen ?? mongoRow?.age_moyen ?? null,
      pop_active: sqlRow?.pop_active ?? mongoRow?.pop_active ?? null,
      score_securite: sqlRow?.score_securite ?? mongoRow?.score_securite ?? null,
      score_environnement: sqlRow?.score_environnement ?? mongoRow?.score_environnement ?? null,
      score_vie_pratique: sqlRow?.score_vie_pratique ?? mongoRow?.score_vie_pratique ?? null,
      score_loisirs: sqlRow?.score_loisirs ?? mongoRow?.score_loisirs ?? null,
      score_sante: sqlRow?.score_sante ?? mongoRow?.score_sante ?? null,
      score_transports: sqlRow?.score_transports ?? mongoRow?.score_transports ?? null,
      score_education: sqlRow?.score_education ?? mongoRow?.score_education ?? null
    };
  }

  private pickBlock(
    primary: Record<string, PrimitiveMetric> | undefined,
    fallback: Record<string, PrimitiveMetric> | undefined
  ): Record<string, PrimitiveMetric> {
    if (primary && Object.keys(primary).length > 0) {
      return primary;
    }

    return fallback ?? {};
  }

  private toCity(row: CityRow): City {
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

  private async safePostgresCall<T>(callback: () => Promise<T | null> | undefined): Promise<T | null> {
    try {
      return (await callback()) ?? null;
    } catch {
      return null;
    }
  }

  private async safeMongoDetailLookup(code: string): Promise<CityDetailRow | null> {
    try {
      return await this.repository.findDetailByCode(code);
    } catch {
      return null;
    }
  }
}

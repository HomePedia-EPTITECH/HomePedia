import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { parseMetricValue, toIsoString } from "../../common/format";
import { ReviewsRepository } from "../reviews/reviews.repository";
import { GetCitiesQueryDto } from "./dto/get-cities-query.dto";
import {
  CitiesResponseDto,
  CityDetailResponseDto,
  CityResponseDto
} from "./dto/city-response.dto";
import {
  DepartementResponseDto,
  DepartementsResponseDto
} from "./dto/departement-response.dto";
import {
  RegionResponseDto,
  RegionsResponseDto
} from "./dto/region-response.dto";
import { City, Departement, Region } from "./types";
import {
  CityDetailRow,
  CityRow,
  GeoCitiesPostgresRepository
} from "./geo-cities.postgres.repository";
import {
  DepartementRow,
  GeoDepartementsPostgresRepository,
} from "./geo-departements.postgres.repository";
import { GeoRegionsPostgresRepository, RegionRow } from "./geo-regions.postgres.repository";

type ReviewDocument = Awaited<ReturnType<ReviewsRepository["findByCityCode"]>>;

@Injectable()
export class GeoService {
  constructor(
    private readonly citiesRepository: GeoCitiesPostgresRepository,
    private readonly departementsRepository: GeoDepartementsPostgresRepository,
    private readonly regionsRepository: GeoRegionsPostgresRepository,
    private readonly reviewsRepository: ReviewsRepository
  ) {}

  async getCities(query: GetCitiesQueryDto): Promise<CitiesResponseDto> {
    const scopedCodes =
      query.nb_avis_min !== undefined
        ? await this.getReviewScopedCityCodes(query.nb_avis_min)
        : undefined;

    let rows: CityRow[];
    let total: number;
    try {
      [rows, total] = await Promise.all([
        this.citiesRepository.findAll(query, scopedCodes),
        this.citiesRepository.countAll(query, scopedCodes)
      ]);
    } catch {
      throw new ServiceUnavailableException("Cities data source is unavailable");
    }

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

  async getCityByCode(code: string): Promise<CityResponseDto> {
    let row: CityRow | null;
    try {
      row = await this.citiesRepository.findByCode(code);
    } catch {
      throw new ServiceUnavailableException("Cities data source is unavailable");
    }
    if (!row) {
      throw new NotFoundException(`City ${code} not found`);
    }

    return {
      data: this.toCity(row)
    };
  }

  async getCityDetailsByCode(code: string): Promise<CityDetailResponseDto> {
    let sqlDetail: CityDetailRow | null;
    try {
      sqlDetail = await this.citiesRepository.findDetailByCode(code);
    } catch {
      throw new ServiceUnavailableException("Cities data source is unavailable");
    }
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
          realEstate: { values: detail.blocks.realEstate },
          salary: { values: detail.blocks.salary }
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

  async getDepartements(): Promise<DepartementsResponseDto> {
    let rows: DepartementRow[] | null;
    try {
      rows = await this.departementsRepository.findAll();
    } catch {
      throw new ServiceUnavailableException("Departements data source is unavailable");
    }

    return {
      data: (rows ?? []).map((row) => this.toDepartement(row))
    };
  }

  async getDepartementByCode(code: string): Promise<DepartementResponseDto> {
    let row: DepartementRow | null;
    try {
      row = await this.departementsRepository.findByCode(code);
    } catch {
      throw new ServiceUnavailableException("Departements data source is unavailable");
    }
    if (!row) {
      throw new NotFoundException(`Departement ${code} not found`);
    }

    return {
      data: this.toDepartement(row)
    };
  }

  async getDepartementCities(code: string, query: GetCitiesQueryDto): Promise<CitiesResponseDto> {
    let row: DepartementRow | null;
    try {
      row = await this.departementsRepository.findByCode(code);
    } catch {
      throw new ServiceUnavailableException("Departements data source is unavailable");
    }
    if (!row) {
      throw new NotFoundException(`Departement ${code} not found`);
    }

    const scopedQuery: GetCitiesQueryDto = {
      ...query,
      code_dept: row.code
    };

    return this.getCities(scopedQuery);
  }

  async getRegions(): Promise<RegionsResponseDto> {
    let rows: RegionRow[] | null;
    try {
      rows = await this.regionsRepository.findRegions();
    } catch {
      throw new ServiceUnavailableException("Regions data source is unavailable");
    }

    return {
      data: (rows ?? []).map((row) => this.toRegion(row))
    };
  }

  async getRegionByCode(code: string): Promise<RegionResponseDto> {
    let row: RegionRow | null;
    try {
      row = await this.regionsRepository.findRegionByCode(code);
    } catch {
      throw new ServiceUnavailableException("Regions data source is unavailable");
    }
    if (!row) {
      throw new NotFoundException(`Region ${code} not found`);
    }

    return {
      data: this.toRegion(row)
    };
  }

  async getRegionDepartements(code: string): Promise<DepartementsResponseDto> {
    let region: RegionRow | null;
    try {
      region = await this.regionsRepository.findRegionByCode(code);
    } catch {
      throw new ServiceUnavailableException("Regions data source is unavailable");
    }
    if (!region) {
      throw new NotFoundException(`Region ${code} not found`);
    }

    let rows: DepartementRow[] | null;
    try {
      rows = await this.regionsRepository.findDepartementsByRegionCode(code);
    } catch {
      throw new ServiceUnavailableException("Regions data source is unavailable");
    }

    return {
      data: (rows ?? []).map((row) => this.toDepartement(row))
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
        },
        salary: {
          cadre: parseMetricValue(row.salaire_net_mensuel_moyen_cadre),
          profIntermediaire: parseMetricValue(row.salaire_net_mensuel_moyen_prof_intermediaire),
          employe: parseMetricValue(row.salaire_net_mensuel_moyen_employe),
          ouvrier: parseMetricValue(row.salaire_net_mensuel_moyen_ouvrier),
          total: parseMetricValue(row.salaire_net_mensuel_moyen_total)
        }
      }
    };
  }

  private toDepartement(row: DepartementRow): Departement {
    return {
      code: row.code,
      name: row.name ?? null,
      cityCount: row.cityCount,
      updatedAt: toIsoString(row.updatedAt)
    };
  }

  private toRegion(row: RegionRow): Region {
    return {
      code: row.code,
      name: row.name ?? null,
      departementCount: row.departementCount,
      cityCount: row.cityCount,
      updatedAt: toIsoString(row.updatedAt)
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

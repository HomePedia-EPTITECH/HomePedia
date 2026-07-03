import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { parseMetricValue, toIsoString } from "../../common/format";
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

@Injectable()
export class GeoService {
  constructor(
    private readonly citiesRepository: GeoCitiesPostgresRepository,
    private readonly departementsRepository: GeoDepartementsPostgresRepository,
    private readonly regionsRepository: GeoRegionsPostgresRepository
  ) {}

  async getCities(query: GetCitiesQueryDto): Promise<CitiesResponseDto> {
    let rows: CityRow[];
    let total: number;
    try {
      [rows, total] = await Promise.all([
        this.citiesRepository.findAll(query),
        this.citiesRepository.countAll(query)
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

    return {
      data: {
        city: this.toCity(sqlDetail.city),
        admin: {
          codeDept: sqlDetail.admin.codeDept,
          postalCode: sqlDetail.admin.postalCode,
          region: sqlDetail.admin.region,
          departement: sqlDetail.admin.departement,
          metropole: sqlDetail.admin.metropole,
          mayor: sqlDetail.admin.mayor
        },
        source: {
          provider: sqlDetail.source.provider,
          cityPage: sqlDetail.source.cityPage,
          reviewsPage: sqlDetail.source.reviewsPage,
          harvestedAt: toIsoString(sqlDetail.source.harvestedAt),
          updatedAt: toIsoString(sqlDetail.source.updatedAt)
        },
        blocks: {
          demography: { values: sqlDetail.blocks.demography },
          security: { values: sqlDetail.blocks.security },
          qualityOfLife: { values: sqlDetail.blocks.qualityOfLife },
          services: { values: sqlDetail.blocks.services },
          realEstate: { values: sqlDetail.blocks.realEstate },
          salary: { values: sqlDetail.blocks.salary }
        },
        reviews: sqlDetail.reviews
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

}

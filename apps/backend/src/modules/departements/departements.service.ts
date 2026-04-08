import { Injectable, NotFoundException } from "@nestjs/common";
import { toIsoString } from "../../common/format";
import { CitiesService } from "../cities/cities.service";
import { GetCitiesQueryDto } from "../cities/dto/get-cities-query.dto";
import { CitiesResponse } from "../cities/types";
import {
  Departement,
  DepartementResponse,
  DepartementsResponse
} from "./types";
import { PostgresDepartementsRepository } from "./departements.postgres.repository";

type DepartementRow = {
  code: string;
  name: string | null;
  cityCount: number;
  updatedAt: Date | string | number | null;
};

@Injectable()
export class DepartementsService {
  constructor(
    private readonly citiesService: CitiesService,
    private readonly postgresRepository: PostgresDepartementsRepository
  ) {}

  async findAll(): Promise<DepartementsResponse> {
    const rows = (await this.postgresRepository.findAll()) ?? [];

    return {
      data: rows.map((row) => this.toDepartement(row))
    };
  }

  async findOne(code: string): Promise<DepartementResponse> {
    const row = await this.postgresRepository.findByCode(code);
    if (!row) {
      throw new NotFoundException(`Departement ${code} not found`);
    }

    return {
      data: this.toDepartement(row)
    };
  }

  async findCities(code: string, query: GetCitiesQueryDto): Promise<CitiesResponse> {
    const row = await this.postgresRepository.findByCode(code);
    if (!row) {
      throw new NotFoundException(`Departement ${code} not found`);
    }

    const scopedQuery: GetCitiesQueryDto = {
      ...query,
      code_dept: row.code
    };

    return this.citiesService.getCities(scopedQuery);
  }

  private toDepartement(row: NonNullable<DepartementRow>): Departement {
    return {
      code: row.code,
      name: row.name ?? null,
      cityCount: row.cityCount,
      updatedAt: toIsoString(row.updatedAt)
    };
  }
}

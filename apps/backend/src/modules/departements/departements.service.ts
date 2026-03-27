import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { CitiesService } from "../cities/cities.service";
import { GetCitiesQueryDto } from "../cities/dto/get-cities-query.dto";
import { CitiesResponse } from "../cities/models/city.model";
import {
  Departement,
  DepartementResponse,
  DepartementsResponse
} from "./models/departement.model";
import { PostgresDepartementsRepository } from "./departements.postgres.repository";
import { DepartementRow } from "./departements.read-model";
import { DepartementsRepository } from "./departements.repository";

@Injectable()
export class DepartementsService {
  constructor(
    private readonly repository: DepartementsRepository,
    private readonly citiesService: CitiesService,
    @Optional() private readonly postgresRepository?: PostgresDepartementsRepository
  ) {}

  async findAll(): Promise<DepartementsResponse> {
    const sqlRows = await this.safePostgresCall(() => this.postgresRepository?.findAll());
    const rows = sqlRows && sqlRows.length > 0 ? sqlRows : await this.repository.findAll();

    return {
      data: rows.map((row) => this.toDepartement(row))
    };
  }

  async findOne(code: string): Promise<DepartementResponse> {
    const sqlRow = await this.safePostgresCall(() => this.postgresRepository?.findByCode(code));
    const row = sqlRow ?? (await this.repository.findByCode(code));
    if (!row) {
      throw new NotFoundException(`Departement ${code} not found`);
    }

    return {
      data: this.toDepartement(row)
    };
  }

  async findCities(code: string, query: GetCitiesQueryDto): Promise<CitiesResponse> {
    const sqlRow = await this.safePostgresCall(() => this.postgresRepository?.findByCode(code));
    const row = sqlRow ?? (await this.repository.findByCode(code));
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
      updatedAt: this.toIsoString(row.updatedAt)
    };
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
}

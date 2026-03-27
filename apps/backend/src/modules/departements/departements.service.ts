import { Injectable, NotFoundException } from "@nestjs/common";
import {
  Departement,
  DepartementResponse,
  DepartementsResponse
} from "./models/departement.model";
import { DepartementsRepository } from "./departements.repository";

type DepartementRow = Awaited<ReturnType<DepartementsRepository["findByCode"]>>;

@Injectable()
export class DepartementsService {
  constructor(private readonly repository: DepartementsRepository) {}

  async findAll(): Promise<DepartementsResponse> {
    const rows = await this.repository.findAll();
    return {
      data: rows.map((row) => this.toDepartement(row))
    };
  }

  async findOne(code: string): Promise<DepartementResponse> {
    const row = await this.repository.findByCode(code);
    if (!row) {
      throw new NotFoundException(`Departement ${code} not found`);
    }

    return {
      data: this.toDepartement(row)
    };
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
}

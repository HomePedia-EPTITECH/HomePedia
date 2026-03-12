import { Injectable } from "@nestjs/common";
import { CreateKpiDto } from "../dto/create-kpi.dto";
import { UpdateKpiDto } from "../dto/update-kpi.dto";
import { DbService } from "../db/db.service";
import { Kpi } from "../models/kpi.model";

type KpiRow = {
  id: number;
  name: string;
  value: number;
  unit: string | null;
  source: string | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
};

const KPI_FIELDS = `
  id,
  name,
  value,
  unit,
  source,
  captured_at AS "capturedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

@Injectable()
export class KpiRepository {
  constructor(private readonly db: DbService) {}

  async create(dto: CreateKpiDto): Promise<Kpi> {
    const query = `
      INSERT INTO bdd.kpis (name, value, unit, source, captured_at)
      VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))
      RETURNING ${KPI_FIELDS}
    `;

    const { rows } = await this.db.query<KpiRow>(query, [
      dto.name,
      dto.value,
      dto.unit ?? null,
      dto.source ?? null,
      dto.capturedAt ?? null
    ]);

    return rows[0];
  }

  async findAll(): Promise<Kpi[]> {
    const query = `
      SELECT ${KPI_FIELDS}
      FROM bdd.kpis
      ORDER BY captured_at DESC, id DESC
    `;
    const { rows } = await this.db.query<KpiRow>(query);
    return rows;
  }

  async findById(id: number): Promise<Kpi | null> {
    const query = `
      SELECT ${KPI_FIELDS}
      FROM bdd.kpis
      WHERE id = $1
    `;
    const { rows } = await this.db.query<KpiRow>(query, [id]);
    return rows[0] ?? null;
  }

  async update(id: number, dto: UpdateKpiDto): Promise<Kpi | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (dto.name !== undefined) {
      setClauses.push(`name = $${index++}`);
      values.push(dto.name);
    }
    if (dto.value !== undefined) {
      setClauses.push(`value = $${index++}`);
      values.push(dto.value);
    }
    if (dto.unit !== undefined) {
      setClauses.push(`unit = $${index++}`);
      values.push(dto.unit);
    }
    if (dto.source !== undefined) {
      setClauses.push(`source = $${index++}`);
      values.push(dto.source);
    }
    if (dto.capturedAt !== undefined) {
      setClauses.push(`captured_at = $${index++}`);
      values.push(dto.capturedAt);
    }

    if (setClauses.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE bdd.kpis
      SET ${setClauses.join(", ")}
      WHERE id = $${index}
      RETURNING ${KPI_FIELDS}
    `;

    const { rows } = await this.db.query<KpiRow>(query, values);
    return rows[0] ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const query = "DELETE FROM bdd.kpis WHERE id = $1";
    const result = await this.db.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}


import { Injectable } from "@nestjs/common";
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
}

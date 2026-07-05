import { Injectable } from "@nestjs/common";
import { PostgresReadRepository } from "../../common/postgres-read.repository";
import { DbService } from "../../db/db.service";
import { normalizeDepartmentName } from "./french-departments";

export type DepartementRow = {
  code: string;
  name: string | null;
  cityCount: number;
  updatedAt: Date | string | number | null;
};

@Injectable()
export class GeoDepartementsPostgresRepository extends PostgresReadRepository {
  constructor(dbService: DbService) {
    super(dbService);
  }

  async findAll(): Promise<DepartementRow[] | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("departement")) {
      return null;
    }

    const result = await this.dbService.query<DepartementRow>(this.buildQuery(tables));
    return result.rows.map((row) => this.normalizeRow(row));
  }

  async findByCode(code: string): Promise<DepartementRow | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("departement")) {
      return null;
    }

    const result = await this.dbService.query<DepartementRow>(
      this.buildQuery(tables, true),
      [code.toUpperCase()]
    );

    return result.rows[0] ? this.normalizeRow(result.rows[0]) : null;
  }

  private buildQuery(tables: Set<string>, scoped = false): string {
    const cityCountSelect = tables.has("commune")
      ? `COUNT(c.${this.quoteIdentifier("commune_id")})::int`
      : "0::int";

    const cityJoin = tables.has("commune")
      ? `
        LEFT JOIN ${this.relation("commune")} c
          ON c.${this.quoteIdentifier("departement_id")}::text = d.${this.quoteIdentifier("numero_departement")}::text
      `
      : "";

    return `
      SELECT
        d.${this.quoteIdentifier("numero_departement")}::text AS ${this.quoteIdentifier("code")},
        d.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("name")},
        ${cityCountSelect} AS ${this.quoteIdentifier("cityCount")},
        NULL AS ${this.quoteIdentifier("updatedAt")}
      FROM ${this.relation("departement")} d
      ${cityJoin}
      ${scoped ? `WHERE d.${this.quoteIdentifier("numero_departement")}::text = $1` : ""}
      GROUP BY d.${this.quoteIdentifier("numero_departement")}, d.${this.quoteIdentifier("nom")}
      ORDER BY d.${this.quoteIdentifier("numero_departement")}::text ASC
    `;
  }

  private normalizeRow(row: DepartementRow): DepartementRow {
    return {
      ...row,
      name: normalizeDepartmentName(row.code, row.name)
    };
  }
}

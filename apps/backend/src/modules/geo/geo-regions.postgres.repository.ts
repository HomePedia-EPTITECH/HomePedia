import { Injectable } from "@nestjs/common";
import { PostgresReadRepository } from "../../common/postgres-read.repository";
import { DbService } from "../../db/db.service";
import { DepartementRow } from "./geo-departements.postgres.repository";

export type RegionRow = {
  code: string;
  name: string | null;
  departementCount: number;
  cityCount: number;
  updatedAt: Date | string | number | null;
};

type RegionBaseRow = {
  code: string;
  name: string | null;
  updatedAt: Date | string | number | null;
};

@Injectable()
export class GeoRegionsPostgresRepository extends PostgresReadRepository {
  constructor(dbService: DbService) {
    super(dbService);
  }

  async findRegions(): Promise<RegionRow[] | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("region")) {
      return null;
    }

    const result = await this.dbService.query<RegionBaseRow>(this.buildRegionQuery(tables));
    return Promise.all(
      result.rows.map(async (row) => ({
        ...row,
        departementCount: await this.countDepartementsByRegionCode(row.code),
        cityCount: await this.countCitiesByRegionCode(row.code)
      }))
    );
  }

  async findRegionByCode(code: string): Promise<RegionRow | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("region")) {
      return null;
    }

    const result = await this.dbService.query<RegionBaseRow>(
      this.buildRegionQuery(tables, true),
      [code]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      ...row,
      departementCount: await this.countDepartementsByRegionCode(row.code),
      cityCount: await this.countCitiesByRegionCode(row.code)
    };
  }

  async findDepartementsByRegionCode(code: string): Promise<DepartementRow[] | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("region")) {
      return null;
    }

    if (!tables.has("departement")) {
      return [];
    }

    const result = await this.dbService.query<DepartementRow>(
      this.buildDepartementsByRegionQuery(tables),
      [code]
    );

    return result.rows;
  }

  private buildRegionQuery(tables: Set<string>, scoped = false): string {
    return `
      SELECT
        r.${this.quoteIdentifier("numero_region")}::text AS ${this.quoteIdentifier("code")},
        r.${this.quoteIdentifier("name")} AS ${this.quoteIdentifier("name")},
        NULL AS ${this.quoteIdentifier("updatedAt")}
      FROM ${this.relation("region")} r
      ${scoped ? `WHERE r.${this.quoteIdentifier("numero_region")}::text = $1` : ""}
      ORDER BY r.${this.quoteIdentifier("numero_region")}::text ASC
    `;
  }

  private buildDepartementsByRegionQuery(tables: Set<string>): string {
    const cityJoin = tables.has("commune")
      ? `
        LEFT JOIN ${this.relation("commune")} c
          ON c.${this.quoteIdentifier("departement_id")} = d.${this.quoteIdentifier("id")}
      `
      : "";

    const cityCount = tables.has("commune")
      ? `COUNT(c.${this.quoteIdentifier("id")})::int`
      : "0::int";

    return `
      SELECT
        d.${this.quoteIdentifier("numero_departement")}::text AS ${this.quoteIdentifier("code")},
        d.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("name")},
        ${cityCount} AS ${this.quoteIdentifier("cityCount")},
        NULL AS ${this.quoteIdentifier("updatedAt")}
      FROM ${this.relation("departement")} d
      ${cityJoin}
      WHERE d.${this.quoteIdentifier("region_id")} = $1::int
      GROUP BY d.${this.quoteIdentifier("id")}, d.${this.quoteIdentifier("numero_departement")}, d.${this.quoteIdentifier("nom")}
      ORDER BY d.${this.quoteIdentifier("numero_departement")}::text ASC
    `;
  }

  private async countDepartementsByRegionCode(code: string): Promise<number> {
    const tables = await this.getAvailableTables();
    if (!tables.has("departement")) {
      return 0;
    }

    const result = await this.dbService.query<{ total: number }>(
      `
        SELECT COUNT(*)::int AS ${this.quoteIdentifier("total")}
        FROM ${this.relation("departement")}
        WHERE ${this.quoteIdentifier("region_id")} = $1::int
      `,
      [code]
    );

    return result.rows[0]?.total ?? 0;
  }

  private async countCitiesByRegionCode(code: string): Promise<number> {
    const tables = await this.getAvailableTables();
    if (!tables.has("departement") || !tables.has("commune")) {
      return 0;
    }

    const result = await this.dbService.query<{ total: number }>(
      `
        SELECT COUNT(*)::int AS ${this.quoteIdentifier("total")}
        FROM ${this.relation("commune")} c
        INNER JOIN ${this.relation("departement")} d
          ON c.${this.quoteIdentifier("departement_id")} = d.${this.quoteIdentifier("id")}
        WHERE d.${this.quoteIdentifier("region_id")} = $1::int
      `,
      [code]
    );

    return result.rows[0]?.total ?? 0;
  }
}

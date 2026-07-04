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

type RegionCountsRow = {
  code: string;
  departementCount: number;
  cityCount: number;
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

    const [result, counts] = await Promise.all([
      this.dbService.query<RegionBaseRow>(this.buildRegionQuery()),
      this.findRegionCounts(tables)
    ]);

    return result.rows.map((row) => ({
      ...row,
      departementCount: counts.get(row.code)?.departementCount ?? 0,
      cityCount: counts.get(row.code)?.cityCount ?? 0
    }));
  }

  async findRegionByCode(code: string): Promise<RegionRow | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("region")) {
      return null;
    }

    const result = await this.dbService.query<RegionBaseRow>(
      this.buildRegionQuery(true),
      [code]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const counts = await this.findRegionCounts(tables, code);

    return {
      ...row,
      departementCount: counts.get(row.code)?.departementCount ?? 0,
      cityCount: counts.get(row.code)?.cityCount ?? 0
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

  private buildRegionQuery(scoped = false): string {
    return `
      SELECT
        r.${this.quoteIdentifier("numero_region")}::text AS ${this.quoteIdentifier("code")},
        r.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("name")},
        NULL AS ${this.quoteIdentifier("updatedAt")}
      FROM ${this.relation("region")} r
      ${scoped ? `WHERE r.${this.quoteIdentifier("numero_region")}::text = $1::text` : ""}
      ORDER BY r.${this.quoteIdentifier("numero_region")}::text ASC
    `;
  }

  private buildRegionCountsQuery(tables: Set<string>, scopedCode?: string): string | null {
    if (!tables.has("departement")) {
      return null;
    }

    const scopedFilter = scopedCode ? `WHERE d.${this.quoteIdentifier("region_id")}::text = $1::text` : "";
    const cityCounts = tables.has("commune")
      ? `
        , city_counts AS (
          SELECT
            d.${this.quoteIdentifier("region_id")}::text AS ${this.quoteIdentifier("code")},
            COUNT(c.${this.quoteIdentifier("commune_id")})::int AS ${this.quoteIdentifier("cityCount")}
          FROM ${this.relation("departement")} d
          INNER JOIN ${this.relation("commune")} c
            ON c.${this.quoteIdentifier("departement_id")}::text = d.${this.quoteIdentifier("numero_departement")}::text
          ${scopedFilter}
          GROUP BY d.${this.quoteIdentifier("region_id")}::text
        )
      `
      : "";

    return `
      WITH departement_counts AS (
        SELECT
          d.${this.quoteIdentifier("region_id")}::text AS ${this.quoteIdentifier("code")},
          COUNT(*)::int AS ${this.quoteIdentifier("departementCount")}
        FROM ${this.relation("departement")} d
        ${scopedFilter}
        GROUP BY d.${this.quoteIdentifier("region_id")}::text
      )
      ${cityCounts}
      SELECT
        dc.${this.quoteIdentifier("code")} AS ${this.quoteIdentifier("code")},
        dc.${this.quoteIdentifier("departementCount")} AS ${this.quoteIdentifier("departementCount")},
        ${tables.has("commune")
          ? `COALESCE(cc.${this.quoteIdentifier("cityCount")}, 0)::int`
          : "0::int"
        } AS ${this.quoteIdentifier("cityCount")}
      FROM departement_counts dc
      ${tables.has("commune")
        ? `LEFT JOIN city_counts cc
            ON cc.${this.quoteIdentifier("code")} = dc.${this.quoteIdentifier("code")}`
        : ""
      }
    `;
  }

  private async findRegionCounts(
    tables: Set<string>,
    scopedCode?: string
  ): Promise<Map<string, RegionCountsRow>> {
    const sql = this.buildRegionCountsQuery(tables, scopedCode);
    if (!sql) {
      return new Map();
    }

    const result = await this.dbService.query<RegionCountsRow>(
      sql,
      scopedCode ? [scopedCode] : []
    );

    return new Map(result.rows.map((row) => [row.code, row]));
  }

  private buildDepartementsByRegionQuery(tables: Set<string>): string {
    const cityJoin = tables.has("commune")
      ? `
        LEFT JOIN ${this.relation("commune")} c
          ON c.${this.quoteIdentifier("departement_id")}::text = d.${this.quoteIdentifier("numero_departement")}::text
      `
      : "";

    const cityCount = tables.has("commune")
      ? `COUNT(c.${this.quoteIdentifier("commune_id")})::int`
      : "0::int";

    return `
      SELECT
        d.${this.quoteIdentifier("numero_departement")}::text AS ${this.quoteIdentifier("code")},
        d.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("name")},
        ${cityCount} AS ${this.quoteIdentifier("cityCount")},
        NULL AS ${this.quoteIdentifier("updatedAt")}
      FROM ${this.relation("departement")} d
      ${cityJoin}
      WHERE d.${this.quoteIdentifier("region_id")}::text = $1::text
      GROUP BY d.${this.quoteIdentifier("numero_departement")}, d.${this.quoteIdentifier("nom")}
      ORDER BY d.${this.quoteIdentifier("numero_departement")}::text ASC
    `;
  }
}

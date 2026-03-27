import { Injectable } from "@nestjs/common";
import { PostgresReadRepository } from "../common/postgres-read.repository";
import { DbService } from "../db/db.service";

export type PostgresKpiSnapshot = {
  total_cities: number;
  avg_population: number | null;
  avg_security_score: number | null;
  avg_environment_score: number | null;
  avg_house_price_m2: number | null;
  avg_apartment_price_m2: number | null;
  captured_at: Date | string | number | null;
};

@Injectable()
export class PostgresKpiRepository extends PostgresReadRepository {
  constructor(dbService: DbService) {
    super(dbService);
  }

  async computeSnapshot(): Promise<PostgresKpiSnapshot | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("commune")) {
      return null;
    }

    const result = await this.dbService.query<PostgresKpiSnapshot>(this.buildQuery(tables));
    return result.rows[0] ?? null;
  }

  private buildQuery(tables: Set<string>): string {
    const joins = [
      tables.has("demographie")
        ? `
          LEFT JOIN ${this.relation("demographie")} d
            ON d.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}
        `
        : "",
      tables.has("scores")
        ? `
          LEFT JOIN ${this.relation("scores")} s
            ON s.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}
        `
        : "",
      tables.has("immobilier")
        ? `
          LEFT JOIN ${this.relation("immobilier")} i
            ON i.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}
        `
        : ""
    ]
      .filter(Boolean)
      .join("\n");

    const avgPopulation = tables.has("demographie")
      ? `AVG(d.${this.quoteIdentifier("population")})::float`
      : "NULL::float";
    const avgSecurity = tables.has("scores")
      ? `AVG(s.${this.quoteIdentifier("score_securite")})::float`
      : "NULL::float";
    const avgEnvironment = tables.has("scores")
      ? `AVG(s.${this.quoteIdentifier("score_environnement")})::float`
      : "NULL::float";
    const avgHousePrice = tables.has("immobilier")
      ? `AVG(i.${this.quoteIdentifier("prix_m2_maison")})::float`
      : "NULL::float";
    const avgApartmentPrice = tables.has("immobilier")
      ? `AVG(i.${this.quoteIdentifier("prix_m2_appartement")})::float`
      : "NULL::float";

    return `
      SELECT
        COUNT(*)::int AS ${this.quoteIdentifier("total_cities")},
        ${avgPopulation} AS ${this.quoteIdentifier("avg_population")},
        ${avgSecurity} AS ${this.quoteIdentifier("avg_security_score")},
        ${avgEnvironment} AS ${this.quoteIdentifier("avg_environment_score")},
        ${avgHousePrice} AS ${this.quoteIdentifier("avg_house_price_m2")},
        ${avgApartmentPrice} AS ${this.quoteIdentifier("avg_apartment_price_m2")},
        CURRENT_TIMESTAMP AS ${this.quoteIdentifier("captured_at")}
      FROM ${this.relation("commune")} c
      ${joins}
    `;
  }
}

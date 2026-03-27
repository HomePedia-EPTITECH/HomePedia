import { Injectable } from "@nestjs/common";
import { DbService } from "../../db/db.service";
import { CitySortBy, GetCitiesQueryDto, SortOrder } from "./dto/get-cities-query.dto";

type CityRow = {
  com: string;
  nccenr: string;
  nb_habitant: string | number | null;
  age_moyen: string | number | null;
  pop_active: string | number | null;
  score_securite: string | number | null;
  score_environnement: string | number | null;
  score_vie_pratique: string | number | null;
  score_loisirs: string | number | null;
  score_sante: string | number | null;
  score_transports: string | number | null;
  score_education: string | number | null;
};

type OverviewRow = {
  total_cities: number;
  avg_population: number | null;
  avg_security: number | null;
  avg_environment: number | null;
};

type WhereClause = {
  sql: string;
  values: unknown[];
};

const CITY_SELECT = `
  com,
  nccenr,
  nb_habitant,
  age_moyen,
  pop_active,
  score_securite,
  score_environnement,
  score_vie_pratique,
  score_loisirs,
  score_sante,
  score_transports,
  score_education
`;

const toNumericExpression = (column: string): string => `
  NULLIF(
    regexp_replace(replace(COALESCE(${column}, ''), ',', '.'), '[^0-9.\\-]', '', 'g'),
    ''
  )::double precision
`;

const SORT_COLUMNS: Record<CitySortBy, string> = {
  [CitySortBy.Name]: "nccenr",
  [CitySortBy.Population]: toNumericExpression("nb_habitant"),
  [CitySortBy.Security]: toNumericExpression("score_securite"),
  [CitySortBy.Environment]: toNumericExpression("score_environnement"),
  [CitySortBy.Health]: toNumericExpression("score_sante"),
  [CitySortBy.Transport]: toNumericExpression("score_transports"),
  [CitySortBy.Education]: toNumericExpression("score_education")
};

@Injectable()
export class CitiesRepository {
  constructor(private readonly db: DbService) {}

  async findAll(query: GetCitiesQueryDto): Promise<CityRow[]> {
    const where = this.buildWhereClause(query);
    const sortColumn = SORT_COLUMNS[query.sortBy];
    const sortOrder = query.order === SortOrder.Desc ? "DESC" : "ASC";
    const offset = (query.page - 1) * query.limit;

    const sql = `
      SELECT ${CITY_SELECT}
      FROM bdd.v_commune_2026
      ${where.sql}
      ORDER BY ${sortColumn} ${sortOrder} NULLS LAST, nccenr ASC
      LIMIT $${where.values.length + 1}
      OFFSET $${where.values.length + 2}
    `;

    const { rows } = await this.db.query<CityRow>(sql, [...where.values, query.limit, offset]);
    return rows;
  }

  async countAll(query: GetCitiesQueryDto): Promise<number> {
    const where = this.buildWhereClause(query);
    const sql = `
      SELECT COUNT(*)::int AS total
      FROM bdd.v_commune_2026
      ${where.sql}
    `;

    const { rows } = await this.db.query<{ total: number }>(sql, where.values);
    return rows[0]?.total ?? 0;
  }

  async findByCode(code: string): Promise<CityRow | null> {
    const sql = `
      SELECT ${CITY_SELECT}
      FROM bdd.v_commune_2026
      WHERE com = $1
    `;

    const { rows } = await this.db.query<CityRow>(sql, [code]);
    return rows[0] ?? null;
  }

  async getOverviewMetrics(): Promise<OverviewRow> {
    const sql = `
      SELECT
        COUNT(*)::int AS total_cities,
        AVG(${toNumericExpression("nb_habitant")}) AS avg_population,
        AVG(${toNumericExpression("score_securite")}) AS avg_security,
        AVG(${toNumericExpression("score_environnement")}) AS avg_environment
      FROM bdd.v_commune_2026
    `;

    const { rows } = await this.db.query<OverviewRow>(sql);
    return rows[0];
  }

  async findTopCitiesByScore(
    column: "score_securite" | "score_environnement",
    limit: number
  ): Promise<CityRow[]> {
    const numericScore = toNumericExpression(column);
    const sql = `
      SELECT ${CITY_SELECT}
      FROM bdd.v_commune_2026
      WHERE ${numericScore} IS NOT NULL
      ORDER BY ${numericScore} DESC, nccenr ASC
      LIMIT $1
    `;

    const { rows } = await this.db.query<CityRow>(sql, [limit]);
    return rows;
  }

  private buildWhereClause(query: GetCitiesQueryDto): WhereClause {
    const values: unknown[] = [];
    const clauses: string[] = [];

    if (query.search) {
      values.push(`%${query.search}%`);
      const searchRef = `$${values.length}`;
      clauses.push(`(com ILIKE ${searchRef} OR nccenr ILIKE ${searchRef})`);
    }

    if (clauses.length === 0) {
      return { sql: "", values };
    }

    return {
      sql: `WHERE ${clauses.join(" AND ")}`,
      values
    };
  }
}

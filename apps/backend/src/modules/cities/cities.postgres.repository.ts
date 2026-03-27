import { Injectable } from "@nestjs/common";
import { PostgresReadRepository } from "../../common/postgres-read.repository";
import { DbService } from "../../db/db.service";
import {
  CityDetailRow,
  CityRow,
  OverviewMetricsRow,
  PrimitiveMetric
} from "./cities.read-model";

type DetailSqlRow = Record<string, string | number | null> & {
  com: string;
  nccenr: string;
  nb_habitant: PrimitiveMetric;
  age_moyen: PrimitiveMetric;
  pop_active: PrimitiveMetric;
  score_securite: PrimitiveMetric;
  score_environnement: PrimitiveMetric;
  score_vie_pratique: PrimitiveMetric;
  score_loisirs: PrimitiveMetric;
  score_sante: PrimitiveMetric;
  score_transports: PrimitiveMetric;
  score_education: PrimitiveMetric;
  code_dept: string | null;
  postal_code: string | null;
  region_name: string | null;
  departement_name: string | null;
  metropole_name: string | null;
  mayor_name: string | null;
};

const CITY_DEMOGRAPHY_COLUMNS = [
  { column: "population", alias: "nb_habitant" },
  { column: "age_moyen", alias: "age_moyen" },
  { column: "pop_active", alias: "pop_active" }
] as const;

const CITY_SCORE_COLUMNS = [
  "score_securite",
  "score_environnement",
  "score_vie_pratique",
  "score_loisirs",
  "score_education"
] as const;

const DETAIL_DEMOGRAPHY_COLUMNS = [
  "population",
  "age_moyen",
  "pop_active",
  "taux_chomage",
  "densite",
  "revenu_moyen",
  "superficie",
  "part_0_14_ans",
  "part_15_29_ans",
  "part_30_44_ans",
  "part_45_59_ans",
  "part_60_74_ans",
  "part_75_89_ans",
  "part_90_plus",
  "part_cadres",
  "part_retraites",
  "part_employes",
  "part_ouvriers",
  "part_sans_diplome",
  "part_bac5_plus",
  "part_couple_avec_enfants",
  "part_personnes_seules"
] as const;

const DETAIL_SECURITY_COLUMNS = [
  "agressions",
  "cambriolages",
  "vols_degradations",
  "stupefiants"
] as const;

const DETAIL_REAL_ESTATE_COLUMNS = [
  "prix_m2_maison",
  "prix_m2_appartement",
  "part_taux_proprietaires",
  "part_taux_locataires",
  "part_residences_principales",
  "part_residences_secondaires"
] as const;

const DETAIL_QUALITY_COLUMNS = [
  "score_securite",
  "score_education",
  "score_loisirs",
  "score_environnement",
  "score_vie_pratique",
  "score_globale"
] as const;

const DETAIL_EDUCATION_COLUMNS = [
  "nb_creches",
  "nb_ecoles_maternelles_publiques",
  "nb_ecoles_maternelles_privees",
  "nb_ecoles_primaires_publiques",
  "nb_ecoles_primaires_privees",
  "nb_colleges_publics",
  "nb_colleges_prives",
  "nb_lycees_publics",
  "nb_lycees_privees"
] as const;

const DETAIL_HEALTH_COLUMNS = [
  "nb_pharmacies",
  "nb_hopitaux",
  "nb_laboratoires_analyses",
  "nb_etablissement_handicapes",
  "nb_ehpa",
  "nb_medecins",
  "nb_dentistes",
  "nb_chirurgiens",
  "nb_dermatologues",
  "nb_anesthesistes",
  "nb_gastroenterologues",
  "nb_gynecologues",
  "nb_cancerologues",
  "nb_neurologues",
  "nb_ophtalmologues",
  "nb_orl",
  "nb_cardiologues",
  "nb_pediatres",
  "nb_pneumologues",
  "nb_psychologues",
  "nb_radiologues",
  "nb_rhumatologues",
  "nb_sages_femmes"
] as const;

const DETAIL_COMMERCE_COLUMNS = [
  "nb_hypermarches",
  "nb_supermarches",
  "nb_superettes",
  "nb_boulangeries",
  "nb_boucheries",
  "nb_restaurants",
  "nb_garages",
  "nb_stations_services",
  "nb_banques",
  "nb_bureaux_poste",
  "nb_coiffeurs",
  "nb_tabacs",
  "nb_bars_discotheques",
  "nb_bibliotheques",
  "nb_cinema",
  "nb_veterinaires"
] as const;

@Injectable()
export class PostgresCitiesRepository extends PostgresReadRepository {
  constructor(dbService: DbService) {
    super(dbService);
  }

  async findByCode(code: string): Promise<CityRow | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("commune")) {
      return null;
    }

    const result = await this.dbService.query<CityRow>(this.buildFindByCodeQuery(tables), [code]);
    return result.rows[0] ?? null;
  }

  async findDetailByCode(code: string): Promise<CityDetailRow | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("commune")) {
      return null;
    }

    const result = await this.dbService.query<DetailSqlRow>(this.buildFindDetailQuery(tables), [code]);
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      city: this.toCityRow(row),
      admin: {
        codeDept: row.code_dept,
        postalCode: row.postal_code,
        region: row.region_name,
        departement: row.departement_name,
        metropole: row.metropole_name,
        mayor: row.mayor_name
      },
      source: {
        provider: null,
        cityPage: null,
        reviewsPage: null,
        harvestedAt: null,
        updatedAt: null
      },
      blocks: {
        demography: this.extractBlock(row, "demography__"),
        security: this.extractBlock(row, "security__"),
        qualityOfLife: this.extractBlock(row, "quality__"),
        services: this.extractBlock(row, "services__"),
        realEstate: this.extractBlock(row, "real_estate__")
      },
      reviews: {
        count: 0,
        positive: [],
        negative: [],
        all: []
      }
    };
  }

  async getOverviewMetrics(): Promise<OverviewMetricsRow | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("commune")) {
      return null;
    }

    const result = await this.dbService.query<OverviewMetricsRow>(
      this.buildOverviewMetricsQuery(tables)
    );

    return (
      result.rows[0] ?? {
        total_cities: 0,
        avg_population: null,
        avg_security: null,
        avg_environment: null
      }
    );
  }

  async findTopCitiesByScore(
    column: "score_securite" | "score_environnement",
    limit: number
  ): Promise<CityRow[] | null> {
    const tables = await this.getAvailableTables();
    if (!tables.has("commune") || !tables.has("scores")) {
      return null;
    }

    const result = await this.dbService.query<CityRow>(
      this.buildTopCitiesQuery(tables, column),
      [limit]
    );

    return result.rows;
  }

  private buildFindByCodeQuery(tables: Set<string>): string {
    const selects = [
      `c.${this.quoteIdentifier("com")}::text AS ${this.quoteIdentifier("com")}`,
      `c.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("nccenr")}`,
      ...CITY_DEMOGRAPHY_COLUMNS.map(({ column, alias }) =>
        this.selectColumnOrNull(tables, "demographie", "d", column, alias)
      ),
      ...CITY_SCORE_COLUMNS.map((column) =>
        this.selectColumnOrNull(tables, "scores", "s", column, column)
      ),
      `NULL AS ${this.quoteIdentifier("score_sante")}`,
      `NULL AS ${this.quoteIdentifier("score_transports")}`
    ];

    const joins = [
      this.buildOptionalLeftJoin(
        tables,
        "demographie",
        "d",
        `d.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "scores",
        "s",
        `s.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      )
    ].filter(Boolean);

    return `
      SELECT
        ${selects.join(",\n        ")}
      FROM ${this.relation("commune")} c
      ${joins.join("\n      ")}
      WHERE c.${this.quoteIdentifier("com")}::text = $1
      LIMIT 1
    `;
  }

  private buildFindDetailQuery(tables: Set<string>): string {
    const selects = [
      `c.${this.quoteIdentifier("com")}::text AS ${this.quoteIdentifier("com")}`,
      `c.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("nccenr")}`,
      ...CITY_DEMOGRAPHY_COLUMNS.map(({ column, alias }) =>
        this.selectColumnOrNull(tables, "demographie", "d", column, alias)
      ),
      ...CITY_SCORE_COLUMNS.map((column) =>
        this.selectColumnOrNull(tables, "scores", "s", column, column)
      ),
      `NULL AS ${this.quoteIdentifier("score_sante")}`,
      `NULL AS ${this.quoteIdentifier("score_transports")}`,
      this.selectColumnOrNull(
        tables,
        "departement",
        "dept",
        "numero_departement",
        "code_dept",
        (expression) => `${expression}::text`
      ),
      `c.${this.quoteIdentifier("code_postal")}::text AS ${this.quoteIdentifier("postal_code")}`,
      this.selectColumnOrNull(tables, "region", "reg", "name", "region_name"),
      this.selectColumnOrNull(tables, "departement", "dept", "nom", "departement_name"),
      this.selectColumnOrNull(tables, "metropole", "metro", "nom", "metropole_name"),
      `c.${this.quoteIdentifier("maire")} AS ${this.quoteIdentifier("mayor_name")}`,
      ...DETAIL_DEMOGRAPHY_COLUMNS.map((column) =>
        this.selectColumnOrNull(tables, "demographie", "d", column, `demography__${column}`)
      ),
      ...DETAIL_SECURITY_COLUMNS.map((column) =>
        this.selectColumnOrNull(tables, "securite", "sec", column, `security__${column}`)
      ),
      ...DETAIL_REAL_ESTATE_COLUMNS.map((column) =>
        this.selectColumnOrNull(
          tables,
          "immobilier",
          "imm",
          column,
          `real_estate__${column}`
        )
      ),
      ...DETAIL_QUALITY_COLUMNS.map((column) =>
        this.selectColumnOrNull(tables, "scores", "s", column, `quality__${column}`)
      ),
      ...DETAIL_EDUCATION_COLUMNS.map((column) =>
        this.selectColumnOrNull(
          tables,
          "education",
          "edu",
          column,
          `services__education__${column}`
        )
      ),
      ...DETAIL_HEALTH_COLUMNS.map((column) =>
        this.selectColumnOrNull(tables, "sante", "health", column, `services__sante__${column}`)
      ),
      ...DETAIL_COMMERCE_COLUMNS.map((column) =>
        this.selectColumnOrNull(
          tables,
          "commerces",
          "shop",
          column,
          `services__commerces__${column}`
        )
      )
    ];

    const joins = [
      this.buildOptionalLeftJoin(
        tables,
        "demographie",
        "d",
        `d.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "scores",
        "s",
        `s.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "securite",
        "sec",
        `sec.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "immobilier",
        "imm",
        `imm.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "education",
        "edu",
        `edu.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "sante",
        "health",
        `health.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "commerces",
        "shop",
        `shop.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "departement",
        "dept",
        `dept.${this.quoteIdentifier("id")} = c.${this.quoteIdentifier("departement_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "region",
        "reg",
        `reg.${this.quoteIdentifier("numero_region")} = dept.${this.quoteIdentifier("region_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "metropole",
        "metro",
        `metro.${this.quoteIdentifier("id")} = c.${this.quoteIdentifier("metropole_id")}`
      )
    ].filter(Boolean);

    return `
      SELECT
        ${selects.join(",\n        ")}
      FROM ${this.relation("commune")} c
      ${joins.join("\n      ")}
      WHERE c.${this.quoteIdentifier("com")}::text = $1
      LIMIT 1
    `;
  }

  private buildOverviewMetricsQuery(tables: Set<string>): string {
    const populationSelect = tables.has("demographie")
      ? `AVG(d.${this.quoteIdentifier("population")})::float AS ${this.quoteIdentifier("avg_population")}`
      : `NULL::float AS ${this.quoteIdentifier("avg_population")}`;

    const securitySelect = tables.has("scores")
      ? `AVG(s.${this.quoteIdentifier("score_securite")})::float AS ${this.quoteIdentifier("avg_security")}`
      : `NULL::float AS ${this.quoteIdentifier("avg_security")}`;

    const environmentSelect = tables.has("scores")
      ? `AVG(s.${this.quoteIdentifier("score_environnement")})::float AS ${this.quoteIdentifier("avg_environment")}`
      : `NULL::float AS ${this.quoteIdentifier("avg_environment")}`;

    const joins = [
      this.buildOptionalLeftJoin(
        tables,
        "demographie",
        "d",
        `d.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "scores",
        "s",
        `s.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      )
    ].filter(Boolean);

    return `
      SELECT
        COUNT(*)::int AS ${this.quoteIdentifier("total_cities")},
        ${populationSelect},
        ${securitySelect},
        ${environmentSelect}
      FROM ${this.relation("commune")} c
      ${joins.join("\n      ")}
    `;
  }

  private buildTopCitiesQuery(
    tables: Set<string>,
    column: "score_securite" | "score_environnement"
  ): string {
    const selects = [
      `c.${this.quoteIdentifier("com")}::text AS ${this.quoteIdentifier("com")}`,
      `c.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("nccenr")}`,
      ...CITY_DEMOGRAPHY_COLUMNS.map(({ column: columnName, alias }) =>
        this.selectColumnOrNull(tables, "demographie", "d", columnName, alias)
      ),
      ...CITY_SCORE_COLUMNS.map((columnName) =>
        this.selectColumnOrNull(tables, "scores", "s", columnName, columnName)
      ),
      `NULL AS ${this.quoteIdentifier("score_sante")}`,
      `NULL AS ${this.quoteIdentifier("score_transports")}`
    ];

    const joins = [
      this.buildOptionalLeftJoin(
        tables,
        "demographie",
        "d",
        `d.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "scores",
        "s",
        `s.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("id")}`
      )
    ].filter(Boolean);

    return `
      SELECT
        ${selects.join(",\n        ")}
      FROM ${this.relation("commune")} c
      ${joins.join("\n      ")}
      WHERE s.${this.quoteIdentifier(column)} IS NOT NULL
      ORDER BY s.${this.quoteIdentifier(column)} DESC, c.${this.quoteIdentifier("nom")} ASC, c.${this.quoteIdentifier("com")} ASC
      LIMIT $1
    `;
  }

  private toCityRow(row: Pick<DetailSqlRow, keyof CityRow>): CityRow {
    return {
      com: row.com,
      nccenr: row.nccenr,
      nb_habitant: row.nb_habitant ?? null,
      age_moyen: row.age_moyen ?? null,
      pop_active: row.pop_active ?? null,
      score_securite: row.score_securite ?? null,
      score_environnement: row.score_environnement ?? null,
      score_vie_pratique: row.score_vie_pratique ?? null,
      score_loisirs: row.score_loisirs ?? null,
      score_sante: row.score_sante ?? null,
      score_transports: row.score_transports ?? null,
      score_education: row.score_education ?? null
    };
  }

  private extractBlock(
    row: Record<string, string | number | null>,
    prefix: string
  ): Record<string, PrimitiveMetric> {
    const result: Record<string, PrimitiveMetric> = {};

    for (const [key, value] of Object.entries(row)) {
      if (!key.startsWith(prefix) || value === null || value === undefined) {
        continue;
      }

      const blockKey = key.slice(prefix.length).replace(/__/g, ".");
      result[blockKey] = value;
    }

    return result;
  }
}

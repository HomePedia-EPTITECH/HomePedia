import { Injectable } from "@nestjs/common";
import { PostgresReadRepository } from "../../common/postgres-read.repository";
import { DbService } from "../../db/db.service";
import { normalizeDepartmentName } from "../geo/french-departments";
import {
  CommuneAgeDistributionRecord,
  CommuneNotes,
  CommunePriceHistoryRecord,
  CommuneRecord,
  CommuneSalary,
  CommuneServices,
  CommuneSize
} from "./communes.types";

type CommuneSqlRow = {
  com: string;
  nom: string;
  codePostal: string | null;
  codeDept: string | null;
  regionCode: string | null;
  departement: string | null;
  region: string | null;
  metropole: string | null;
  lon: number | null;
  lat: number | null;
  population: number | null;
  densite: number | null;
  superficie: number | null;
  ageMoyen: number | null;
  revenuMoyen: number | null;
  tauxChomage: number | null;
  prixM2Maison: number | null;
  prixM2Appartement: number | null;
  partProprietaires: number | null;
  partLocataires: number | null;
  partResidencesPrincipales: number | null;
  partResidencesSecondaires: number | null;
  partResidencesVacantes: number | null;
  agressions: number | null;
  cambriolages: number | null;
  volsDegradations: number | null;
  stupefiants: number | null;
  scoreSecurite: number | null;
  scoreEducation: number | null;
  scoreLoisirs: number | null;
  scoreEnvironnement: number | null;
  scoreViePratique: number | null;
  scoreGlobale: number | null;
  nbAvis: number | null;
  nbMedecins: number | null;
  nbPharmacies: number | null;
  nbHopitaux: number | null;
  nbSpecialistes: number | null;
  nbCreches: number | null;
  nbEcolesMaternellesPubliques: number | null;
  nbEcolesMaternellesPrivees: number | null;
  nbEcolesPrimairesPubliques: number | null;
  nbEcolesPrimairesPrivees: number | null;
  nbCollegesPublics: number | null;
  nbCollegesPrives: number | null;
  nbLyceesPublics: number | null;
  nbLyceesPrives: number | null;
  nbHypermarches: number | null;
  nbSupermarches: number | null;
  nbRestaurants: number | null;
  nbBanques: number | null;
  nbBoulangeries: number | null;
  salaireCadre: number | null;
  salaireProfIntermediaire: number | null;
  salaireEmploye: number | null;
  salaireOuvrier: number | null;
  salaireTotal: number | null;
};

type AgeDistributionRow = {
  part_0_14_ans: number | null;
  part_15_29_ans: number | null;
  part_30_44_ans: number | null;
  part_45_59_ans: number | null;
  part_60_74_ans: number | null;
  part_75_89_ans: number | null;
  part_90_plus: number | null;
};

@Injectable()
export class CommunesRepository extends PostgresReadRepository {
  constructor(dbService: DbService) {
    super(dbService);
  }

  async loadCatalogue(): Promise<CommuneRecord[]> {
    const tables = await this.getAvailableTables();
    if (!tables.has("commune")) {
      return [];
    }

    const result = await this.dbService.query<CommuneSqlRow>(this.buildCatalogueQuery(tables));
    return result.rows.map((row) => this.mapRow(row)).sort((a, b) => {
      const byName = a.nom.localeCompare(b.nom, "fr");
      return byName !== 0 ? byName : a.id.localeCompare(b.id);
    });
  }

  async findById(id: string): Promise<CommuneRecord | null> {
    const code = this.normalizeCode(id);
    if (!code) {
      return null;
    }

    const tables = await this.getAvailableTables();
    if (!tables.has("commune")) {
      return null;
    }

    const result = await this.dbService.query<CommuneSqlRow>(
      this.buildCatalogueQuery(tables, true),
      [code]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findPriceHistory(_code: string): Promise<CommunePriceHistoryRecord[]> {
    // La base Postgres métier ne contient pas encore d'historique de prix.
    return [];
  }

  async findAgeDistribution(id: string): Promise<CommuneAgeDistributionRecord[]> {
    const code = this.normalizeCode(id);
    if (!code) {
      return [];
    }

    const tables = await this.getAvailableTables();
    if (!tables.has("demographie")) {
      return [];
    }

    const result = await this.dbService.query<AgeDistributionRow>(
      this.buildAgeDistributionQuery(tables),
      [code]
    );

    const row = result.rows[0];
    if (!row) {
      return [];
    }

    return [
      { tranche: "0-14", part: this.asNumber(row.part_0_14_ans) ?? 0 },
      { tranche: "15-29", part: this.asNumber(row.part_15_29_ans) ?? 0 },
      { tranche: "30-44", part: this.asNumber(row.part_30_44_ans) ?? 0 },
      { tranche: "45-59", part: this.asNumber(row.part_45_59_ans) ?? 0 },
      { tranche: "60-74", part: this.asNumber(row.part_60_74_ans) ?? 0 },
      { tranche: "75-89", part: this.asNumber(row.part_75_89_ans) ?? 0 },
      { tranche: "90+", part: this.asNumber(row.part_90_plus) ?? 0 }
    ].filter((item) => item.part > 0);
  }

  private buildCatalogueQuery(tables: Set<string>, scoped = false): string {
    const joins = [
      this.buildOptionalLeftJoin(
        tables,
        "demographie",
        "d",
        `d.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "immobilier",
        "imm",
        `imm.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "securite",
        "sec",
        `sec.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "scores",
        "s",
        `s.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "education",
        "edu",
        `edu.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "sante",
        "san",
        `san.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "commerces",
        "com",
        `com.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "salaire",
        "sal",
        `sal.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "departement",
        "dept",
        `dept.${this.quoteIdentifier("numero_departement")}::text = c.${this.quoteIdentifier("departement_id")}::text`
      ),
      this.buildOptionalLeftJoin(
        tables,
        "region",
        "reg",
        `reg.${this.quoteIdentifier("numero_region")}::text = dept.${this.quoteIdentifier("region_id")}::text`
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
        c.${this.quoteIdentifier("commune_id")}::text AS ${this.quoteIdentifier("com")},
        c.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("nom")},
        c.${this.quoteIdentifier("code_postal")}::text AS ${this.quoteIdentifier("codePostal")},
        c.${this.quoteIdentifier("departement_id")}::text AS ${this.quoteIdentifier("codeDept")},
        dept.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("departement")},
        dept.${this.quoteIdentifier("region_id")}::text AS ${this.quoteIdentifier("regionCode")},
        reg.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("region")},
        metro.${this.quoteIdentifier("nom")} AS ${this.quoteIdentifier("metropole")},
        c.${this.quoteIdentifier("longitude")}::float AS ${this.quoteIdentifier("lon")},
        c.${this.quoteIdentifier("latitude")}::float AS ${this.quoteIdentifier("lat")},
        d.${this.quoteIdentifier("population")}::int AS ${this.quoteIdentifier("population")},
        d.${this.quoteIdentifier("densite")}::float AS ${this.quoteIdentifier("densite")},
        d.${this.quoteIdentifier("superficie")}::float AS ${this.quoteIdentifier("superficie")},
        d.${this.quoteIdentifier("age_moyen")}::float AS ${this.quoteIdentifier("ageMoyen")},
        d.${this.quoteIdentifier("revenu_moyen")}::float AS ${this.quoteIdentifier("revenuMoyen")},
        d.${this.quoteIdentifier("taux_chomage")}::float AS ${this.quoteIdentifier("tauxChomage")},
        imm.${this.quoteIdentifier("prix_m2_maison")}::float AS ${this.quoteIdentifier("prixM2Maison")},
        imm.${this.quoteIdentifier("prix_m2_appartement")}::float AS ${this.quoteIdentifier("prixM2Appartement")},
        imm.${this.quoteIdentifier("part_taux_proprietaires")}::float AS ${this.quoteIdentifier("partProprietaires")},
        imm.${this.quoteIdentifier("part_taux_locataires")}::float AS ${this.quoteIdentifier("partLocataires")},
        imm.${this.quoteIdentifier("part_residences_principales")}::float AS ${this.quoteIdentifier("partResidencesPrincipales")},
        imm.${this.quoteIdentifier("part_residences_secondaires")}::float AS ${this.quoteIdentifier("partResidencesSecondaires")},
        NULL::float AS ${this.quoteIdentifier("partResidencesVacantes")},
        sec.${this.quoteIdentifier("agressions")}::float AS ${this.quoteIdentifier("agressions")},
        sec.${this.quoteIdentifier("cambriolages")}::float AS ${this.quoteIdentifier("cambriolages")},
        sec.${this.quoteIdentifier("vols_degradations")}::float AS ${this.quoteIdentifier("volsDegradations")},
        sec.${this.quoteIdentifier("stupefiants")}::float AS ${this.quoteIdentifier("stupefiants")},
        s.${this.quoteIdentifier("score_securite")}::float AS ${this.quoteIdentifier("scoreSecurite")},
        s.${this.quoteIdentifier("score_education")}::float AS ${this.quoteIdentifier("scoreEducation")},
        s.${this.quoteIdentifier("score_loisirs")}::float AS ${this.quoteIdentifier("scoreLoisirs")},
        s.${this.quoteIdentifier("score_environnement")}::float AS ${this.quoteIdentifier("scoreEnvironnement")},
        s.${this.quoteIdentifier("score_vie_pratique")}::float AS ${this.quoteIdentifier("scoreViePratique")},
        s.${this.quoteIdentifier("score_globale")}::float AS ${this.quoteIdentifier("scoreGlobale")},
        NULL::int AS ${this.quoteIdentifier("nbAvis")},
        san.${this.quoteIdentifier("nb_medecins")}::float AS ${this.quoteIdentifier("nbMedecins")},
        san.${this.quoteIdentifier("nb_pharmacies")}::float AS ${this.quoteIdentifier("nbPharmacies")},
        san.${this.quoteIdentifier("nb_hopitaux")}::float AS ${this.quoteIdentifier("nbHopitaux")},
        (
          COALESCE(san.${this.quoteIdentifier("nb_dentistes")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_chirurgiens")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_dermatologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_anesthesistes")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_gastroenterologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_gynecologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_cancerologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_neurologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_ophtalmologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_orl")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_cardiologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_pediatres")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_pneumologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_psychologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_radiologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_rhumatologues")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_sages_femmes")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_laboratoires_analyses")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_etablissement_handicapes")}, 0)
          + COALESCE(san.${this.quoteIdentifier("nb_ehpa")}, 0)
        )::float AS ${this.quoteIdentifier("nbSpecialistes")},
        edu.${this.quoteIdentifier("nb_creches")}::float AS ${this.quoteIdentifier("nbCreches")},
        (
          COALESCE(edu.${this.quoteIdentifier("nb_ecoles_maternelles_publiques")}, 0)
          + COALESCE(edu.${this.quoteIdentifier("nb_ecoles_maternelles_privees")}, 0)
        )::float AS ${this.quoteIdentifier("nbEcolesMaternelles")},
        (
          COALESCE(edu.${this.quoteIdentifier("nb_ecoles_primaires_publiques")}, 0)
          + COALESCE(edu.${this.quoteIdentifier("nb_ecoles_primaires_privees")}, 0)
        )::float AS ${this.quoteIdentifier("nbEcolesPrimaires")},
        (
          COALESCE(edu.${this.quoteIdentifier("nb_colleges_publiques")}, 0)
          + COALESCE(edu.${this.quoteIdentifier("nb_colleges_privees")}, 0)
        )::float AS ${this.quoteIdentifier("nbColleges")},
        (
          COALESCE(edu.${this.quoteIdentifier("nb_lycees_publiques")}, 0)
          + COALESCE(edu.${this.quoteIdentifier("nb_lycees_privees")}, 0)
        )::float AS ${this.quoteIdentifier("nbLycees")},
        com.${this.quoteIdentifier("nb_hypermarches")}::float AS ${this.quoteIdentifier("nbHypermarches")},
        com.${this.quoteIdentifier("nb_supermarches")}::float AS ${this.quoteIdentifier("nbSupermarches")},
        com.${this.quoteIdentifier("nb_restaurants")}::float AS ${this.quoteIdentifier("nbRestaurants")},
        com.${this.quoteIdentifier("nb_banques")}::float AS ${this.quoteIdentifier("nbBanques")},
        com.${this.quoteIdentifier("nb_boulangeries")}::float AS ${this.quoteIdentifier("nbBoulangeries")},
        ${this.selectColumnOrNull(
          tables,
          "salaire",
          "sal",
          "salaire_net_mensuel_moyen_cadre",
          "salaireCadre"
        )},
        ${this.selectColumnOrNull(
          tables,
          "salaire",
          "sal",
          "salaire_net_mensuel_moyen_prof_intermediaire",
          "salaireProfIntermediaire"
        )},
        ${this.selectColumnOrNull(
          tables,
          "salaire",
          "sal",
          "salaire_net_mensuel_moyen_employe",
          "salaireEmploye"
        )},
        ${this.selectColumnOrNull(
          tables,
          "salaire",
          "sal",
          "salaire_net_mensuel_moyen_ouvrier",
          "salaireOuvrier"
        )},
        ${this.selectColumnOrNull(
          tables,
          "salaire",
          "sal",
          "salaire_net_mensuel_moyen_total",
          "salaireTotal"
        )}
      FROM ${this.relation("commune")} c
      ${joins.join("\n      ")}
      ${scoped ? `WHERE c.${this.quoteIdentifier("commune_id")}::text = $1` : ""}
      ORDER BY c.${this.quoteIdentifier("nom")} ASC, c.${this.quoteIdentifier("commune_id")} ASC
    `;
  }

  private buildAgeDistributionQuery(tables: Set<string>): string {
    const joins = this.buildOptionalLeftJoin(
      tables,
      "demographie",
      "d",
      `d.${this.quoteIdentifier("commune_id")} = c.${this.quoteIdentifier("commune_id")}`
    );

    return `
      SELECT
        d.${this.quoteIdentifier("part_0_14_ans")},
        d.${this.quoteIdentifier("part_15_29_ans")},
        d.${this.quoteIdentifier("part_30_44_ans")},
        d.${this.quoteIdentifier("part_45_59_ans")},
        d.${this.quoteIdentifier("part_60_74_ans")},
        d.${this.quoteIdentifier("part_75_89_ans")},
        d.${this.quoteIdentifier("part_90_plus")}
      FROM ${this.relation("commune")} c
      ${joins}
      WHERE c.${this.quoteIdentifier("commune_id")}::text = $1
      LIMIT 1
    `;
  }

  private mapRow(row: CommuneSqlRow): CommuneRecord {
    const population = this.asNumber(row.population);
    const metropoleName = this.asString(row.metropole);
    const scoreSecurite = this.asNumber(row.scoreSecurite);
    const scoreEducation = this.asNumber(row.scoreEducation);
    const scoreLoisirs = this.asNumber(row.scoreLoisirs);
    const scoreEnvironnement = this.asNumber(row.scoreEnvironnement);
    const scoreViePratique = this.asNumber(row.scoreViePratique);
    const scoreGlobale = this.asNumber(row.scoreGlobale);

    return {
      id: row.com,
      nom: row.nom,
      codePostal: row.codePostal,
      codeDept: row.codeDept,
      regionCode: row.regionCode,
      departement: normalizeDepartmentName(row.codeDept, row.departement),
      region: row.region,
      metropole: metropoleName,
      taille: this.deriveSize(population, metropoleName),
      lon: this.asNumber(row.lon),
      lat: this.asNumber(row.lat),
      population,
      densite: this.asNumber(row.densite),
      superficie: this.asNumber(row.superficie),
      ageMoyen: this.asNumber(row.ageMoyen),
      revenuMoyen: this.asNumber(row.revenuMoyen),
      tauxChomage: this.asNumber(row.tauxChomage),
      prixM2Maison: this.asNumber(row.prixM2Maison),
      prixM2Appartement: this.asNumber(row.prixM2Appartement),
      partProprietaires: this.asNumber(row.partProprietaires),
      partLocataires: this.asNumber(row.partLocataires),
      partResidencesPrincipales: this.asNumber(row.partResidencesPrincipales),
      partResidencesSecondaires: this.asNumber(row.partResidencesSecondaires),
      partResidencesVacantes: this.buildVacantResidences(
        row.partResidencesPrincipales,
        row.partResidencesSecondaires,
        row.partResidencesVacantes
      ),
      agressions: this.asNumber(row.agressions),
      cambriolages: this.asNumber(row.cambriolages),
      volsDegradations: this.asNumber(row.volsDegradations),
      stupefiants: this.asNumber(row.stupefiants),
      notes: {
        environnement: this.scaleScore(scoreEnvironnement, 2),
        transports: this.scaleScore(scoreViePratique, 2),
        sante: null,
        securite: this.scaleScore(scoreSecurite, 2),
        sportsLoisirs: this.scaleScore(scoreLoisirs, 2),
        culture: this.scaleScore(scoreLoisirs, 2),
        enseignement: this.scaleScore(scoreEducation, 2),
        commerces: this.scaleScore(scoreViePratique, 2),
        qualiteVie: this.scaleScore(scoreGlobale, 2)
      },
      noteGlobale: scoreGlobale,
      nbAvis: this.asNumber(row.nbAvis),
      services: this.buildServices(row),
      salary: this.buildSalary(row)
    };
  }

  private buildServices(row: CommuneSqlRow): CommuneServices {
    return {
      medecins: this.asNumber(row.nbMedecins),
      pharmacies: this.asNumber(row.nbPharmacies),
      hopitaux: this.asNumber(row.nbHopitaux),
      specialistes: this.asNumber(row.nbSpecialistes),
      creches: this.asNumber(row.nbCreches),
      ecolesMaternelles: this.sumNumbers([row.nbEcolesMaternellesPubliques, row.nbEcolesMaternellesPrivees]),
      ecolesPrimaires: this.sumNumbers([row.nbEcolesPrimairesPubliques, row.nbEcolesPrimairesPrivees]),
      colleges: this.sumNumbers([row.nbCollegesPublics, row.nbCollegesPrives]),
      lycees: this.sumNumbers([row.nbLyceesPublics, row.nbLyceesPrives]),
      hypermarches: this.asNumber(row.nbHypermarches),
      supermarches: this.asNumber(row.nbSupermarches),
      restaurants: this.asNumber(row.nbRestaurants),
      banques: this.asNumber(row.nbBanques),
      boulangeries: this.asNumber(row.nbBoulangeries)
    };
  }

  private buildSalary(row: CommuneSqlRow): CommuneSalary {
    return {
      cadre: this.asNumber(row.salaireCadre),
      profIntermediaire: this.asNumber(row.salaireProfIntermediaire),
      employe: this.asNumber(row.salaireEmploye),
      ouvrier: this.asNumber(row.salaireOuvrier),
      total: this.asNumber(row.salaireTotal)
    };
  }

  private buildVacantResidences(
    principales: number | null,
    secondaires: number | null,
    explicit: number | null
  ): number | null {
    if (explicit !== null) {
      return explicit;
    }

    if (principales === null || secondaires === null) {
      return null;
    }

    return Math.max(0, Math.round((100 - principales - secondaires) * 10) / 10);
  }

  private deriveSize(population: number | null, metropoleName: string | null): CommuneSize {
    if (metropoleName) {
      return "metropole";
    }

    if (population === null) {
      return "ville";
    }

    if (population >= 80000) {
      return "metropole";
    }

    if (population >= 3000) {
      return "ville";
    }

    return "village";
  }

  private scaleScore(value: number | null, factor: number): number | null {
    if (value === null) {
      return null;
    }

    return Math.round(value * factor * 10) / 10;
  }

  private sumNumbers(values: Array<number | null>): number | null {
    const filtered = values.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value)
    );
    if (filtered.length === 0) {
      return null;
    }

    return filtered.reduce((sum, value) => sum + value, 0);
  }

  private asString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();
    return text ? text : null;
  }

  private asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const numeric = Number(String(value).replace(",", ".").replace(/\s+/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }

  private normalizeCode(value: string): string | null {
    const text = value.trim().toUpperCase();
    return text ? text : null;
  }
}

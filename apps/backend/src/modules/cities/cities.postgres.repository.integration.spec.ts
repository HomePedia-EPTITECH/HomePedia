import { createPostgresV1Schema, createPostgresV1Seed } from "../../test/fixtures/postgres-fixtures";
import {
  createPostgresIntegrationHarness,
  PostgresIntegrationHarness
} from "../../test/postgres-integration";
import { PostgresCitiesRepository } from "./cities.postgres.repository";

describe("PostgresCitiesRepository integration", () => {
  let harness: PostgresIntegrationHarness;
  let repository: PostgresCitiesRepository;

  beforeEach(async () => {
    harness = await createPostgresIntegrationHarness();
    repository = new PostgresCitiesRepository(harness.dbService);
  });

  afterEach(async () => {
    await harness.close();
  });

  it("maps the V1 SQL schema to the existing city read model", async () => {
    harness.exec(createPostgresV1Schema());
    harness.exec(createPostgresV1Seed());

    const row = await repository.findByCode("75056");

    expect(row).toEqual({
      com: "75056",
      nccenr: "Paris",
      nb_habitant: 2145906,
      age_moyen: 36,
      pop_active: 65,
      score_securite: 3.8,
      score_environnement: 4.1,
      score_vie_pratique: 3.4,
      score_loisirs: 3.2,
      score_sante: null,
      score_transports: null,
      score_education: 4
    });
  });

  it("builds city detail blocks from SQL and tolerates missing satellite tables", async () => {
    harness.exec(createPostgresV1Schema(["region", "departement", "commune", "demographie", "scores"]));
    harness.exec(`
      INSERT INTO region (numero_region, name) VALUES (53, 'Bretagne');
      INSERT INTO departement (id, numero_departement, nom, region_id) VALUES (3, '35', 'Ille-et-Vilaine', 53);
      INSERT INTO commune (id, com, nom, code_postal, departement_id, metropole_id, maire)
      VALUES (4, '35238', 'Rennes', '35000', 3, NULL, 'Nathalie Appere');
      INSERT INTO demographie (
        commune_id, population, age_moyen, pop_active, taux_chomage, densite, revenu_moyen, superficie,
        part_0_14_ans, part_15_29_ans, part_30_44_ans, part_45_59_ans, part_60_74_ans, part_75_89_ans,
        part_90_plus, part_cadres, part_retraites, part_employes, part_ouvriers, part_sans_diplome,
        part_bac5_plus, part_couple_avec_enfants, part_personnes_seules
      ) VALUES
        (4, 225081, 39, 62, 6.2, 4500, 30000, 50, 16, 24, 21, 16, 14, 7, 2, 20, 19, 16, 11, 10, 27, 20, 27);
      INSERT INTO scores (
        commune_id, score_securite, score_education, score_loisirs, score_environnement, score_vie_pratique, score_globale
      ) VALUES
        (4, 3.6, 3.8, 4.1, 4.5, 4.2, 4.0);
    `);

    const detail = await repository.findDetailByCode("35238");

    expect(detail).toMatchObject({
      city: {
        com: "35238",
        nccenr: "Rennes",
        score_sante: null,
        score_transports: null
      },
      admin: {
        codeDept: "35",
        postalCode: "35000",
        region: "Bretagne",
        departement: "Ille-et-Vilaine",
        metropole: null,
        mayor: "Nathalie Appere"
      },
      blocks: {
        demography: expect.objectContaining({
          population: 225081,
          age_moyen: 39
        }),
        qualityOfLife: expect.objectContaining({
          score_globale: 4,
          score_environnement: 4.5
        }),
        security: {},
        services: {},
        realEstate: {}
      },
      source: {
        provider: null,
        cityPage: null,
        reviewsPage: null,
        harvestedAt: null,
        updatedAt: null
      },
      reviews: {
        count: 0,
        positive: [],
        negative: [],
        all: []
      }
    });
  });

  it("computes overview metrics and top cities from SQL when the tables are present", async () => {
    harness.exec(createPostgresV1Schema());
    harness.exec(createPostgresV1Seed());

    const metrics = await repository.getOverviewMetrics();
    const safest = await repository.findTopCitiesByScore("score_securite", 2);

    expect(metrics).toMatchObject({
      total_cities: 4,
      avg_population: 747803.75
    });
    expect(metrics?.avg_security).toBeCloseTo(3.8, 10);
    expect(metrics?.avg_environment).toBeCloseTo(4.133333333333334, 10);
    expect(safest).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ com: "75057", nccenr: "Paris Centre" }),
        expect.objectContaining({ com: "75056", nccenr: "Paris" })
      ])
    );
  });
});

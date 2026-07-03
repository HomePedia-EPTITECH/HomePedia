import { createPostgresV1Schema, createPostgresV1Seed } from "../../test/fixtures/postgres-fixtures";
import {
  createPostgresIntegrationHarness,
  PostgresIntegrationHarness
} from "../../test/postgres-integration";
import { GeoCitiesPostgresRepository } from "./geo-cities.postgres.repository";
import { GeoDepartementsPostgresRepository } from "./geo-departements.postgres.repository";
import { GeoRegionsPostgresRepository } from "./geo-regions.postgres.repository";

describe("GeoPostgresRepositories", () => {
  describe("cities repository", () => {
    let harness: PostgresIntegrationHarness;
    let repository: GeoCitiesPostgresRepository;

    beforeEach(async () => {
      harness = await createPostgresIntegrationHarness();
      repository = new GeoCitiesPostgresRepository(harness.dbService);
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
      harness.exec(
        createPostgresV1Schema(["region", "departement", "commune", "demographie", "scores"])
      );
      harness.exec(`
      INSERT INTO region (numero_region, nom) VALUES (53, 'Bretagne');
      INSERT INTO departement (numero_departement, nom, region_id) VALUES ('35', 'Ille-et-Vilaine', 53);
      INSERT INTO commune (commune_id, nom, code_postal, departement_id, metropole_id, maire)
      VALUES ('35238', 'Rennes', '35000', '35', NULL, 'Nathalie Appere');
      INSERT INTO demographie (
        commune_id, population, age_moyen, pop_active, taux_chomage, densite, revenu_moyen, superficie,
        part_0_14_ans, part_15_29_ans, part_30_44_ans, part_45_59_ans, part_60_74_ans, part_75_89_ans,
        part_90_plus, part_cadres, part_retraites, part_employes, part_ouvriers, part_sans_diplome,
        part_bac5_plus, part_couple_avec_enfants, part_personnes_seules
      ) VALUES
        ('35238', 225081, 39, 62, 6.2, 4500, 30000, 50, 16, 24, 21, 16, 14, 7, 2, 20, 19, 16, 11, 10, 27, 20, 27);
      INSERT INTO scores (
        commune_id, score_securite, score_education, score_loisirs, score_environnement, score_vie_pratique, score_globale
      ) VALUES
        ('35238', 3.6, 3.8, 4.1, 4.5, 4.2, 4.0);
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

  describe("departements repository", () => {
    let harness: PostgresIntegrationHarness;
    let repository: GeoDepartementsPostgresRepository;

    beforeEach(async () => {
      harness = await createPostgresIntegrationHarness();
      repository = new GeoDepartementsPostgresRepository(harness.dbService);
    });

    afterEach(async () => {
      await harness.close();
    });

    it("aggregates departements with city counts from the SQL commune table", async () => {
      harness.exec(createPostgresV1Schema());
      harness.exec(createPostgresV1Seed());

      const rows = await repository.findAll();

      expect(rows).toEqual(
        expect.arrayContaining([
          {
            code: "35",
            name: "Ille-et-Vilaine",
            cityCount: 1,
            updatedAt: null
          },
          {
            code: "69",
            name: "Rhone",
            cityCount: 1,
            updatedAt: null
          },
          {
            code: "75",
            name: "Paris",
            cityCount: 2,
            updatedAt: null
          }
        ])
      );
    });

    it("still returns departements when the commune table is absent", async () => {
      harness.exec(createPostgresV1Schema(["region", "departement"]));
      harness.exec(`
      INSERT INTO region (numero_region, nom) VALUES (11, 'Ile-de-France');
      INSERT INTO departement (numero_departement, nom, region_id) VALUES ('75', 'Paris', 11);
    `);

      await expect(repository.findByCode("75")).resolves.toEqual({
        code: "75",
        name: "Paris",
        cityCount: 0,
        updatedAt: null
      });
    });
  });

  describe("regions repository", () => {
    let harness: PostgresIntegrationHarness;
    let repository: GeoRegionsPostgresRepository;

    beforeEach(async () => {
      harness = await createPostgresIntegrationHarness();
      repository = new GeoRegionsPostgresRepository(harness.dbService);
    });

    afterEach(async () => {
      await harness.close();
    });

    it("aggregates regions with departement and city counts from SQL", async () => {
      harness.exec(createPostgresV1Schema());
      harness.exec(createPostgresV1Seed());

      const querySpy = jest.spyOn(harness.dbService, "query");
      const rows = await repository.findRegions();

      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "11",
            name: "Ile-de-France",
            departementCount: 1,
            cityCount: 2
          }),
          expect.objectContaining({
            code: "53",
            name: "Bretagne",
            departementCount: 1,
            cityCount: 1
          }),
          expect.objectContaining({
            code: "84",
            name: "Auvergne-Rhone-Alpes",
            departementCount: 1,
            cityCount: 1
          })
        ])
      );
      expect(querySpy).toHaveBeenCalledTimes(3);
      querySpy.mockRestore();
    });

    it("returns regions even when departements and communes are absent", async () => {
      harness.exec(createPostgresV1Schema(["region"]));
      harness.exec(`
      INSERT INTO region (numero_region, nom) VALUES (11, 'Ile-de-France');
    `);

      await expect(repository.findRegionByCode("11")).resolves.toEqual({
        code: "11",
        name: "Ile-de-France",
        departementCount: 0,
        cityCount: 0,
        updatedAt: null
      });
    });

    it("lists departements for a region", async () => {
      harness.exec(createPostgresV1Schema());
      harness.exec(createPostgresV1Seed());

      const rows = await repository.findDepartementsByRegionCode("11");

      expect(rows).toEqual([
        {
          code: "75",
          name: "Paris",
          cityCount: 2,
          updatedAt: null
        }
      ]);
    });
  });
});

import { createPostgresV1Schema, createPostgresV1Seed } from "../../test/fixtures/postgres-fixtures";
import {
  createPostgresIntegrationHarness,
  PostgresIntegrationHarness
} from "../../test/postgres-integration";
import { PostgresDepartementsRepository } from "./departements.postgres.repository";

describe("PostgresDepartementsRepository integration", () => {
  let harness: PostgresIntegrationHarness;
  let repository: PostgresDepartementsRepository;

  beforeEach(async () => {
    harness = await createPostgresIntegrationHarness();
    repository = new PostgresDepartementsRepository(harness.dbService);
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
      INSERT INTO region (numero_region, name) VALUES (11, 'Ile-de-France');
      INSERT INTO departement (id, numero_departement, nom, region_id) VALUES (1, '75', 'Paris', 11);
    `);

    await expect(repository.findByCode("75")).resolves.toEqual({
      code: "75",
      name: "Paris",
      cityCount: 0,
      updatedAt: null
    });
  });
});

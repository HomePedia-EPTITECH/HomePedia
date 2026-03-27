import { createPostgresV1Schema, createPostgresV1Seed } from "../test/fixtures/postgres-fixtures";
import {
  createPostgresIntegrationHarness,
  PostgresIntegrationHarness
} from "../test/postgres-integration";
import { PostgresKpiRepository } from "./kpi.postgres.repository";

describe("PostgresKpiRepository integration", () => {
  let harness: PostgresIntegrationHarness;
  let repository: PostgresKpiRepository;

  beforeEach(async () => {
    harness = await createPostgresIntegrationHarness();
    repository = new PostgresKpiRepository(harness.dbService);
  });

  afterEach(async () => {
    await harness.close();
  });

  it("computes structural KPI metrics from the SQL schema", async () => {
    harness.exec(createPostgresV1Schema());
    harness.exec(createPostgresV1Seed());

    const snapshot = await repository.computeSnapshot();

    expect(snapshot).toMatchObject({
      total_cities: 4,
      avg_population: 747803.75,
      avg_house_price_m2: 8285
    });
    expect(snapshot?.avg_security_score).toBeCloseTo(3.8, 10);
    expect(snapshot?.avg_environment_score).toBeCloseTo(4.133333333333334, 10);
    expect(snapshot?.avg_apartment_price_m2).toBe(7665);
    expect(snapshot?.captured_at).toBeDefined();
  });

  it("returns partial KPI data when only the commune table is available", async () => {
    harness.exec(createPostgresV1Schema(["region", "departement", "metropole", "commune"]));
    harness.exec(`
      INSERT INTO region (numero_region, name) VALUES (11, 'Ile-de-France');
      INSERT INTO departement (id, numero_departement, nom, region_id) VALUES (1, '75', 'Paris', 11);
      INSERT INTO commune (id, com, nom, code_postal, departement_id, metropole_id, maire)
      VALUES (1, '75056', 'Paris', '75000', 1, NULL, 'Anne Hidalgo');
    `);

    await expect(repository.computeSnapshot()).resolves.toMatchObject({
      total_cities: 1,
      avg_population: null,
      avg_security_score: null,
      avg_environment_score: null,
      avg_house_price_m2: null,
      avg_apartment_price_m2: null
    });
  });
});

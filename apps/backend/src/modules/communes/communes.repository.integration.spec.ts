import { createPostgresV1Schema, createPostgresV1Seed } from "../../test/fixtures/postgres-fixtures";
import {
  createPostgresIntegrationHarness,
  PostgresIntegrationHarness
} from "../../test/postgres-integration";
import { CommunesRepository } from "./communes.repository";

describe("CommunesRepository", () => {
  let harness: PostgresIntegrationHarness;
  let repository: CommunesRepository;

  beforeEach(async () => {
    harness = await createPostgresIntegrationHarness();
    repository = new CommunesRepository(harness.dbService);
  });

  afterEach(async () => {
    await harness.close();
  });

  it("reads longitude and latitude when the commune columns exist", async () => {
    harness.exec(createPostgresV1Schema());
    harness.exec(createPostgresV1Seed());

    const commune = await repository.findById("75056");

    expect(commune).toMatchObject({
      id: "75056",
      nom: "Paris",
      lon: 2.3522,
      lat: 48.8566
    });
  });
});

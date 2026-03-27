import { createMongoFixtures } from "../../test/fixtures/mongo-fixtures";
import {
  createMongoIntegrationHarness,
  MongoIntegrationHarness
} from "../../test/mongo-integration";
import { DepartementsRepository } from "./departements.repository";

jest.setTimeout(120000);

describe("DepartementsRepository Mongo integration", () => {
  let harness: MongoIntegrationHarness;
  let repository: DepartementsRepository;

  beforeAll(async () => {
    harness = await createMongoIntegrationHarness();
    repository = new DepartementsRepository(harness.mongoService);
  });

  beforeEach(async () => {
    await harness.replaceCollections(createMongoFixtures());
    await harness.db.collection("communes_direct").insertOne({
      com: "75101",
      nom_commune: "Paris Centre",
      code_dept: "75",
      nom_region: "Ile-de-France"
    });
  });

  afterAll(async () => {
    await harness.close();
  });

  it("aggregates departements with city counts from communes_direct", async () => {
    const rows = await repository.findAll();
    const paris = await repository.findByCode("75");

    expect(rows).toEqual([
      expect.objectContaining({
        code: "35",
        name: "Ille-et-Vilaine",
        cityCount: 1
      }),
      expect.objectContaining({
        code: "69",
        name: "Rhone",
        cityCount: 1
      }),
      expect.objectContaining({
        code: "75",
        name: "Paris",
        cityCount: 2
      })
    ]);

    expect(paris).toMatchObject({
      code: "75",
      name: "Paris",
      cityCount: 2
    });
  });
});

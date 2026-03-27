import { createMongoFixtures } from "../test/fixtures/mongo-fixtures";
import {
  createMongoIntegrationHarness,
  MongoIntegrationHarness
} from "../test/mongo-integration";
import { KpiRepository } from "./kpi.repository";

jest.setTimeout(120000);

describe("KpiRepository Mongo integration", () => {
  let harness: MongoIntegrationHarness;
  let repository: KpiRepository;

  beforeAll(async () => {
    harness = await createMongoIntegrationHarness();
    repository = new KpiRepository(harness.mongoService);
  });

  beforeEach(async () => {
    await harness.replaceCollections(createMongoFixtures());
  });

  afterAll(async () => {
    await harness.close();
  });

  it("computes KPIs from the real communes_direct fixture shape", async () => {
    const kpis = await repository.findAll();
    const security = await repository.findById(4);

    expect(kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          name: "total_cities",
          value: 3,
          source: "mongo:communes_direct"
        }),
        expect.objectContaining({
          id: 2,
          name: "reviewed_cities",
          value: 3
        }),
        expect.objectContaining({
          id: 3,
          name: "average_population",
          value: 952577
        }),
        expect.objectContaining({
          id: 6,
          name: "average_city_rating",
          value: 4.2
        }),
        expect.objectContaining({
          id: 7,
          name: "average_house_price_m2",
          value: 7066.67
        }),
        expect.objectContaining({
          id: 8,
          name: "average_apartment_price_m2",
          value: 6366.67
        })
      ])
    );

    expect(security).toMatchObject({
      id: 4,
      name: "average_security_score",
      value: 3.77,
      capturedAt: "2026-03-25T12:00:00.000Z"
    });
  });
});

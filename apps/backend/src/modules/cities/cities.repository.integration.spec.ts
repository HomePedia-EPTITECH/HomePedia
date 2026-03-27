import { createMongoFixtures } from "../../test/fixtures/mongo-fixtures";
import {
  createMongoIntegrationHarness,
  MongoIntegrationHarness
} from "../../test/mongo-integration";
import { CitiesRepository } from "./cities.repository";
import { CitySortBy, GetCitiesQueryDto, SortOrder } from "./dto/get-cities-query.dto";

jest.setTimeout(120000);

describe("CitiesRepository Mongo integration", () => {
  let harness: MongoIntegrationHarness;
  let repository: CitiesRepository;

  beforeAll(async () => {
    harness = await createMongoIntegrationHarness();
    repository = new CitiesRepository(harness.mongoService);
  });

  beforeEach(async () => {
    await harness.replaceCollections(createMongoFixtures());
  });

  afterAll(async () => {
    await harness.close();
  });

  it("applies communes_direct filters with real Mongo numeric coercion", async () => {
    const query: GetCitiesQueryDto = {
      page: 1,
      limit: 10,
      search: undefined,
      code_dept: "75",
      nom_region: "ile-de-france",
      note_moyenne_globale_min: 4,
      nb_avis_min: 100,
      prix_m2_maison_max: 11000,
      prix_m2_appartement_max: 10000,
      sortBy: CitySortBy.Environment,
      order: SortOrder.Desc
    };

    await expect(repository.findAll(query)).resolves.toEqual([
      expect.objectContaining({
        com: "75056",
        nccenr: "Paris"
      })
    ]);

    await expect(repository.countAll(query)).resolves.toBe(1);
  });

  it("builds city details from communes_direct, communes_harvest and reviews_raw", async () => {
    const detail = await repository.findDetailByCode("75056");

    expect(detail).not.toBeNull();
    expect(detail).toMatchObject({
      city: {
        com: "75056",
        nccenr: "Paris"
      },
      admin: {
        codeDept: "75",
        postalCode: "75000",
        region: "Ile-de-France",
        departement: "Paris",
        metropole: "Metropole du Grand Paris",
        mayor: "Anne Hidalgo"
      },
      source: {
        provider: "ville-ideale",
        cityPage: "https://example.test/cities/paris",
        reviewsPage: "https://example.test/cities/paris/reviews"
      },
      blocks: {
        demography: {
          nb_habitant: "2 102 650",
          age_moyen: "39,7"
        },
        security: {
          agressions: "12,5"
        },
        qualityOfLife: {
          note_moyenne_globale: "4,2",
          score_education: "4,5"
        },
        services: {
          nb_ecoles: 1234
        },
        realEstate: {
          prix_m2_maison: "10 500 EUR/m2"
        }
      },
      reviews: {
        count: 120,
        positive: ["Ville tres dynamique"],
        negative: ["Trafic dense"],
        all: ["Ville tres dynamique", "Trafic dense", "Beaucoup de services"]
      }
    });
  });

  it("computes overview metrics and score rankings from communes_direct", async () => {
    const overview = await repository.getOverviewMetrics();
    const topCities = await repository.findTopCitiesByScore("score_securite", 2);

    expect(overview.total_cities).toBe(3);
    expect(overview.avg_population).toBeCloseTo(952577, 5);
    expect(overview.avg_security).toBeCloseTo(3.7666667, 5);
    expect(overview.avg_environment).toBeCloseTo(4.2666667, 5);
    expect(topCities.map((city) => city.com)).toEqual(["35238", "69123"]);
  });
});

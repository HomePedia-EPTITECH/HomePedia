import { NotFoundException } from "@nestjs/common";
import {
  CityDetailRow,
  CityRow,
  PostgresCitiesRepository
} from "./cities.postgres.repository";
import { CitiesService } from "./cities.service";
import { ReviewsRepository } from "../reviews/reviews.repository";

describe("CitiesService", () => {
  const sqlCity: CityRow = {
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
  };

  it("prefers SQL for GET /api/cities/:code while preserving the public payload shape", async () => {
    const service = new CitiesService(
      {
        findByCode: jest.fn().mockResolvedValue(sqlCity)
      } as unknown as PostgresCitiesRepository,
      {} as ReviewsRepository
    );

    await expect(service.getCityByCode("75056")).resolves.toEqual({
      data: {
        code: "75056",
        name: "Paris",
        metrics: {
          population: 2145906,
          averageAge: 36,
          activePopulation: 65,
          scores: {
            security: 3.8,
            environment: 4.1,
            practicalLife: 3.4,
            leisure: 3.2,
            health: null,
            transport: null,
            education: 4
          }
        }
      }
    });
  });

  it("enriches SQL detail with Mongo reviews only", async () => {
    const service = new CitiesService(
      {
        findDetailByCode: jest.fn().mockResolvedValue({
          city: sqlCity,
          admin: {
            codeDept: "75",
            postalCode: "75000",
            region: "Ile-de-France",
            departement: "Paris",
            metropole: "Metropole du Grand Paris",
            mayor: "Anne Hidalgo"
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
          },
          blocks: {
            demography: { population: 2145906 },
            security: { agressions: 120 },
            qualityOfLife: { score_globale: 3.9 },
            services: {
              "education.nb_creches": 320,
              "sante.nb_pharmacies": 428,
              "commerces.nb_boulangeries": 1290
            },
            realEstate: { prix_m2_maison: 10450 }
          }
        })
      } as unknown as PostgresCitiesRepository,
      {
        findByCityCode: jest.fn().mockResolvedValue({
          code: "75056",
          source: "ville-ideale",
          sourceUrl: "https://example.test/cities/paris/reviews",
          harvestedAt: "2026-03-24T12:00:00.000Z",
          totalReviews: 3,
          reviews: [
            { text: "Ville agreable", sentiment_label: "positive" },
            { text: "Cher", sentiment_label: "negative" },
            { text: "Ville agreable", sentiment_label: "positive" }
          ]
        })
      } as unknown as ReviewsRepository
    );

    const response = await service.getCityDetailsByCode("75056");

    expect(response.data.source.provider).toBe("ville-ideale");
    expect(response.data.source.reviewsPage).toBe("https://example.test/cities/paris/reviews");
    expect(response.data.reviews.count).toBe(3);
    expect(response.data.blocks.services.values).toEqual({
      "education.nb_creches": 320,
      "sante.nb_pharmacies": 428,
      "commerces.nb_boulangeries": 1290
    });
  });

  it("returns SQL detail with empty reviews when Mongo detail lookup fails", async () => {
    const service = new CitiesService(
      {
        findDetailByCode: jest.fn().mockResolvedValue({
          city: sqlCity,
          admin: {
            codeDept: "75",
            postalCode: "75000",
            region: "Ile-de-France",
            departement: "Paris",
            metropole: null,
            mayor: "Anne Hidalgo"
          },
          source: {
            provider: null,
            cityPage: null,
            reviewsPage: null,
            harvestedAt: null,
            updatedAt: null
          },
          blocks: {
            demography: { population: 2145906 },
            security: {},
            qualityOfLife: { score_globale: 3.9 },
            services: {},
            realEstate: {}
          },
          reviews: {
            count: 0,
            positive: [],
            negative: [],
            all: []
          }
        })
      } as unknown as PostgresCitiesRepository,
      {
        findByCityCode: jest.fn().mockRejectedValue(new Error("mongo down"))
      } as unknown as ReviewsRepository
    );

    const response = await service.getCityDetailsByCode("75056");

    expect(response.data.city.code).toBe("75056");
    expect(response.data.reviews).toEqual({
      count: 0,
      positive: [],
      negative: [],
      all: []
    });
  });

  it("keeps the 404 behavior when neither SQL nor Mongo can resolve the city", async () => {
    const service = new CitiesService(
      {
        findByCode: jest.fn().mockResolvedValue(null),
        findDetailByCode: jest.fn().mockResolvedValue(null)
      } as unknown as PostgresCitiesRepository,
      {} as ReviewsRepository
    );

    await expect(service.getCityByCode("00000")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("uses Mongo review counts to scope SQL city filters when nb_avis_min is present", async () => {
    const service = new CitiesService(
      {
        findAll: jest.fn().mockResolvedValue([sqlCity]),
        countAll: jest.fn().mockResolvedValue(1)
      } as unknown as PostgresCitiesRepository,
      {
        findCityCodesWithMinimumReviews: jest.fn().mockResolvedValue(["75056"])
      } as unknown as ReviewsRepository
    );

    const response = await service.getCities({
      page: 1,
      limit: 20,
      nb_avis_min: 10
    } as never);

    expect(response.meta.total).toBe(1);
  });
});

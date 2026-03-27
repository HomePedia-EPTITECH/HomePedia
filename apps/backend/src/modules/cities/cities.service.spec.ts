import { NotFoundException } from "@nestjs/common";
import { PostgresCitiesRepository } from "./cities.postgres.repository";
import { CitiesRepository } from "./cities.repository";
import { CitiesService } from "./cities.service";
import { CityDetailRow, CityRow } from "./cities.read-model";

describe("CitiesService hybrid reads", () => {
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

  const mongoDetail: CityDetailRow = {
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
      provider: "bdmv",
      cityPage: "https://example.test/cities/paris",
      reviewsPage: "https://example.test/cities/paris/reviews",
      harvestedAt: "2026-03-24T12:00:00.000Z",
      updatedAt: "2026-03-24T13:00:00.000Z"
    },
    blocks: {
      demography: { nb_habitant: "2145906" },
      security: {},
      qualityOfLife: { note_moyenne_globale: "3.9" },
      services: { existing_service_metric: "12" },
      realEstate: {}
    },
    reviews: {
      count: 2,
      positive: ["Ville agreable"],
      negative: ["Cher"],
      all: ["Ville agreable", "Cher"]
    }
  };

  it("prefers SQL for GET /api/cities/:code while preserving the public payload shape", async () => {
    const service = new CitiesService(
      {
        findAll: jest.fn(),
        countAll: jest.fn(),
        findByCode: jest.fn().mockResolvedValue(null),
        findDetailByCode: jest.fn()
      } as unknown as CitiesRepository,
      {
        findByCode: jest.fn().mockResolvedValue(sqlCity)
      } as unknown as PostgresCitiesRepository
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

  it("merges SQL structural detail with Mongo source and reviews", async () => {
    const service = new CitiesService(
      {
        findAll: jest.fn(),
        countAll: jest.fn(),
        findByCode: jest.fn(),
        findDetailByCode: jest.fn().mockResolvedValue(mongoDetail)
      } as unknown as CitiesRepository,
      {
        findDetailByCode: jest.fn().mockResolvedValue({
          ...mongoDetail,
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
      } as unknown as PostgresCitiesRepository
    );

    const response = await service.getCityDetailsByCode("75056");

    expect(response.data.source.provider).toBe("bdmv");
    expect(response.data.reviews.count).toBe(2);
    expect(response.data.blocks.services.values).toEqual({
      "education.nb_creches": 320,
      "sante.nb_pharmacies": 428,
      "commerces.nb_boulangeries": 1290
    });
  });

  it("returns SQL detail with empty reviews when Mongo detail lookup fails", async () => {
    const service = new CitiesService(
      {
        findAll: jest.fn(),
        countAll: jest.fn(),
        findByCode: jest.fn(),
        findDetailByCode: jest.fn().mockRejectedValue(new Error("mongo down"))
      } as unknown as CitiesRepository,
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
      } as unknown as PostgresCitiesRepository
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
        findAll: jest.fn(),
        countAll: jest.fn(),
        findByCode: jest.fn().mockResolvedValue(null),
        findDetailByCode: jest.fn().mockResolvedValue(null)
      } as unknown as CitiesRepository,
      {
        findByCode: jest.fn().mockResolvedValue(null),
        findDetailByCode: jest.fn().mockResolvedValue(null)
      } as unknown as PostgresCitiesRepository
    );

    await expect(service.getCityByCode("00000")).rejects.toBeInstanceOf(NotFoundException);
  });
});

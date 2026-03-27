import { INestApplication, NotFoundException } from "@nestjs/common";
import request = require("supertest");
import { CitiesController } from "./cities.controller";
import { CitiesService } from "./cities.service";
import { createTestApp } from "../../test/create-test-app";

describe("CitiesController HTTP", () => {
  let app: INestApplication;

  const citiesService = {
    getCities: jest.fn(),
    getCityByCode: jest.fn(),
    getCityDetailsByCode: jest.fn()
  };

  beforeAll(async () => {
    const testApp = await createTestApp(CitiesController, [
      {
        provide: CitiesService,
        useValue: citiesService
      }
    ]);

    app = testApp.app;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 for GET /api/cities", async () => {
    citiesService.getCities.mockResolvedValue({
      data: [
        {
          code: "75056",
          name: "Paris 75056",
          metrics: {
            population: 2145906,
            averageAge: 36,
            activePopulation: 65,
            scores: {
              security: 3.8,
              environment: 4.1,
              practicalLife: null,
              leisure: null,
              health: 3.9,
              transport: 4.3,
              education: 4
            }
          }
        }
      ],
      meta: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      }
    });

    const response = await request(app.getHttpServer())
      .get("/api/cities")
      .query({ page: 1, limit: 20, sortBy: "name", order: "asc" });

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(1);
    expect(citiesService.getCities).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: "name",
        order: "asc"
      })
    );
  });

  it("passes domain filters to the cities service", async () => {
    citiesService.getCities.mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    });

    const response = await request(app.getHttpServer()).get("/api/cities").query({
      code_dept: "75",
      nom_region: "Ile-de-France",
      note_moyenne_globale_min: "3.5",
      nb_avis_min: "100",
      prix_m2_maison_max: "5000",
      prix_m2_appartement_max: "4500"
    });

    expect(response.status).toBe(200);
    expect(citiesService.getCities).toHaveBeenCalledWith(
      expect.objectContaining({
        code_dept: "75",
        nom_region: "Ile-de-France",
        note_moyenne_globale_min: 3.5,
        nb_avis_min: 100,
        prix_m2_maison_max: 5000,
        prix_m2_appartement_max: 4500
      })
    );
  });

  it("returns 400 for invalid city query params", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/cities")
      .query({ limit: 101 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/cities?limit=101",
      details: ["limit must not be greater than 100"]
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("returns 400 for invalid domain filters", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/cities")
      .query({ note_moyenne_globale_min: 8, nb_avis_min: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/cities?note_moyenne_globale_min=8&nb_avis_min=-1"
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        "note_moyenne_globale_min must not be greater than 5",
        "nb_avis_min must not be less than 0"
      ])
    );
  });

  it("returns 404 for an unknown city code", async () => {
    citiesService.getCityByCode.mockRejectedValue(
      new NotFoundException("City 00000 not found")
    );

    const response = await request(app.getHttpServer()).get("/api/cities/00000");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      message: "City 00000 not found",
      path: "/api/cities/00000"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("returns 200 for GET /api/cities/:code/details", async () => {
    citiesService.getCityDetailsByCode.mockResolvedValue({
      data: {
        city: {
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
          provider: "bdmv",
          cityPage: "https://www.bien-dans-ma-ville.fr/paris-75056/",
          reviewsPage: "https://www.bien-dans-ma-ville.fr/paris-75056/avis.html",
          harvestedAt: "2026-03-24T12:00:00.000Z",
          updatedAt: "2026-03-24T12:00:00.000Z"
        },
        blocks: {
          demography: { values: { nb_habitant: "2145906" } },
          security: { values: { agressions: "120" } },
          qualityOfLife: { values: { note_moyenne_globale: "3.8" } },
          services: { values: { nb_ecoles: "42" } },
          realEstate: { values: { prix_m2_maison: "10000 €" } }
        },
        reviews: {
          count: 2,
          positive: ["Ville agreable"],
          negative: ["Logements chers"],
          all: ["Ville agreable", "Logements chers"]
        }
      }
    });

    const response = await request(app.getHttpServer()).get("/api/cities/75056/details");

    expect(response.status).toBe(200);
    expect(response.body.data.city.code).toBe("75056");
    expect(response.body.data.reviews.count).toBe(2);
  });

  it("returns 404 for an unknown city detail code", async () => {
    citiesService.getCityDetailsByCode.mockRejectedValue(
      new NotFoundException("City 00000 not found")
    );

    const response = await request(app.getHttpServer()).get("/api/cities/00000/details");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      message: "City 00000 not found",
      path: "/api/cities/00000/details"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});

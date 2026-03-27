import { INestApplication, NotFoundException } from "@nestjs/common";
import request = require("supertest");
import { createTestApp } from "../../test/create-test-app";
import { DepartementsController } from "./departements.controller";
import { DepartementsService } from "./departements.service";

describe("DepartementsController HTTP", () => {
  let app: INestApplication;

  const departementsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findCities: jest.fn()
  };

  beforeAll(async () => {
    const testApp = await createTestApp(DepartementsController, [
      {
        provide: DepartementsService,
        useValue: departementsService
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

  it("returns 200 for GET /api/departements", async () => {
    departementsService.findAll.mockResolvedValue({
      data: [
        {
          code: "75",
          name: "Paris",
          cityCount: 1,
          updatedAt: "2026-03-24T12:00:00.000Z"
        }
      ]
    });

    const response = await request(app.getHttpServer()).get("/api/departements");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].code).toBe("75");
  });

  it("returns 200 for GET /api/departements/:code", async () => {
    departementsService.findOne.mockResolvedValue({
      data: {
        code: "75",
        name: "Paris",
        cityCount: 1,
        updatedAt: "2026-03-24T12:00:00.000Z"
      }
    });

    const response = await request(app.getHttpServer()).get("/api/departements/75");

    expect(response.status).toBe(200);
    expect(response.body.data.code).toBe("75");
  });

  it("returns 200 for GET /api/departements/:code/cities", async () => {
    departementsService.findCities.mockResolvedValue({
      data: [
        {
          code: "75056",
          name: "Paris",
          metrics: {
            population: 2145906,
            averageAge: 39.7,
            activePopulation: 67.4,
            scores: {
              security: 3.1,
              environment: 4.4,
              practicalLife: 4.8,
              leisure: 4.9,
              health: null,
              transport: null,
              education: 4.5
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

    const response = await request(app.getHttpServer()).get("/api/departements/75/cities").query({
      page: 1,
      limit: 20,
      note_moyenne_globale_min: "4",
      sortBy: "environment",
      order: "desc"
    });

    expect(response.status).toBe(200);
    expect(response.body.data[0].code).toBe("75056");
    expect(departementsService.findCities).toHaveBeenCalledWith(
      "75",
      expect.objectContaining({
        page: 1,
        limit: 20,
        note_moyenne_globale_min: 4,
        sortBy: "environment",
        order: "desc"
      })
    );
  });

  it("returns 400 for invalid city filters on GET /api/departements/:code/cities", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/departements/75/cities")
      .query({ limit: 0, nb_avis_min: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/departements/75/cities?limit=0&nb_avis_min=-1"
    });
  });

  it("returns 404 when the departement does not exist", async () => {
    departementsService.findOne.mockRejectedValue(
      new NotFoundException("Departement ZZ not found")
    );

    const response = await request(app.getHttpServer()).get("/api/departements/ZZ");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      message: "Departement ZZ not found",
      path: "/api/departements/ZZ"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("returns 404 when requesting cities for an unknown departement", async () => {
    departementsService.findCities.mockRejectedValue(
      new NotFoundException("Departement ZZ not found")
    );

    const response = await request(app.getHttpServer()).get("/api/departements/ZZ/cities");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      message: "Departement ZZ not found",
      path: "/api/departements/ZZ/cities"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});

import { INestApplication, NotFoundException } from "@nestjs/common";
import request = require("supertest");
import { CitiesController } from "./cities.controller";
import { CitiesService } from "./cities.service";
import { createTestApp } from "../../test/create-test-app";

describe("CitiesController HTTP", () => {
  let app: INestApplication;

  const citiesService = {
    getCities: jest.fn(),
    getCityByCode: jest.fn()
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
});

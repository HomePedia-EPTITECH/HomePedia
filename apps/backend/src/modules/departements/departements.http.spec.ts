import { INestApplication, NotFoundException } from "@nestjs/common";
import request = require("supertest");
import { createTestApp } from "../../test/create-test-app";
import { DepartementsController } from "./departements.controller";
import { DepartementsService } from "./departements.service";

describe("DepartementsController HTTP", () => {
  let app: INestApplication;

  const departementsService = {
    findAll: jest.fn(),
    findOne: jest.fn()
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
});

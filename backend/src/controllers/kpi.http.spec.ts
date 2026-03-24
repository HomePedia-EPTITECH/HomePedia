import { INestApplication, NotFoundException } from "@nestjs/common";
import request = require("supertest");
import { KpiController } from "./kpi.controller";
import { KpiService } from "../services/kpi.service";
import { createTestApp } from "../test/create-test-app";

describe("KpiController HTTP", () => {
  let app: INestApplication;

  const kpiService = {
    findAll: jest.fn(),
    findOne: jest.fn()
  };

  beforeAll(async () => {
    const testApp = await createTestApp(KpiController, [
      {
        provide: KpiService,
        useValue: kpiService
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

  it("returns 200 for GET /api/kpis", async () => {
    kpiService.findAll.mockResolvedValue([
      {
        id: 1,
        name: "population_growth",
        value: 2.4,
        unit: "%",
        source: "insee",
        capturedAt: "2026-03-24T12:00:00.000Z",
        createdAt: "2026-03-24T12:00:00.000Z",
        updatedAt: "2026-03-24T12:00:00.000Z"
      }
    ]);

    const response = await request(app.getHttpServer()).get("/api/kpis");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it("returns an empty array when no KPI is available", async () => {
    kpiService.findAll.mockResolvedValue([]);

    const response = await request(app.getHttpServer()).get("/api/kpis");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns 400 when the KPI id is invalid", async () => {
    const response = await request(app.getHttpServer()).get("/api/kpis/not-a-number");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/kpis/not-a-number",
      details: ["Validation failed (numeric string is expected)"]
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("returns 404 when the KPI does not exist", async () => {
    kpiService.findOne.mockRejectedValue(new NotFoundException("KPI 999 not found"));

    const response = await request(app.getHttpServer()).get("/api/kpis/999");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      message: "KPI 999 not found",
      path: "/api/kpis/999"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});

import { INestApplication, ServiceUnavailableException } from "@nestjs/common";
import request = require("supertest");
import { createTestApp } from "../../test/create-test-app";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsController HTTP", () => {
  let app: INestApplication;

  const overviewService = {
    getOverview: jest.fn()
  };

  beforeAll(async () => {
    const testApp = await createTestApp(AnalyticsController, [
      {
        provide: AnalyticsService,
        useValue: overviewService
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

  it("returns 200 for GET /api/overview", async () => {
    overviewService.getOverview.mockResolvedValue({
      data: {
        totals: {
          cities: 34871,
          reviewedCities: 10234,
          reviewsAvailable: true
        },
        averages: {
          population: 52743.18,
          securityScore: 3.74,
          environmentScore: 3.92
        },
        highlights: {
          safestCities: [
            {
              code: "75056",
              name: "Paris 75056",
              securityScore: 3.8,
              environmentScore: 4.1
            }
          ],
          greenestCities: [
            {
              code: "44109",
              name: "Nantes 44109",
              securityScore: 3.6,
              environmentScore: 4.4
            }
          ]
        }
      }
    });

    const response = await request(app.getHttpServer()).get("/api/overview");

    expect(response.status).toBe(200);
    expect(response.body.data.totals.cities).toBe(34871);
    expect(response.body.data.highlights.safestCities).toHaveLength(1);
  });

  it("returns 200 for GET /api/analytics/overview", async () => {
    overviewService.getOverview.mockResolvedValue({
      data: {
        totals: {
          cities: 34871,
          reviewedCities: 10234,
          reviewsAvailable: true
        },
        averages: {
          population: 52743.18,
          securityScore: 3.74,
          environmentScore: 3.92
        },
        highlights: {
          safestCities: [],
          greenestCities: []
        }
      }
    });

    const response = await request(app.getHttpServer()).get("/api/analytics/overview");

    expect(response.status).toBe(200);
    expect(response.body.data.totals.cities).toBe(34871);
  });

  it("returns the degraded overview payload when reviews are unavailable", async () => {
    overviewService.getOverview.mockResolvedValue({
      data: {
        totals: {
          cities: 34871,
          reviewedCities: 0,
          reviewsAvailable: false
        },
        averages: {
          population: 52743.18,
          securityScore: 3.74,
          environmentScore: 3.92
        },
        highlights: {
          safestCities: [],
          greenestCities: []
        }
      }
    });

    const response = await request(app.getHttpServer()).get("/api/overview");

    expect(response.status).toBe(200);
    expect(response.body.data.totals.reviewsAvailable).toBe(false);
    expect(response.body.data.totals.reviewedCities).toBe(0);
  });

  it("returns 503 when the overview data source is unavailable", async () => {
    overviewService.getOverview.mockRejectedValue(
      new ServiceUnavailableException("Overview data source is unavailable")
    );

    const response = await request(app.getHttpServer()).get("/api/overview");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      statusCode: 503,
      error: "Service Unavailable",
      message: "Overview data source is unavailable",
      path: "/api/overview"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});

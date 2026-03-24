import { INestApplication } from "@nestjs/common";
import request = require("supertest");
import { createTestApp } from "../../test/create-test-app";
import { OverviewController } from "./overview.controller";
import { OverviewService } from "./overview.service";

describe("OverviewController HTTP", () => {
  let app: INestApplication;

  const overviewService = {
    getOverview: jest.fn()
  };

  beforeAll(async () => {
    const testApp = await createTestApp(OverviewController, [
      {
        provide: OverviewService,
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
});

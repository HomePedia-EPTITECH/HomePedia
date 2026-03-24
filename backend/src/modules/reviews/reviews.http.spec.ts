import {
  INestApplication,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import request = require("supertest");
import { createTestApp } from "../../test/create-test-app";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

describe("ReviewsController HTTP", () => {
  let app: INestApplication;

  const reviewsService = {
    getCityReviews: jest.fn()
  };

  beforeAll(async () => {
    const testApp = await createTestApp(ReviewsController, [
      {
        provide: ReviewsService,
        useValue: reviewsService
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

  it("returns 200 for GET /api/reviews/cities/:code", async () => {
    reviewsService.getCityReviews.mockResolvedValue({
      data: {
        code: "75056",
        sourceUrl: "https://www.bien-dans-ma-ville.fr/paris-75056/",
        harvestedAt: "2026-03-24T12:00:00.000Z",
        reviews: {
          positive: ["Ville agreable"],
          negative: ["Logements chers"],
          all: ["Ville agreable", "Logements chers"]
        },
        metricsSnapshot: {
          score_securite: "3.8"
        }
      },
      meta: {
        source: "mongo",
        collection: "city_backups"
      }
    });

    const response = await request(app.getHttpServer()).get(
      "/api/reviews/cities/75056"
    );

    expect(response.status).toBe(200);
    expect(response.body.data.code).toBe("75056");
  });

  it("returns 404 when reviews are not found", async () => {
    reviewsService.getCityReviews.mockRejectedValue(
      new NotFoundException("Reviews for city 00000 not found")
    );

    const response = await request(app.getHttpServer()).get(
      "/api/reviews/cities/00000"
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      message: "Reviews for city 00000 not found",
      path: "/api/reviews/cities/00000"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("returns 503 when the reviews datasource is unavailable", async () => {
    reviewsService.getCityReviews.mockRejectedValue(
      new ServiceUnavailableException("Reviews data source is unavailable")
    );

    const response = await request(app.getHttpServer()).get(
      "/api/reviews/cities/75056"
    );

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      statusCode: 503,
      error: "Service Unavailable",
      message: "Reviews data source is unavailable",
      path: "/api/reviews/cities/75056"
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});

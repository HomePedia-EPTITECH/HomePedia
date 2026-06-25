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
    getCityReviews: jest.fn(),
    getCityReviewItems: jest.fn()
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

  it("returns the legacy summary format for GET /api/reviews/cities/:cityCode", async () => {
    reviewsService.getCityReviews.mockResolvedValue({
      data: {
        code: "75056",
        sourceUrl: "https://www.bien-dans-ma-ville.fr/paris-75056/",
        harvestedAt: "2026-03-24T12:00:00.000Z",
        reviews: {
          positive: ["Ville agreable"],
          negative: ["Logements chers"],
          all: ["Ville agreable", "Logements chers"]
        }
      },
      meta: {
        source: "mongo",
        collection: "reviews_raw"
      }
    });

    const response = await request(app.getHttpServer()).get("/api/reviews/cities/75056");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: {
        code: "75056",
        reviews: {
          positive: ["Ville agreable"],
          negative: ["Logements chers"],
          all: ["Ville agreable", "Logements chers"]
        }
      },
      meta: {
        source: "mongo",
        collection: "reviews_raw"
      }
    });
    expect(reviewsService.getCityReviews).toHaveBeenCalledWith("75056");
  });

  it("returns 200 for GET /api/reviews/cities/:cityCode/items with pagination", async () => {
    reviewsService.getCityReviewItems.mockResolvedValue({
      cityCode: "75056",
      sourceUrl: "https://www.bien-dans-ma-ville.fr/paris-75056/",
      harvestedAt: "2026-03-24T12:00:00.000Z",
      reviews: [
        {
          id: "66b3b4f0d4c4f8a9a1234561",
          text: "Ville agreable",
          sentimentLabel: "positive",
          source: "bdmv",
          urlPage: "https://example.test/reviews",
          collectedAt: "2026-03-24T12:00:00.000Z"
        }
      ],
      pagination: {
        limit: 10,
        hasMore: true,
        nextCursor: "66b3b4f0d4c4f8a9a1234561"
      }
    });

    const response = await request(app.getHttpServer())
      .get("/api/reviews/cities/75056/items")
      .query({ limit: 10, cursor: "66b3b4f0d4c4f8a9a1234561" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      cityCode: "75056",
      reviews: [
        {
          id: "66b3b4f0d4c4f8a9a1234561",
          text: "Ville agreable",
          sentimentLabel: "positive",
          source: "bdmv",
          urlPage: "https://example.test/reviews",
          collectedAt: "2026-03-24T12:00:00.000Z"
        }
      ],
      pagination: {
        limit: 10,
        hasMore: true,
        nextCursor: "66b3b4f0d4c4f8a9a1234561"
      }
    });
    expect(reviewsService.getCityReviewItems).toHaveBeenCalledWith(
      "75056",
      expect.objectContaining({
        limit: 10,
        cursor: "66b3b4f0d4c4f8a9a1234561"
      })
    );
  });

  it("returns 400 when items limit is too low", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/reviews/cities/75056/items")
      .query({ limit: 0 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/reviews/cities/75056/items?limit=0"
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining(["limit must not be less than 1"])
    );
  });

  it("returns 400 when items limit is too high", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/reviews/cities/75056/items")
      .query({ limit: 500 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/reviews/cities/75056/items?limit=500"
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining(["limit must not be greater than 100"])
    );
  });

  it("returns 400 when the items cursor is invalid", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/reviews/cities/75056/items")
      .query({ cursor: "not-a-mongo-id" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      path: "/api/reviews/cities/75056/items?cursor=not-a-mongo-id"
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining(["cursor must be a mongodb id"])
    );
  });

  it("returns 404 when reviews are not found", async () => {
    reviewsService.getCityReviews.mockRejectedValue(
      new NotFoundException("Reviews for city 00000 not found")
    );

    const response = await request(app.getHttpServer()).get("/api/reviews/cities/00000");

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

    const response = await request(app.getHttpServer()).get("/api/reviews/cities/75056");

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

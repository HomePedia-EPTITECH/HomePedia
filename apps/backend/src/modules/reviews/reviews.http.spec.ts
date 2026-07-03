import { INestApplication } from "@nestjs/common";
import request = require("supertest");
import { createTestApp } from "../../test/create-test-app";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

describe("Reviews HTTP", () => {
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

  it("serves GET /reviews/cities/:cityCode", async () => {
    reviewsService.getCityReviews.mockResolvedValue({
      data: {
        code: "75056",
        sourceUrl: null,
        harvestedAt: null,
        reviews: { positive: [], negative: [], all: [] }
      }
    });

    const response = await request(app.getHttpServer()).get("/reviews/cities/75056");

    expect(response.status).toBe(200);
    expect(reviewsService.getCityReviews).toHaveBeenCalledWith("75056");
  });

  it("serves GET /reviews/cities/:cityCode/items", async () => {
    reviewsService.getCityReviewItems.mockResolvedValue({
      cityCode: "75056",
      sourceUrl: null,
      harvestedAt: null,
      reviews: [],
      pagination: { limit: 100, hasMore: false, nextCursor: null }
    });

    const response = await request(app.getHttpServer())
      .get("/reviews/cities/75056/items")
      .query({ limit: 100 });

    expect(response.status).toBe(200);
    expect(reviewsService.getCityReviewItems).toHaveBeenCalledWith(
      "75056",
      expect.objectContaining({ limit: 100 })
    );
  });
});

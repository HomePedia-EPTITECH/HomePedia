import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { InvalidReviewCursorError } from "./errors/invalid-review-cursor.error";
import { ReviewsRepository } from "./reviews.repository";
import { ReviewsService } from "./reviews.service";

describe("ReviewsService", () => {
  it("maps invalid review cursors to a BadRequestException", async () => {
    const reviewsRepository = {
      findByCityCodeItems: jest.fn().mockRejectedValue(new InvalidReviewCursorError())
    } as unknown as ReviewsRepository;
    const service = new ReviewsService(reviewsRepository);

    await expect(
      service.getCityReviewItems("75056", { limit: 2, cursor: "not-a-mongo-id" } as never)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps service unavailable errors for unexpected repository failures", async () => {
    const reviewsRepository = {
      findByCityCodeItems: jest.fn().mockRejectedValue(new Error("mongo down"))
    } as unknown as ReviewsRepository;
    const service = new ReviewsService(reviewsRepository);

    await expect(
      service.getCityReviewItems("75056", { limit: 2 } as never)
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("keeps not found behavior when the repository returns null", async () => {
    const reviewsRepository = {
      findByCityCodeItems: jest.fn().mockResolvedValue(null)
    } as unknown as ReviewsRepository;
    const service = new ReviewsService(reviewsRepository);

    await expect(service.getCityReviewItems("00000", { limit: 2 } as never)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});

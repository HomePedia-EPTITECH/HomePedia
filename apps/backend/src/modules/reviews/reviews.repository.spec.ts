import { ReviewsRepository } from "./reviews.repository";

describe("ReviewsRepository", () => {
  it("limits city reviews before collecting them", async () => {
    const limit = jest.fn().mockReturnThis();
    const toArray = jest.fn().mockResolvedValue([
      {
        com: "75056",
        source: "bdmv",
        url_page: "https://example.test/reviews",
        text: "Ville agreable",
        sentiment_label: "positive",
        collected_at: "2026-03-24T12:00:00.000Z"
      }
    ]);
    const sort = jest.fn().mockReturnValue({
      limit,
      toArray
    });
    const find = jest.fn().mockReturnValue({
      sort
    });
    const countDocuments = jest.fn().mockResolvedValue(1);
    const collection = {
      find,
      countDocuments
    };
    const mongoService = {
      getCollection: jest.fn().mockResolvedValue(collection)
    };
    const repository = new ReviewsRepository(mongoService as never);

    await expect(repository.findByCityCode("75056")).resolves.toMatchObject({
      code: "75056",
      totalReviews: 1,
      source: "bdmv",
      sourceUrl: "https://example.test/reviews"
    });

    expect(find).toHaveBeenCalledWith(
      { com: "75056" },
      expect.objectContaining({
        projection: expect.objectContaining({
          _id: 0,
          com: 1,
          source: 1,
          url_page: 1,
          text: 1,
          sentiment_label: 1,
          collected_at: 1
        })
      })
    );
    expect(sort).toHaveBeenCalledWith({ collected_at: -1 });
    expect(limit).toHaveBeenCalledWith(100);
    expect(toArray).toHaveBeenCalledTimes(1);
    expect(countDocuments).toHaveBeenCalledWith({ com: "75056" });
  });
});

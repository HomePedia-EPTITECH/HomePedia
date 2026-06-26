import { ObjectId } from "mongodb";
import { InvalidReviewCursorError } from "./errors/invalid-review-cursor.error";
import { ReviewsRepository } from "./reviews.repository";

function createLegacyReview(overrides: Record<string, unknown> = {}) {
  return {
    com: "75056",
    source: "bdmv",
    url_page: "https://example.test/reviews",
    text: "Ville agreable",
    sentiment_label: "positive",
    collected_at: "2026-03-24T12:00:00.000Z",
    ...overrides
  };
}

function createItemReview(id: string, overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(id),
    com: "75056",
    source: "bdmv",
    url_page: "https://example.test/reviews",
    text: "Ville agreable",
    sentiment_label: "positive",
    collected_at: "2026-03-24T12:00:00.000Z",
    ...overrides
  };
}

describe("ReviewsRepository", () => {
  it("limits legacy city reviews before collecting them", async () => {
    const limit = jest.fn().mockReturnThis();
    const toArray = jest.fn().mockResolvedValue([createLegacyReview()]);
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

  it("pages raw city reviews with exactly limit results and no next page", async () => {
    const pageLimit = jest.fn().mockReturnThis();
    const pageToArray = jest.fn().mockResolvedValue([
      createItemReview("66b3b4f0d4c4f8a9a1234561"),
      createItemReview("66b3b4f0d4c4f8a9a1234562")
    ]);
    const pageSort = jest.fn().mockReturnValue({
      limit: pageLimit
    });

    const latestLimit = jest.fn().mockReturnThis();
    const latestToArray = jest.fn().mockResolvedValue([
      createItemReview("66b3b4f0d4c4f8a9a1234563")
    ]);
    const latestSort = jest.fn().mockReturnValue({
      limit: latestLimit
    });

    const find = jest
      .fn()
      .mockReturnValueOnce({
        sort: pageSort
      })
      .mockReturnValueOnce({
        sort: latestSort
      });
    const collection = {
      find
    };
    pageLimit.mockReturnValue({
      toArray: pageToArray
    });
    latestLimit.mockReturnValue({
      toArray: latestToArray
    });

    const mongoService = {
      getCollection: jest.fn().mockResolvedValue(collection)
    };
    const repository = new ReviewsRepository(mongoService as never);

    const result = await repository.findByCityCodeItems("75056", { limit: 2 });

    expect(result).not.toBeNull();
    const exactPageResult = result!;

    expect(exactPageResult).toMatchObject({
      code: "75056",
      source: "bdmv",
      sourceUrl: "https://example.test/reviews",
      harvestedAt: "2026-03-24T12:00:00.000Z",
      pagination: {
        limit: 2,
        hasMore: false,
        nextCursor: null
      }
    });
    expect(exactPageResult.reviews).toHaveLength(2);
    expect(exactPageResult.reviews).toEqual([
      expect.objectContaining({ _id: new ObjectId("66b3b4f0d4c4f8a9a1234561") }),
      expect.objectContaining({ _id: new ObjectId("66b3b4f0d4c4f8a9a1234562") })
    ]);

    expect(pageLimit).toHaveBeenCalledWith(3);
    expect(latestLimit).toHaveBeenCalledWith(1);
    expect(pageToArray).toHaveBeenCalledTimes(1);
    expect(latestToArray).toHaveBeenCalledTimes(1);
  });

  it("pages raw city reviews with limit + 1 and returns pagination metadata", async () => {
    const pageLimit = jest.fn().mockReturnThis();
    const pageToArray = jest.fn().mockResolvedValue([
      createItemReview("66b3b4f0d4c4f8a9a1234561"),
      createItemReview("66b3b4f0d4c4f8a9a1234562"),
      createItemReview("66b3b4f0d4c4f8a9a1234563")
    ]);
    const pageSort = jest.fn().mockReturnValue({
      limit: pageLimit
    });

    const latestLimit = jest.fn().mockReturnThis();
    const latestToArray = jest.fn().mockResolvedValue([
      createItemReview("66b3b4f0d4c4f8a9a1234563")
    ]);
    const latestSort = jest.fn().mockReturnValue({
      limit: latestLimit
    });

    const find = jest
      .fn()
      .mockReturnValueOnce({
        sort: pageSort
      })
      .mockReturnValueOnce({
        sort: latestSort
      });
    const collection = {
      find
    };
    pageLimit.mockReturnValue({
      toArray: pageToArray
    });
    latestLimit.mockReturnValue({
      toArray: latestToArray
    });

    const mongoService = {
      getCollection: jest.fn().mockResolvedValue(collection)
    };
    const repository = new ReviewsRepository(mongoService as never);

    const result = await repository.findByCityCodeItems("75056", { limit: 2 });

    expect(result).not.toBeNull();
    const paginatedResult = result!;

    expect(paginatedResult).toMatchObject({
      code: "75056",
      source: "bdmv",
      sourceUrl: "https://example.test/reviews",
      harvestedAt: "2026-03-24T12:00:00.000Z",
      pagination: {
        limit: 2,
        hasMore: true,
        nextCursor: "66b3b4f0d4c4f8a9a1234562"
      }
    });
    expect(paginatedResult.reviews).toHaveLength(2);
    expect(paginatedResult.reviews).toEqual([
      expect.objectContaining({ _id: new ObjectId("66b3b4f0d4c4f8a9a1234561") }),
      expect.objectContaining({ _id: new ObjectId("66b3b4f0d4c4f8a9a1234562") })
    ]);

    expect(find).toHaveBeenNthCalledWith(
      1,
      { com: "75056" },
      expect.objectContaining({
        projection: expect.objectContaining({
          _id: 1,
          com: 1,
          source: 1,
          url_page: 1,
          text: 1,
          sentiment_label: 1,
          collected_at: 1
        })
      })
    );
    expect(find).toHaveBeenNthCalledWith(
      2,
      { com: "75056" },
      expect.objectContaining({
        projection: expect.objectContaining({
          _id: 1,
          source: 1,
          url_page: 1,
          collected_at: 1
        })
      })
    );
    expect(pageSort).toHaveBeenCalledWith({ _id: 1 });
    expect(pageLimit).toHaveBeenCalledWith(3);
    expect(latestSort).toHaveBeenCalledWith({ _id: -1 });
    expect(latestLimit).toHaveBeenCalledWith(1);
    expect(pageToArray).toHaveBeenCalledTimes(1);
    expect(latestToArray).toHaveBeenCalledTimes(1);
  });

  it("uses the cursor in the Mongo filter for raw items", async () => {
    const cursor = "66b3b4f0d4c4f8a9a1234561";
    const pageLimit = jest.fn().mockReturnThis();
    const pageToArray = jest.fn().mockResolvedValue([
      createItemReview("66b3b4f0d4c4f8a9a1234562"),
      createItemReview("66b3b4f0d4c4f8a9a1234563")
    ]);
    const pageSort = jest.fn().mockReturnValue({
      limit: pageLimit
    });

    const latestLimit = jest.fn().mockReturnThis();
    const latestToArray = jest.fn().mockResolvedValue([
      createItemReview("66b3b4f0d4c4f8a9a1234563")
    ]);
    const latestSort = jest.fn().mockReturnValue({
      limit: latestLimit
    });

    const find = jest
      .fn()
      .mockReturnValueOnce({
        sort: pageSort
      })
      .mockReturnValueOnce({
        sort: latestSort
      });
    const collection = {
      find
    };
    pageLimit.mockReturnValue({
      toArray: pageToArray
    });
    latestLimit.mockReturnValue({
      toArray: latestToArray
    });

    const mongoService = {
      getCollection: jest.fn().mockResolvedValue(collection)
    };
    const repository = new ReviewsRepository(mongoService as never);

    await expect(
      repository.findByCityCodeItems("75056", { limit: 2, cursor })
    ).resolves.toMatchObject({
      pagination: {
        limit: 2,
        hasMore: false,
        nextCursor: null
      }
    });

    expect(find).toHaveBeenNthCalledWith(
      1,
      {
        com: "75056",
        _id: {
          $gt: new ObjectId(cursor)
        }
      },
      expect.any(Object)
    );
  });

  it("returns null when the city does not exist for raw items", async () => {
    const pageLimit = jest.fn().mockReturnThis();
    const pageToArray = jest.fn().mockResolvedValue([]);
    const pageSort = jest.fn().mockReturnValue({
      limit: pageLimit
    });

    const latestLimit = jest.fn().mockReturnThis();
    const latestToArray = jest.fn().mockResolvedValue([]);
    const latestSort = jest.fn().mockReturnValue({
      limit: latestLimit
    });

    const find = jest
      .fn()
      .mockReturnValueOnce({
        sort: pageSort
      })
      .mockReturnValueOnce({
        sort: latestSort
      });
    const collection = {
      find
    };
    pageLimit.mockReturnValue({
      toArray: pageToArray
    });
    latestLimit.mockReturnValue({
      toArray: latestToArray
    });

    const mongoService = {
      getCollection: jest.fn().mockResolvedValue(collection)
    };
    const repository = new ReviewsRepository(mongoService as never);

    await expect(repository.findByCityCodeItems("00000", { limit: 2 })).resolves.toBeNull();
    expect(pageLimit).toHaveBeenCalledWith(3);
    expect(latestLimit).toHaveBeenCalledWith(1);
  });

  it("rejects invalid cursors for raw items", async () => {
    const mongoService = {
      getCollection: jest.fn()
    };
    const repository = new ReviewsRepository(mongoService as never);

    await expect(
      repository.findByCityCodeItems("75056", { limit: 2, cursor: "not-a-mongo-id" })
    ).rejects.toBeInstanceOf(InvalidReviewCursorError);
  });
});

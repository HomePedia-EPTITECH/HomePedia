import { PostgresReadRepository } from "./postgres-read.repository";

class TestPostgresReadRepository extends PostgresReadRepository {
  constructor(dbService: never) {
    super(dbService);
  }

  async readAvailableTables() {
    return this.getAvailableTables();
  }
}

describe("PostgresReadRepository", () => {
  it("returns an empty set when the metadata lookup fails", async () => {
    const dbService = {
      query: jest.fn().mockRejectedValue(new Error("metadata lookup failed"))
    };
    const repository = new TestPostgresReadRepository(dbService as never);

    await expect(repository.readAvailableTables()).resolves.toEqual(new Set());
    expect(dbService.query).toHaveBeenCalledWith(
      expect.stringContaining("information_schema.tables"),
      ["public"]
    );
  });
});

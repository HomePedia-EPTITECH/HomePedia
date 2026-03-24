import { OverviewService } from "./overview.service";

describe("OverviewService", () => {
  it("returns empty highlights when no city has usable scores", async () => {
    const service = new OverviewService(
      {
        getOverviewMetrics: jest.fn().mockResolvedValue({
          total_cities: 100,
          avg_population: null,
          avg_security: null,
          avg_environment: null
        }),
        findTopCitiesByScore: jest.fn().mockResolvedValue([])
      } as never,
      {
        countReviewedCities: jest.fn().mockResolvedValue(0)
      } as never
    );

    await expect(service.getOverview()).resolves.toMatchObject({
      data: {
        totals: {
          cities: 100,
          reviewedCities: 0,
          reviewsAvailable: true
        },
        averages: {
          population: null,
          securityScore: null,
          environmentScore: null
        },
        highlights: {
          safestCities: [],
          greenestCities: []
        }
      }
    });
  });
});

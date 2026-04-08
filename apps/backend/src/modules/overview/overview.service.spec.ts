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

  it("uses PostgreSQL metrics and highlights while keeping the Mongo reviews summary", async () => {
    const service = new OverviewService(
      {
        getOverviewMetrics: jest.fn().mockResolvedValue({
          total_cities: 4,
          avg_population: 747803.75,
          avg_security: 3.8,
          avg_environment: 4.13
        }),
        findTopCitiesByScore: jest
          .fn()
          .mockResolvedValueOnce([{ com: "75057", nccenr: "Paris Centre", score_securite: 4.1, score_environnement: 4.0 }])
          .mockResolvedValueOnce([{ com: "69123", nccenr: "Lyon", score_securite: 3.5, score_environnement: 4.3 }])
      } as never,
      {
        countReviewedCities: jest.fn().mockResolvedValue(12)
      } as never
    );

    await expect(service.getOverview()).resolves.toMatchObject({
      data: {
        totals: {
          cities: 4,
          reviewedCities: 12,
          reviewsAvailable: true
        },
        averages: {
          population: 747803.75,
          securityScore: 3.8,
          environmentScore: 4.13
        },
        highlights: {
          safestCities: [expect.objectContaining({ code: "75057", name: "Paris Centre" })],
          greenestCities: [expect.objectContaining({ code: "69123", name: "Lyon" })]
        }
      }
    });
  });
});

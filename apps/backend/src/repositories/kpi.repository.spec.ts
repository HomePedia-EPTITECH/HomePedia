import { KpiRepository } from "./kpi.repository";
import { PostgresKpiRepository } from "./kpi.postgres.repository";

describe("KpiRepository", () => {
  it("maps computed Mongo metrics into stable KPI entries", async () => {
    const repository = new KpiRepository({
      getCollection: jest.fn().mockResolvedValue({
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              total_cities: 100,
              reviewed_cities: 80,
              avg_population: 15234.567,
              avg_security_score: 3.712,
              avg_environment_score: 3.945,
              avg_city_rating: 3.81,
              avg_house_price_m2: 4231.22,
              avg_apartment_price_m2: 3899.11,
              captured_at: new Date("2026-03-27T10:00:00.000Z")
            }
          ])
        })
      })
    } as never);

    await expect(repository.findAll()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          name: "total_cities",
          value: 100,
          unit: "cities",
          source: "mongo:communes_direct"
        }),
        expect.objectContaining({
          id: 2,
          name: "reviewed_cities",
          value: 80
        }),
        expect.objectContaining({
          id: 3,
          name: "average_population",
          value: 15234.57
        }),
        expect.objectContaining({
          id: 4,
          name: "average_security_score",
          value: 3.71
        }),
        expect.objectContaining({
          id: 8,
          name: "average_apartment_price_m2",
          value: 3899.11
        })
      ])
    );
  });

  it("returns an empty list when no commune metric is available", async () => {
    const repository = new KpiRepository({
      getCollection: jest.fn().mockResolvedValue({
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      })
    } as never);

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it("returns null when the requested KPI id is absent", async () => {
    const repository = new KpiRepository({
      getCollection: jest.fn().mockResolvedValue({
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([
            {
              total_cities: 100,
              reviewed_cities: 0,
              avg_population: null,
              avg_security_score: null,
              avg_environment_score: null,
              avg_city_rating: null,
              avg_house_price_m2: null,
              avg_apartment_price_m2: null,
              captured_at: new Date("2026-03-27T10:00:00.000Z")
            }
          ])
        })
      })
    } as never);

    await expect(repository.findById(8)).resolves.toBeNull();
  });

  it("prefers SQL values for the structural KPIs while keeping Mongo-only KPIs", async () => {
    const repository = new KpiRepository(
      {
        getCollection: jest.fn().mockResolvedValue({
          aggregate: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([
              {
                total_cities: 100,
                reviewed_cities: 80,
                avg_population: 15234.567,
                avg_security_score: 3.712,
                avg_environment_score: 3.945,
                avg_city_rating: 3.81,
                avg_house_price_m2: 4231.22,
                avg_apartment_price_m2: 3899.11,
                captured_at: new Date("2026-03-27T10:00:00.000Z")
              }
            ])
          })
        })
      } as never,
      {
        computeSnapshot: jest.fn().mockResolvedValue({
          total_cities: 42,
          avg_population: 31000,
          avg_security_score: 4.2,
          avg_environment_score: 4.4,
          avg_house_price_m2: 5100,
          avg_apartment_price_m2: 4700,
          captured_at: new Date("2026-03-27T11:00:00.000Z")
        })
      } as unknown as PostgresKpiRepository
    );

    const kpis = await repository.findAll();

    expect(kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "total_cities",
          value: 42,
          source: "postgres:v1"
        }),
        expect.objectContaining({
          name: "reviewed_cities",
          value: 80,
          source: "mongo:communes_direct"
        }),
        expect.objectContaining({
          name: "average_city_rating",
          value: 3.81,
          source: "mongo:communes_direct"
        }),
        expect.objectContaining({
          name: "average_house_price_m2",
          value: 5100,
          source: "postgres:v1"
        })
      ])
    );
  });
});

import { NotFoundException } from "@nestjs/common";
import { CitiesService } from "../cities/cities.service";
import { PostgresDepartementsRepository } from "./departements.postgres.repository";
import { DepartementsService } from "./departements.service";

describe("DepartementsService", () => {
  it("reads departements from PostgreSQL", async () => {
    const service = new DepartementsService(
      {
        getCities: jest.fn()
      } as unknown as CitiesService,
      {
        findAll: jest.fn().mockResolvedValue([
          { code: "75", name: "Paris", cityCount: 2, updatedAt: null }
        ])
      } as unknown as PostgresDepartementsRepository
    );

    await expect(service.findAll()).resolves.toEqual({
      data: [
        {
          code: "75",
          name: "Paris",
          cityCount: 2,
          updatedAt: null
        }
      ]
    });
  });

  it("returns a SQL departement by code", async () => {
    const service = new DepartementsService(
      {
        getCities: jest.fn()
      } as unknown as CitiesService,
      {
        findByCode: jest.fn().mockResolvedValue({
          code: "75",
          name: "Paris",
          cityCount: 2,
          updatedAt: null
        })
      } as unknown as PostgresDepartementsRepository
    );

    await expect(service.findOne("75")).resolves.toEqual({
      data: {
        code: "75",
        name: "Paris",
        cityCount: 2,
        updatedAt: null
      }
    });
  });

  it("delegates scoped city lookups to CitiesService once the departement exists", async () => {
    const citiesService = {
      getCities: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 }
      })
    } as unknown as CitiesService;

    const service = new DepartementsService(
      citiesService,
      {
        findByCode: jest.fn().mockResolvedValue({
          code: "75",
          name: "Paris",
          cityCount: 2,
          updatedAt: null
        })
      } as unknown as PostgresDepartementsRepository
    );

    await expect(service.findCities("75", { page: 1, limit: 20 } as never)).resolves.toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    });

    expect((citiesService.getCities as jest.Mock).mock.calls[0][0]).toMatchObject({
      page: 1,
      limit: 20,
      code_dept: "75"
    });
  });

  it("keeps the 404 behavior when PostgreSQL does not know the departement", async () => {
    const service = new DepartementsService(
      {
        getCities: jest.fn()
      } as unknown as CitiesService,
      {
        findByCode: jest.fn().mockResolvedValue(null)
      } as unknown as PostgresDepartementsRepository
    );

    await expect(service.findOne("ZZ")).rejects.toBeInstanceOf(NotFoundException);
  });
});

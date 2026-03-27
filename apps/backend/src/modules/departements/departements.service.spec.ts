import { NotFoundException } from "@nestjs/common";
import { CitiesService } from "../cities/cities.service";
import { PostgresDepartementsRepository } from "./departements.postgres.repository";
import { DepartementsRepository } from "./departements.repository";
import { DepartementsService } from "./departements.service";

describe("DepartementsService hybrid reads", () => {
  it("prefers SQL departements when the SQL repository is populated", async () => {
    const service = new DepartementsService(
      {
        findAll: jest.fn().mockResolvedValue([
          { code: "75", name: "Paris legacy", cityCount: 99, updatedAt: null }
        ]),
        findByCode: jest.fn()
      } as unknown as DepartementsRepository,
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

  it("falls back to Mongo when SQL cannot resolve the departement", async () => {
    const service = new DepartementsService(
      {
        findAll: jest.fn(),
        findByCode: jest.fn().mockResolvedValue({
          code: "75",
          name: "Paris",
          cityCount: 1,
          updatedAt: null
        })
      } as unknown as DepartementsRepository,
      {
        getCities: jest.fn()
      } as unknown as CitiesService,
      {
        findByCode: jest.fn().mockResolvedValue(null)
      } as unknown as PostgresDepartementsRepository
    );

    await expect(service.findOne("75")).resolves.toEqual({
      data: {
        code: "75",
        name: "Paris",
        cityCount: 1,
        updatedAt: null
      }
    });
  });

  it("keeps the 404 behavior when neither source knows the departement", async () => {
    const service = new DepartementsService(
      {
        findAll: jest.fn(),
        findByCode: jest.fn().mockResolvedValue(null)
      } as unknown as DepartementsRepository,
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

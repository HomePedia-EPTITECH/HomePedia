import { NotFoundException } from "@nestjs/common";
import { CityDetailRow, CityRow } from "./geo-cities.postgres.repository";
import { createGeoServiceTestHarness } from "../../test/geo-service-mocks";

describe("GeoService", () => {
  describe("cities", () => {
    const sqlCity: CityRow = {
      com: "75056",
      nccenr: "Paris",
      nb_habitant: 2145906,
      age_moyen: 36,
      pop_active: 65,
      score_securite: 3.8,
      score_environnement: 4.1,
      score_vie_pratique: 3.4,
      score_loisirs: 3.2,
      score_sante: null,
      score_transports: null,
      score_education: 4,
      salaire_net_mensuel_moyen_cadre: 5200,
      salaire_net_mensuel_moyen_prof_intermediaire: 3600,
      salaire_net_mensuel_moyen_employe: 2500,
      salaire_net_mensuel_moyen_ouvrier: 2300,
      salaire_net_mensuel_moyen_total: 3300
    };

    it("prefers SQL for city lookups", async () => {
      const { service, citiesRepository } = createGeoServiceTestHarness();
      citiesRepository.findByCode.mockResolvedValue(sqlCity);

      await expect(service.getCityByCode("75056")).resolves.toEqual({
        data: {
          code: "75056",
          name: "Paris",
          metrics: {
            population: 2145906,
            averageAge: 36,
            activePopulation: 65,
            scores: {
              security: 3.8,
              environment: 4.1,
              practicalLife: 3.4,
              leisure: 3.2,
              health: null,
              transport: null,
              education: 4
            },
            salary: {
              cadre: 5200,
              profIntermediaire: 3600,
              employe: 2500,
              ouvrier: 2300,
              total: 3300
            }
          }
        }
      });
    });

    it("returns SQL detail without Mongo enrichment", async () => {
      const { service, citiesRepository } = createGeoServiceTestHarness();
      citiesRepository.findDetailByCode.mockResolvedValue({
        city: sqlCity,
        admin: {
          codeDept: "75",
          postalCode: "75000",
          region: "Ile-de-France",
          departement: "Paris",
          metropole: "Metropole du Grand Paris",
          mayor: "Anne Hidalgo"
        },
        source: {
          provider: null,
          cityPage: null,
          reviewsPage: null,
          harvestedAt: null,
          updatedAt: null
        },
        blocks: {
          demography: { population: 2145906 },
          security: { agressions: 120 },
          qualityOfLife: { score_globale: 3.9 },
          services: {
            "education.nb_creches": 320,
            "sante.nb_pharmacies": 428,
            "commerces.nb_boulangeries": 1290
          },
          realEstate: { prix_m2_maison: 10450 },
          salary: {
            salaire_net_mensuel_moyen_cadre: 5200,
            salaire_net_mensuel_moyen_prof_intermediaire: 3600,
            salaire_net_mensuel_moyen_employe: 2500,
            salaire_net_mensuel_moyen_ouvrier: 2300,
            salaire_net_mensuel_moyen_total: 3300
          }
        },
        reviews: {
          count: 0,
          positive: [],
          negative: [],
          all: []
        }
      } as CityDetailRow);

      const response = await service.getCityDetailsByCode("75056");

      expect(response.data.admin.codeDept).toBe("75");
      expect(response.data.source.reviewsPage).toBeNull();
      expect(response.data.reviews).toEqual({
        count: 0,
        positive: [],
        negative: [],
        all: []
      });
      expect(response.data.blocks.services.values).toEqual({
        "education.nb_creches": 320,
        "sante.nb_pharmacies": 428,
        "commerces.nb_boulangeries": 1290
      });
    });

    it("keeps the 404 behavior when SQL cannot resolve the city", async () => {
      const { service, citiesRepository } = createGeoServiceTestHarness();
      citiesRepository.findByCode.mockResolvedValue(null);
      citiesRepository.findDetailByCode.mockResolvedValue(null);

      await expect(service.getCityByCode("00000")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("departements", () => {
    it("reads departements from PostgreSQL", async () => {
      const { service, departementsRepository } = createGeoServiceTestHarness();
      departementsRepository.findAll.mockResolvedValue([
        { code: "75", name: "Paris", cityCount: 2, updatedAt: null }
      ]);

      await expect(service.getDepartements()).resolves.toEqual({
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
      const { service, departementsRepository } = createGeoServiceTestHarness();
      departementsRepository.findByCode.mockResolvedValue({
        code: "75",
        name: "Paris",
        cityCount: 2,
        updatedAt: null
      });

      await expect(service.getDepartementByCode("75")).resolves.toEqual({
        data: {
          code: "75",
          name: "Paris",
          cityCount: 2,
          updatedAt: null
        }
      });
    });

    it("delegates scoped city lookups once the departement exists", async () => {
      const { service, citiesRepository, departementsRepository } = createGeoServiceTestHarness();
      citiesRepository.findAll.mockResolvedValue([]);
      citiesRepository.countAll.mockResolvedValue(0);
      departementsRepository.findByCode.mockResolvedValue({
        code: "75",
        name: "Paris",
        cityCount: 2,
        updatedAt: null
      });

      await expect(
        service.getDepartementCities("75", { page: 1, limit: 20 } as never)
      ).resolves.toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      });
    });

    it("keeps the 404 behavior when PostgreSQL does not know the departement", async () => {
      const { service, departementsRepository } = createGeoServiceTestHarness();
      departementsRepository.findByCode.mockResolvedValue(null);

      await expect(service.getDepartementByCode("ZZ")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("regions", () => {
    const regionRow = {
      code: "11",
      name: "Ile-de-France",
      departementCount: 8,
      cityCount: 1,
      updatedAt: null
    };

    it("reads regions from PostgreSQL", async () => {
      const { service, regionsRepository } = createGeoServiceTestHarness();
      regionsRepository.findRegions.mockResolvedValue([regionRow]);

      await expect(service.getRegions()).resolves.toEqual({
        data: [regionRow]
      });
    });

    it("returns a SQL region by code", async () => {
      const { service, regionsRepository } = createGeoServiceTestHarness();
      regionsRepository.findRegionByCode.mockResolvedValue(regionRow);

      await expect(service.getRegionByCode("11")).resolves.toEqual({
        data: regionRow
      });
    });

    it("lists departements in a region", async () => {
      const { service, regionsRepository } = createGeoServiceTestHarness();
      regionsRepository.findRegionByCode.mockResolvedValue(regionRow);
      regionsRepository.findDepartementsByRegionCode.mockResolvedValue([
        { code: "75", name: "Paris", cityCount: 2, updatedAt: null }
      ]);

      await expect(service.getRegionDepartements("11")).resolves.toEqual({
        data: [{ code: "75", name: "Paris", cityCount: 2, updatedAt: null }]
      });
    });

    it("keeps the 404 behavior when PostgreSQL does not know the region", async () => {
      const { service, regionsRepository } = createGeoServiceTestHarness();
      regionsRepository.findRegionByCode.mockResolvedValue(null);

      await expect(service.getRegionByCode("99")).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

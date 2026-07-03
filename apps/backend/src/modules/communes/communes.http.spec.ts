import { INestApplication } from "@nestjs/common";
import request = require("supertest");
import { createTestApp } from "../../test/create-test-app";
import { GeoPublicController, CommunesController } from "./communes.controller";
import { CommunesService } from "./communes.service";
import { GeoService } from "../geo/geo.service";

describe("Communes HTTP", () => {
  describe("communes routes", () => {
    let app: INestApplication;

    const communesService = {
      findAll: jest.fn(),
      rank: jest.fn(),
      findOne: jest.fn(),
      search: jest.fn(),
      getNationalStats: jest.fn()
    };

    beforeAll(async () => {
      const testApp = await createTestApp(CommunesController, [
        {
          provide: CommunesService,
          useValue: communesService
        }
      ]);

      app = testApp.app;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
    });

    it("serves GET /communes", async () => {
      communesService.findAll.mockResolvedValue({ data: [] });

      const response = await request(app.getHttpServer()).get("/communes");

      expect(response.status).toBe(200);
      expect(communesService.findAll).toHaveBeenCalledWith(expect.any(Object));
    });

    it("serves GET /communes/:id", async () => {
      communesService.findOne.mockResolvedValue({ data: { id: "75056" } });

      const response = await request(app.getHttpServer()).get("/communes/75056");

      expect(response.status).toBe(200);
      expect(communesService.findOne).toHaveBeenCalledWith("75056");
    });

    it("serves POST /communes/rank", async () => {
      communesService.rank.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });

      const response = await request(app.getHttpServer())
        .post("/communes/rank")
        .send({
          filters: {},
          importance: {
            pouvoirAchat: 2,
            securite: 2,
            qualiteVie: 0,
            ecoles: 0,
            sante: 0,
            emploi: 0,
            commerces: 0,
            transports: 0,
            cultureLoisirs: 0
          },
          subFocus: {}
        });

      expect(response.status).toBe(200);
      expect(communesService.rank).toHaveBeenCalled();
    });

    it("serves GET /communes/search", async () => {
      communesService.search.mockResolvedValue({ data: [] });

      const response = await request(app.getHttpServer()).get("/communes/search").query({
        q: "paris",
        limit: 8
      });

      expect(response.status).toBe(200);
      expect(communesService.search).toHaveBeenCalledWith("paris", 8);
    });

    it("serves GET /stats/national", async () => {
      communesService.getNationalStats.mockResolvedValue({ data: { populationMoyenne: 1 } });

      const response = await request(app.getHttpServer()).get("/stats/national");

      expect(response.status).toBe(200);
      expect(communesService.getNationalStats).toHaveBeenCalled();
    });
  });

  describe("geo public routes", () => {
    let app: INestApplication;

    const geoService = {
      getRegions: jest.fn(),
      getRegionByCode: jest.fn(),
      getRegionDepartements: jest.fn(),
      getDepartements: jest.fn(),
      getDepartementByCode: jest.fn(),
      getDepartementCities: jest.fn()
    };

    beforeAll(async () => {
      const testApp = await createTestApp(GeoPublicController, [
        {
          provide: GeoService,
          useValue: geoService
        }
      ]);

      app = testApp.app;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
    });

    it("serves GET /regions", async () => {
      geoService.getRegions.mockResolvedValue({ data: [] });

      const response = await request(app.getHttpServer()).get("/regions");

      expect(response.status).toBe(200);
      expect(geoService.getRegions).toHaveBeenCalled();
    });

    it("serves GET /departements?region=", async () => {
      geoService.getRegionDepartements.mockResolvedValue({ data: [] });

      const response = await request(app.getHttpServer()).get("/departements").query({
        region: "11"
      });

      expect(response.status).toBe(200);
      expect(geoService.getRegionDepartements).toHaveBeenCalledWith("11");
    });
  });
});

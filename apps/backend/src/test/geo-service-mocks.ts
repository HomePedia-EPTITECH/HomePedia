import { GeoCitiesPostgresRepository } from "../modules/geo/geo-cities.postgres.repository";
import { GeoDepartementsPostgresRepository } from "../modules/geo/geo-departements.postgres.repository";
import { GeoRegionsPostgresRepository } from "../modules/geo/geo-regions.postgres.repository";
import { GeoService } from "../modules/geo/geo.service";
import { ReviewsRepository } from "../modules/reviews/reviews.repository";

export type GeoCitiesRepositoryMock = jest.Mocked<
  Pick<
    GeoCitiesPostgresRepository,
    | "findAll"
    | "countAll"
    | "findByCode"
    | "findDetailByCode"
    | "getOverviewMetrics"
    | "findTopCitiesByScore"
  >
>;

export type GeoDepartementsRepositoryMock = jest.Mocked<
  Pick<
    GeoDepartementsPostgresRepository,
    "findAll" | "findByCode"
  >
>;

export type GeoRegionsRepositoryMock = jest.Mocked<
  Pick<
    GeoRegionsPostgresRepository,
    "findRegions" | "findRegionByCode" | "findDepartementsByRegionCode"
  >
>;

export type ReviewsRepositoryMock = jest.Mocked<
  Pick<
    ReviewsRepository,
    | "findByCityCode"
    | "countReviewedCities"
    | "findCityCodesWithMinimumReviews"
  >
>;

export type GeoServiceTestHarness = {
  service: GeoService;
  citiesRepository: GeoCitiesRepositoryMock;
  departementsRepository: GeoDepartementsRepositoryMock;
  regionsRepository: GeoRegionsRepositoryMock;
  reviewsRepository: ReviewsRepositoryMock;
};

export function createGeoServiceTestHarness(): GeoServiceTestHarness {
  const citiesRepository: GeoCitiesRepositoryMock = {
    findAll: jest.fn(),
    countAll: jest.fn(),
    findByCode: jest.fn(),
    findDetailByCode: jest.fn(),
    getOverviewMetrics: jest.fn(),
    findTopCitiesByScore: jest.fn()
  };

  const departementsRepository: GeoDepartementsRepositoryMock = {
    findAll: jest.fn(),
    findByCode: jest.fn()
  };

  const regionsRepository: GeoRegionsRepositoryMock = {
    findRegions: jest.fn(),
    findRegionByCode: jest.fn(),
    findDepartementsByRegionCode: jest.fn()
  };

  const reviewsRepository: ReviewsRepositoryMock = {
    findByCityCode: jest.fn(),
    countReviewedCities: jest.fn(),
    findCityCodesWithMinimumReviews: jest.fn()
  };

  return {
    service: new GeoService(
      citiesRepository as unknown as GeoCitiesPostgresRepository,
      departementsRepository as unknown as GeoDepartementsPostgresRepository,
      regionsRepository as unknown as GeoRegionsPostgresRepository,
      reviewsRepository as unknown as ReviewsRepository
    ),
    citiesRepository,
    departementsRepository,
    regionsRepository,
    reviewsRepository
  };
}

export type CityScores = {
  security: number | null;
  environment: number | null;
  practicalLife: number | null;
  leisure: number | null;
  health: number | null;
  transport: number | null;
  education: number | null;
};

export type CityMetrics = {
  population: number | null;
  averageAge: number | null;
  activePopulation: number | null;
  scores: CityScores;
};

export type City = {
  code: string;
  name: string;
  metrics: CityMetrics;
};

export type CitiesMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CitiesResponse = {
  data: City[];
  meta: CitiesMeta;
};

export type CityResponse = {
  data: City;
};

type CityDetailObjectBlock = {
  values: Record<string, string | number | null>;
};

export type CityDetailAdmin = {
  codeDept: string | null;
  postalCode: string | null;
  region: string | null;
  departement: string | null;
  metropole: string | null;
  mayor: string | null;
};

export type CityDetailSource = {
  provider: string | null;
  cityPage: string | null;
  reviewsPage: string | null;
  harvestedAt: string | null;
  updatedAt: string | null;
};

export type CityDetailReviews = {
  count: number;
  positive: string[];
  negative: string[];
  all: string[];
};

export type CityDetailBlocks = {
  demography: CityDetailObjectBlock;
  security: CityDetailObjectBlock;
  qualityOfLife: CityDetailObjectBlock;
  services: CityDetailObjectBlock;
  realEstate: CityDetailObjectBlock;
};

export type CityDetail = {
  city: City;
  admin: CityDetailAdmin;
  source: CityDetailSource;
  blocks: CityDetailBlocks;
  reviews: CityDetailReviews;
};

export type CityDetailResponse = {
  data: CityDetail;
};

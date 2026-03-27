export type PrimitiveMetric = string | number | null;

export type CityRow = {
  com: string;
  nccenr: string;
  nb_habitant: PrimitiveMetric;
  age_moyen: PrimitiveMetric;
  pop_active: PrimitiveMetric;
  score_securite: PrimitiveMetric;
  score_environnement: PrimitiveMetric;
  score_vie_pratique: PrimitiveMetric;
  score_loisirs: PrimitiveMetric;
  score_sante: PrimitiveMetric;
  score_transports: PrimitiveMetric;
  score_education: PrimitiveMetric;
};

export type OverviewMetricsRow = {
  total_cities: number;
  avg_population: number | null;
  avg_security: number | null;
  avg_environment: number | null;
};

export type CityDetailRow = {
  city: CityRow;
  admin: {
    codeDept: string | null;
    postalCode: string | null;
    region: string | null;
    departement: string | null;
    metropole: string | null;
    mayor: string | null;
  };
  source: {
    provider: string | null;
    cityPage: string | null;
    reviewsPage: string | null;
    harvestedAt: Date | string | number | null;
    updatedAt: Date | string | number | null;
  };
  blocks: {
    demography: Record<string, PrimitiveMetric>;
    security: Record<string, PrimitiveMetric>;
    qualityOfLife: Record<string, PrimitiveMetric>;
    services: Record<string, PrimitiveMetric>;
    realEstate: Record<string, PrimitiveMetric>;
  };
  reviews: {
    count: number;
    positive: string[];
    negative: string[];
    all: string[];
  };
};

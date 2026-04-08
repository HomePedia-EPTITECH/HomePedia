export type OverviewCityCard = {
  code: string;
  name: string;
  securityScore: number | null;
  environmentScore: number | null;
};

export type OverviewTotals = {
  cities: number;
  reviewedCities: number;
  reviewsAvailable: boolean;
};

export type OverviewAverages = {
  population: number | null;
  securityScore: number | null;
  environmentScore: number | null;
};

export type OverviewHighlights = {
  safestCities: OverviewCityCard[];
  greenestCities: OverviewCityCard[];
};

export type OverviewData = {
  totals: OverviewTotals;
  averages: OverviewAverages;
  highlights: OverviewHighlights;
};

export type OverviewResponse = {
  data: OverviewData;
};

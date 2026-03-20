export interface OverviewCityCard {
  code: string;
  name: string;
  securityScore: number | null;
  environmentScore: number | null;
}

export interface OverviewResponse {
  data: {
    totals: {
      cities: number;
      reviewedCities: number;
      reviewsAvailable: boolean;
    };
    averages: {
      population: number | null;
      securityScore: number | null;
      environmentScore: number | null;
    };
    highlights: {
      safestCities: OverviewCityCard[];
      greenestCities: OverviewCityCard[];
    };
  };
}

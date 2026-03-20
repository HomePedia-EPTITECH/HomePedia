export interface City {
  code: string;
  name: string;
  metrics: {
    population: number | null;
    averageAge: number | null;
    activePopulation: number | null;
    scores: {
      security: number | null;
      environment: number | null;
      practicalLife: number | null;
      leisure: number | null;
      health: number | null;
      transport: number | null;
      education: number | null;
    };
  };
}

export interface CitiesResponse {
  data: City[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CityResponse {
  data: City;
}

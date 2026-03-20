export interface CityReviews {
  code: string;
  sourceUrl: string | null;
  harvestedAt: string | null;
  reviews: {
    positive: string[];
    negative: string[];
    all: string[];
  };
  metricsSnapshot: Record<string, string | null>;
}

export interface CityReviewsResponse {
  data: CityReviews;
  meta: {
    source: "mongo";
    collection: "city_backups";
  };
}


export type ReviewsBuckets = {
  positive: string[];
  negative: string[];
  all: string[];
};

export type CityReviews = {
  code: string;
  sourceUrl: string | null;
  harvestedAt: string | null;
  reviews: ReviewsBuckets;
};

export type CityReviewsMeta = {
  source: "mongo";
  collection: "reviews_raw";
};

export type CityReviewsResponse = {
  data: CityReviews;
  meta: CityReviewsMeta;
};

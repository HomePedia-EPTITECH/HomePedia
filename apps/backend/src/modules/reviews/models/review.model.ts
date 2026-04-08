import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReviewsBuckets {
  @ApiProperty({ type: [String], example: ["Ville calme et agreable"] })
  positive!: string[];

  @ApiProperty({ type: [String], example: ["Transports compliques"] })
  negative!: string[];

  @ApiProperty({ type: [String], example: ["Ville calme et agreable", "Transports compliques"] })
  all!: string[];
}

export class CityReviews {
  @ApiProperty({ example: "75056" })
  code!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: "https://www.bien-dans-ma-ville.fr/paris-75056/"
  })
  sourceUrl!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  harvestedAt!: string | null;

  @ApiProperty({ type: ReviewsBuckets })
  reviews!: ReviewsBuckets;
}

export class CityReviewsMeta {
  @ApiProperty({ example: "mongo" })
  source!: "mongo";

  @ApiProperty({ example: "reviews_raw" })
  collection!: "reviews_raw";
}

export class CityReviewsResponse {
  @ApiProperty({ type: CityReviews })
  data!: CityReviews;

  @ApiProperty({ type: CityReviewsMeta })
  meta!: CityReviewsMeta;
}

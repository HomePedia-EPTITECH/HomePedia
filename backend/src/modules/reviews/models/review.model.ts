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

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "string", nullable: true },
    example: {
      nb_habitant: "2145906",
      score_securite: "3.8"
    }
  })
  metricsSnapshot!: Record<string, string | null>;
}

export class CityReviewsMeta {
  @ApiProperty({ example: "mongo" })
  source!: "mongo";

  @ApiProperty({ example: "city_backups" })
  collection!: "city_backups";
}

export class CityReviewsResponse {
  @ApiProperty({ type: CityReviews })
  data!: CityReviews;

  @ApiProperty({ type: CityReviewsMeta })
  meta!: CityReviewsMeta;
}


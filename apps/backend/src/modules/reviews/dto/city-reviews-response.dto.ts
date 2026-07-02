import { ApiProperty } from "@nestjs/swagger";

export class ReviewsBucketsDto {
  @ApiProperty({ type: [String] })
  positive!: string[];

  @ApiProperty({ type: [String] })
  negative!: string[];

  @ApiProperty({ type: [String] })
  all!: string[];
}

export class CityReviewsDto {
  @ApiProperty({ example: "75056" })
  code!: string;

  @ApiProperty({ nullable: true, example: "https://www.bien-dans-ma-ville.fr/paris-75056/avis.html" })
  sourceUrl!: string | null;

  @ApiProperty({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  harvestedAt!: string | null;

  @ApiProperty({ type: () => ReviewsBucketsDto })
  reviews!: ReviewsBucketsDto;
}

export class CityReviewsMetaDto {
  @ApiProperty({ enum: ["mongo"], example: "mongo" })
  source!: "mongo";

  @ApiProperty({ enum: ["reviews_raw"], example: "reviews_raw" })
  collection!: "reviews_raw";
}

export class CityReviewsResponseDto {
  @ApiProperty({ type: () => CityReviewsDto })
  data!: CityReviewsDto;

  @ApiProperty({ type: () => CityReviewsMetaDto })
  meta!: CityReviewsMetaDto;
}

import { ApiProperty } from "@nestjs/swagger";

export class CityReviewItemDto {
  @ApiProperty({ example: "66b3b4f0d4c4f8a9a1234567" })
  id!: string;

  @ApiProperty({ example: "Ville agreable" })
  text!: string;

  @ApiProperty({ nullable: true, example: "positive" })
  sentimentLabel!: string | null;

  @ApiProperty({ nullable: true, example: "bdmv" })
  source!: string | null;

  @ApiProperty({ nullable: true, example: "https://www.bien-dans-ma-ville.fr/paris-75056/avis.html" })
  urlPage!: string | null;

  @ApiProperty({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  collectedAt!: string | null;
}

export class ReviewsPaginationDto {
  @ApiProperty({ example: 100 })
  limit!: number;

  @ApiProperty({ example: false })
  hasMore!: boolean;

  @ApiProperty({ nullable: true, example: "66b3b4f0d4c4f8a9a1234567" })
  nextCursor!: string | null;
}

export class CityReviewItemsResponseDto {
  @ApiProperty({ example: "75056" })
  cityCode!: string;

  @ApiProperty({ nullable: true, example: "https://www.bien-dans-ma-ville.fr/paris-75056/avis.html" })
  sourceUrl!: string | null;

  @ApiProperty({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  harvestedAt!: string | null;

  @ApiProperty({ type: () => [CityReviewItemDto] })
  reviews!: CityReviewItemDto[];

  @ApiProperty({ type: () => ReviewsPaginationDto })
  pagination!: ReviewsPaginationDto;
}

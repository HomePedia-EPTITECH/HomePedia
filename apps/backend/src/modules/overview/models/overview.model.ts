import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OverviewCityCard {
  @ApiProperty({ example: "75056" })
  code!: string;

  @ApiProperty({ example: "Paris" })
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: 3.8 })
  securityScore!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4.1 })
  environmentScore!: number | null;
}

export class OverviewTotals {
  @ApiProperty({ example: 34871 })
  cities!: number;

  @ApiProperty({ example: 10234 })
  reviewedCities!: number;

  @ApiProperty({ example: true })
  reviewsAvailable!: boolean;
}

export class OverviewAverages {
  @ApiPropertyOptional({ nullable: true, example: 52743.18 })
  population!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 3.74 })
  securityScore!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 3.92 })
  environmentScore!: number | null;
}

export class OverviewHighlights {
  @ApiProperty({ type: [OverviewCityCard] })
  safestCities!: OverviewCityCard[];

  @ApiProperty({ type: [OverviewCityCard] })
  greenestCities!: OverviewCityCard[];
}

export class OverviewData {
  @ApiProperty({ type: OverviewTotals })
  totals!: OverviewTotals;

  @ApiProperty({ type: OverviewAverages })
  averages!: OverviewAverages;

  @ApiProperty({ type: OverviewHighlights })
  highlights!: OverviewHighlights;
}

export class OverviewResponse {
  @ApiProperty({ type: OverviewData })
  data!: OverviewData;
}

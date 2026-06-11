import { ApiProperty } from "@nestjs/swagger";

export class OverviewCityCardDto {
  @ApiProperty({ example: "75056" })
  code!: string;

  @ApiProperty({ example: "Paris" })
  name!: string;

  @ApiProperty({ type: Number, nullable: true, example: 3.8 })
  securityScore!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4.1 })
  environmentScore!: number | null;
}

export class OverviewTotalsDto {
  @ApiProperty({ type: Number, example: 34871 })
  cities!: number;

  @ApiProperty({ type: Number, example: 10234 })
  reviewedCities!: number;

  @ApiProperty({ type: Boolean, example: true })
  reviewsAvailable!: boolean;
}

export class OverviewAveragesDto {
  @ApiProperty({ type: Number, nullable: true, example: 52743.18 })
  population!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3.74 })
  securityScore!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3.92 })
  environmentScore!: number | null;
}

export class OverviewHighlightsDto {
  @ApiProperty({ type: () => [OverviewCityCardDto] })
  safestCities!: OverviewCityCardDto[];

  @ApiProperty({ type: () => [OverviewCityCardDto] })
  greenestCities!: OverviewCityCardDto[];
}

export class OverviewDataDto {
  @ApiProperty({ type: () => OverviewTotalsDto })
  totals!: OverviewTotalsDto;

  @ApiProperty({ type: () => OverviewAveragesDto })
  averages!: OverviewAveragesDto;

  @ApiProperty({ type: () => OverviewHighlightsDto })
  highlights!: OverviewHighlightsDto;
}

export class OverviewResponseDto {
  @ApiProperty({ type: () => OverviewDataDto })
  data!: OverviewDataDto;
}

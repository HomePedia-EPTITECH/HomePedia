import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CityScores {
  @ApiPropertyOptional({ nullable: true, example: 3.8 })
  security!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4.1 })
  environment!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 3.4 })
  practicalLife!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 3.2 })
  leisure!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 3.9 })
  health!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4.3 })
  transport!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 4 })
  education!: number | null;
}

export class CityMetrics {
  @ApiPropertyOptional({ nullable: true, example: 2145906 })
  population!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 36 })
  averageAge!: number | null;

  @ApiPropertyOptional({ nullable: true, example: 65 })
  activePopulation!: number | null;

  @ApiProperty({ type: CityScores })
  scores!: CityScores;
}

export class City {
  @ApiProperty({ example: "75056" })
  code!: string;

  @ApiProperty({ example: "Paris 75056" })
  name!: string;

  @ApiProperty({ type: CityMetrics })
  metrics!: CityMetrics;
}

export class CitiesMeta {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 34871 })
  total!: number;

  @ApiProperty({ example: 1744 })
  totalPages!: number;
}

export class CitiesResponse {
  @ApiProperty({ type: [City] })
  data!: City[];

  @ApiProperty({ type: CitiesMeta })
  meta!: CitiesMeta;
}

export class CityResponse {
  @ApiProperty({ type: City })
  data!: City;
}

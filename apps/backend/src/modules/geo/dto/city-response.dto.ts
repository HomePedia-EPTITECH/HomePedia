import { ApiProperty } from "@nestjs/swagger";

export class CityScoresDto {
  @ApiProperty({ type: Number, nullable: true, example: 3.8 })
  security!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4.1 })
  environment!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3.4 })
  practicalLife!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3.2 })
  leisure!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3.9 })
  health!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4.3 })
  transport!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4.0 })
  education!: number | null;
}

export class CitySalaryDto {
  @ApiProperty({ type: Number, nullable: true, example: 4200 })
  cadre!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3200 })
  profIntermediaire!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 2400 })
  employe!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 2200 })
  ouvrier!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3100 })
  total!: number | null;
}

export class CityMetricsDto {
  @ApiProperty({ type: Number, nullable: true, example: 2145906 })
  population!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 36 })
  averageAge!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 65 })
  activePopulation!: number | null;

  @ApiProperty({ type: () => CityScoresDto })
  scores!: CityScoresDto;

  @ApiProperty({ type: () => CitySalaryDto })
  salary!: CitySalaryDto;
}

export class CityDto {
  @ApiProperty({ example: "75056" })
  code!: string;

  @ApiProperty({ example: "Paris" })
  name!: string;

  @ApiProperty({ type: () => CityMetricsDto })
  metrics!: CityMetricsDto;
}

export class CitiesMetaDto {
  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  limit!: number;

  @ApiProperty({ type: Number, example: 1 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  totalPages!: number;
}

export class CitiesResponseDto {
  @ApiProperty({ type: () => [CityDto] })
  data!: CityDto[];

  @ApiProperty({ type: () => CitiesMetaDto })
  meta!: CitiesMetaDto;
}

export class CityResponseDto {
  @ApiProperty({ type: () => CityDto })
  data!: CityDto;
}

export class CityDetailBlockDto {
  @ApiProperty({
    type: "object",
    additionalProperties: {
      oneOf: [
        { type: "string" },
        { type: "number" },
        { type: "integer" },
        { type: "boolean" }
      ],
      nullable: true
    },
    description:
      "Dynamic map of flattened metrics for this section. Keys are section-specific and can grow without changing the contract."
  })
  values!: Record<string, string | number | null>;
}

export class CityDetailBlocksDto {
  @ApiProperty({ type: () => CityDetailBlockDto })
  demography!: CityDetailBlockDto;

  @ApiProperty({ type: () => CityDetailBlockDto })
  security!: CityDetailBlockDto;

  @ApiProperty({ type: () => CityDetailBlockDto })
  qualityOfLife!: CityDetailBlockDto;

  @ApiProperty({ type: () => CityDetailBlockDto })
  services!: CityDetailBlockDto;

  @ApiProperty({ type: () => CityDetailBlockDto })
  realEstate!: CityDetailBlockDto;

  @ApiProperty({ type: () => CityDetailBlockDto })
  salary!: CityDetailBlockDto;
}

export class CityDetailAdminDto {
  @ApiProperty({ nullable: true, example: "75" })
  codeDept!: string | null;

  @ApiProperty({ nullable: true, example: "75000" })
  postalCode!: string | null;

  @ApiProperty({ nullable: true, example: "Ile-de-France" })
  region!: string | null;

  @ApiProperty({ nullable: true, example: "Paris" })
  departement!: string | null;

  @ApiProperty({ nullable: true, example: "Metropole du Grand Paris" })
  metropole!: string | null;

  @ApiProperty({ nullable: true, example: "Anne Hidalgo" })
  mayor!: string | null;
}

export class CityDetailSourceDto {
  @ApiProperty({ nullable: true, example: "bdmv" })
  provider!: string | null;

  @ApiProperty({ nullable: true, example: "https://www.bien-dans-ma-ville.fr/paris-75056/" })
  cityPage!: string | null;

  @ApiProperty({
    nullable: true,
    example: "https://www.bien-dans-ma-ville.fr/paris-75056/avis.html"
  })
  reviewsPage!: string | null;

  @ApiProperty({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  harvestedAt!: string | null;

  @ApiProperty({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  updatedAt!: string | null;
}

export class CityDetailReviewsDto {
  @ApiProperty({ type: Number, example: 2 })
  count!: number;

  @ApiProperty({ type: [String] })
  positive!: string[];

  @ApiProperty({ type: [String] })
  negative!: string[];

  @ApiProperty({ type: [String] })
  all!: string[];
}

export class CityDetailDto {
  @ApiProperty({ type: () => CityDto })
  city!: CityDto;

  @ApiProperty({ type: () => CityDetailAdminDto })
  admin!: CityDetailAdminDto;

  @ApiProperty({ type: () => CityDetailSourceDto })
  source!: CityDetailSourceDto;

  @ApiProperty({ type: () => CityDetailBlocksDto })
  blocks!: CityDetailBlocksDto;

  @ApiProperty({ type: () => CityDetailReviewsDto })
  reviews!: CityDetailReviewsDto;
}

export class CityDetailResponseDto {
  @ApiProperty({ type: () => CityDetailDto })
  data!: CityDetailDto;
}

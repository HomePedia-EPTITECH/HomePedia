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

  @ApiProperty({ example: "Paris" })
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

class CityDetailObjectBlock {
  @ApiProperty({
    type: "object",
    additionalProperties: {
      oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }]
    },
    example: {
      nb_habitant: "2145906",
      age_moyen: "36"
    }
  })
  values!: Record<string, string | number | null>;
}

export class CityDetailAdmin {
  @ApiPropertyOptional({ nullable: true, example: "75" })
  codeDept!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "75000" })
  postalCode!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "Ile-de-France" })
  region!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "Paris" })
  departement!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "Metropole du Grand Paris" })
  metropole!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "Anne Hidalgo" })
  mayor!: string | null;
}

export class CityDetailSource {
  @ApiPropertyOptional({ nullable: true, example: "ville-ideale" })
  provider!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: "https://www.bien-dans-ma-ville.fr/paris-75056/"
  })
  cityPage!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: "https://www.bien-dans-ma-ville.fr/paris-75056/avis.html"
  })
  reviewsPage!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  harvestedAt!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  updatedAt!: string | null;
}

export class CityDetailReviews {
  @ApiProperty({ example: 12 })
  count!: number;

  @ApiProperty({ type: [String], example: ["Ville calme et agreable"] })
  positive!: string[];

  @ApiProperty({ type: [String], example: ["Transports compliques"] })
  negative!: string[];

  @ApiProperty({ type: [String], example: ["Ville calme et agreable", "Transports compliques"] })
  all!: string[];
}

export class CityDetailBlocks {
  @ApiProperty({ type: CityDetailObjectBlock })
  demography!: CityDetailObjectBlock;

  @ApiProperty({ type: CityDetailObjectBlock })
  security!: CityDetailObjectBlock;

  @ApiProperty({ type: CityDetailObjectBlock })
  qualityOfLife!: CityDetailObjectBlock;

  @ApiProperty({ type: CityDetailObjectBlock })
  services!: CityDetailObjectBlock;

  @ApiProperty({ type: CityDetailObjectBlock })
  realEstate!: CityDetailObjectBlock;
}

export class CityDetail {
  @ApiProperty({ type: City })
  city!: City;

  @ApiProperty({ type: CityDetailAdmin })
  admin!: CityDetailAdmin;

  @ApiProperty({ type: CityDetailSource })
  source!: CityDetailSource;

  @ApiProperty({ type: CityDetailBlocks })
  blocks!: CityDetailBlocks;

  @ApiProperty({ type: CityDetailReviews })
  reviews!: CityDetailReviews;
}

export class CityDetailResponse {
  @ApiProperty({ type: CityDetail })
  data!: CityDetail;
}

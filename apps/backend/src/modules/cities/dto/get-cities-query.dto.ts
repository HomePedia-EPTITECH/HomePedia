import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum CitySortBy {
  Name = "name",
  Population = "population",
  Security = "security",
  Environment = "environment",
  Health = "health",
  Transport = "transport",
  Education = "education"
}

export enum SortOrder {
  Asc = "asc",
  Desc = "desc"
}

export class GetCitiesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: "Search by city code or name" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: "Filter by departement code", example: "75" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  code_dept?: string;

  @ApiPropertyOptional({
    description: "Filter by region name",
    example: "Ile-de-France"
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  nom_region?: string;

  @ApiPropertyOptional({
    description: "Minimum average quality score",
    minimum: 0,
    maximum: 5,
    example: 3.5
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  note_moyenne_globale_min?: number;

  @ApiPropertyOptional({
    description: "Minimum number of reviews",
    minimum: 0,
    example: 100
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  nb_avis_min?: number;

  @ApiPropertyOptional({
    description: "Maximum house price per square meter",
    minimum: 0,
    example: 5000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_m2_maison_max?: number;

  @ApiPropertyOptional({
    description: "Maximum apartment price per square meter",
    minimum: 0,
    example: 4500
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_m2_appartement_max?: number;

  @ApiPropertyOptional({ enum: CitySortBy, default: CitySortBy.Name })
  @IsOptional()
  @IsEnum(CitySortBy)
  sortBy: CitySortBy = CitySortBy.Name;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Asc })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.Asc;
}

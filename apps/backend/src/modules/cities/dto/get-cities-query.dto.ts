import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

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
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  code_dept?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  nom_region?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  note_moyenne_globale_min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  nb_avis_min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_m2_maison_max?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_m2_appartement_max?: number;

  @IsOptional()
  @IsEnum(CitySortBy)
  sortBy: CitySortBy = CitySortBy.Name;

  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.Asc;
}

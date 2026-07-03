import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum CitySortBy {
  Name = "name",
  Population = "population",
  Security = "security",
  Environment = "environment",
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
  @ApiPropertyOptional({ default: 1, minimum: 1, example: 1 })
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, example: 20 })
  limit: number = 20;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @ApiPropertyOptional({ example: "Paris" })
  search?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  @ApiPropertyOptional({ example: "75" })
  code_dept?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @ApiPropertyOptional({ example: "Ile-de-France" })
  nom_region?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @ApiPropertyOptional({ minimum: 0, maximum: 5, example: 3.5 })
  note_moyenne_globale_min?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0, example: 5000 })
  prix_m2_maison_max?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ minimum: 0, example: 4500 })
  prix_m2_appartement_max?: number;

  @IsOptional()
  @IsEnum(CitySortBy)
  @ApiPropertyOptional({ enum: CitySortBy, default: CitySortBy.Name })
  sortBy: CitySortBy = CitySortBy.Name;

  @IsOptional()
  @IsEnum(SortOrder)
  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Asc })
  order: SortOrder = SortOrder.Asc;
}

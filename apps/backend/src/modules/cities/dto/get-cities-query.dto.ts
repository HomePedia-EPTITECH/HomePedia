import { Transform } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
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

  @ApiPropertyOptional({ enum: CitySortBy, default: CitySortBy.Name })
  @IsOptional()
  @IsEnum(CitySortBy)
  sortBy: CitySortBy = CitySortBy.Name;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Asc })
  @IsOptional()
  @IsEnum(SortOrder)
  order: SortOrder = SortOrder.Asc;
}

import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Min
} from "class-validator";
import { CommuneSize } from "../communes.types";

function normalizeArrayValue(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeArrayValue(item) ?? [])
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  const text = String(value).trim();
  if (!text) {
    return undefined;
  }

  if (text.includes(",")) {
    return text
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [text];
}

export class GetCommunesQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["11"] })
  region?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["75"] })
  departement?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(["village", "ville", "metropole"], { each: true })
  @ApiPropertyOptional({ type: [String], enum: ["village", "ville", "metropole"] })
  taille?: CommuneSize[];

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @ApiPropertyOptional({ example: "paris" })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ example: 5000, minimum: 0 })
  prixMax?: number;
}

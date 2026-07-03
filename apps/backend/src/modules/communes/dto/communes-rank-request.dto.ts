import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import { CommuneSize } from "../communes.types";
import { ImportanceLevel } from "../communes.scoring";

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

export class CommuneRankFiltersDto {
  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["11"] })
  regionIds?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["75"] })
  departementIds?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn(["village", "ville", "metropole"], { each: true })
  @ApiPropertyOptional({ type: [String], enum: ["village", "ville", "metropole"] })
  tailles?: CommuneSize[];
}

export class CommuneRankImportanceDto {
  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 2 })
  pouvoirAchat!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 2 })
  securite!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 0 })
  qualiteVie!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 0 })
  ecoles!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 0 })
  sante!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 0 })
  emploi!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 0 })
  commerces!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 0 })
  transports!: ImportanceLevel;

  @IsInt()
  @Min(0)
  @Max(3)
  @ApiProperty({ enum: [0, 1, 2, 3], example: 0 })
  cultureLoisirs!: ImportanceLevel;
}

export class CommuneRankSubFocusDto {
  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["louer"] })
  pouvoirAchat?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["agressions"] })
  securite?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["environnement"] })
  qualiteVie?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["maternelle"] })
  ecoles?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["medecins"] })
  sante?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["revenus"] })
  emploi?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["supermarches"] })
  commerces?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["transports"] })
  transports?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeArrayValue(value))
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String], example: ["culture"] })
  cultureLoisirs?: string[];
}

export class CommuneRankRequestDto {
  @ValidateNested()
  @Type(() => CommuneRankFiltersDto)
  @ApiProperty({ type: () => CommuneRankFiltersDto })
  filters!: CommuneRankFiltersDto;

  @ValidateNested()
  @Type(() => CommuneRankImportanceDto)
  @ApiProperty({ type: () => CommuneRankImportanceDto })
  importance!: CommuneRankImportanceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CommuneRankSubFocusDto)
  @ApiPropertyOptional({ type: () => CommuneRankSubFocusDto })
  subFocus?: CommuneRankSubFocusDto;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20;
}

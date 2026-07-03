import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
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

export class CommuneRankWeightsDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  immobilier!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  securite!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  education!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  sante!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  commerces!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  salaire!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  environnement!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  transports!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  loisirs!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 1 })
  viePratique!: number;
}

export class CommuneRankContextDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 3200 })
  salaryNetMensuel!: number;
}

export class CommuneRankRequestDto {
  @ValidateNested()
  @Type(() => CommuneRankFiltersDto)
  @ApiProperty({ type: () => CommuneRankFiltersDto })
  filters!: CommuneRankFiltersDto;

  @ValidateNested()
  @Type(() => CommuneRankWeightsDto)
  @ApiProperty({ type: () => CommuneRankWeightsDto })
  weights!: CommuneRankWeightsDto;

  @ValidateNested()
  @Type(() => CommuneRankContextDto)
  @ApiProperty({ type: () => CommuneRankContextDto })
  context!: CommuneRankContextDto;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  @IsNumber()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number = 20;
}

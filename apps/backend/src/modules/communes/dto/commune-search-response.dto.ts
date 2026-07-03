import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { CommuneSize } from "../communes.types";

export class CommuneSearchItemDto {
  @ApiProperty({ example: "75056" })
  id!: string;

  @ApiProperty({ example: "Paris" })
  nom!: string;

  @ApiProperty({ nullable: true, example: "75000" })
  codePostal!: string | null;

  @ApiProperty({ nullable: true, example: "Paris" })
  departement!: string | null;

  @ApiProperty({ nullable: true, example: "Ile-de-France" })
  region!: string | null;

  @ApiProperty({ enum: ["village", "ville", "metropole"], example: "metropole" })
  taille!: CommuneSize;
}

export class CommuneSearchResponseDto {
  @ApiProperty({ type: () => [CommuneSearchItemDto] })
  data!: CommuneSearchItemDto[];
}

export class CommuneSearchQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @ApiPropertyOptional({ example: "paris" })
  q?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : Number(value)))
  @IsNumber()
  @Min(1)
  @Max(10)
  @ApiPropertyOptional({ example: 8, minimum: 1, maximum: 10 })
  limit?: number;
}

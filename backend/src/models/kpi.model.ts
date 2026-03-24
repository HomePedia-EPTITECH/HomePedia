import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class Kpi {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "population_growth" })
  name!: string;

  @ApiProperty({ example: 2.4 })
  value!: number;

  @ApiPropertyOptional({ nullable: true, example: "%" })
  unit!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "insee" })
  source!: string | null;

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  capturedAt!: string;

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  updatedAt!: string;
}


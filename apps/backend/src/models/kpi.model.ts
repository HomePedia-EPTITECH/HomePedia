import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class Kpi {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: "total_cities" })
  name!: string;

  @ApiProperty({ example: 34871 })
  value!: number;

  @ApiPropertyOptional({ nullable: true, example: "cities" })
  unit!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "mongo:communes_direct" })
  source!: string | null;

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  capturedAt!: string;

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  updatedAt!: string;
}

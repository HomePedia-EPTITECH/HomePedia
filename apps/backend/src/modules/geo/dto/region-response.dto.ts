import { ApiProperty } from "@nestjs/swagger";

export class RegionDto {
  @ApiProperty({ example: "11" })
  code!: string;

  @ApiProperty({ nullable: true, example: "Ile-de-France" })
  name!: string | null;

  @ApiProperty({ type: Number, example: 8 })
  departementCount!: number;

  @ApiProperty({ type: Number, example: 100 })
  cityCount!: number;

  @ApiProperty({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  updatedAt!: string | null;
}

export class RegionsResponseDto {
  @ApiProperty({ type: () => [RegionDto] })
  data!: RegionDto[];
}

export class RegionResponseDto {
  @ApiProperty({ type: () => RegionDto })
  data!: RegionDto;
}

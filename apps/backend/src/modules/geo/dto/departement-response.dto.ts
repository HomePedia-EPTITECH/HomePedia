import { ApiProperty } from "@nestjs/swagger";

export class DepartementDto {
  @ApiProperty({ example: "75" })
  code!: string;

  @ApiProperty({ nullable: true, example: "Paris" })
  name!: string | null;

  @ApiProperty({ type: Number, example: 1 })
  cityCount!: number;

  @ApiProperty({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  updatedAt!: string | null;
}

export class DepartementsResponseDto {
  @ApiProperty({ type: () => [DepartementDto] })
  data!: DepartementDto[];
}

export class DepartementResponseDto {
  @ApiProperty({ type: () => DepartementDto })
  data!: DepartementDto;
}

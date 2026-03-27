import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class Departement {
  @ApiProperty({ example: "75" })
  code!: string;

  @ApiPropertyOptional({ nullable: true, example: "Paris" })
  name!: string | null;

  @ApiProperty({ example: 1 })
  cityCount!: number;

  @ApiPropertyOptional({ nullable: true, example: "2026-03-24T12:00:00.000Z" })
  updatedAt!: string | null;
}

export class DepartementsResponse {
  @ApiProperty({ type: [Departement] })
  data!: Departement[];
}

export class DepartementResponse {
  @ApiProperty({ type: Departement })
  data!: Departement;
}

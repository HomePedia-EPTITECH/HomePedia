import { ApiProperty } from "@nestjs/swagger";

export class HealthChecksDto {
  @ApiProperty({ enum: ["up", "down"], example: "up" })
  postgres!: "up" | "down";

  @ApiProperty({ enum: ["up", "down"], example: "up" })
  mongo!: "up" | "down";
}

export class HealthResponseDto {
  @ApiProperty({ enum: ["ok", "error"], example: "ok" })
  status!: "ok" | "error";

  @ApiProperty({ example: "homepedia-backend" })
  service!: "homepedia-backend";

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ type: () => HealthChecksDto })
  checks!: HealthChecksDto;
}

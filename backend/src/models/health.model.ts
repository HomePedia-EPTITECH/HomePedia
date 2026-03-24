import { ApiProperty } from "@nestjs/swagger";

export class HealthChecks {
  @ApiProperty({ enum: ["up", "down"], example: "up" })
  postgres!: "up" | "down";

  @ApiProperty({ enum: ["up", "down"], example: "up" })
  mongo!: "up" | "down";
}

export class HealthResponse {
  @ApiProperty({ enum: ["ok", "error"], example: "ok" })
  status!: "ok" | "error";

  @ApiProperty({ example: "homepedia-backend" })
  service!: "homepedia-backend";

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({ type: HealthChecks })
  checks!: HealthChecks;
}

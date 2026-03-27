import { ApiProperty } from "@nestjs/swagger";

export class ApiErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: "Bad Request" })
  error!: string;

  @ApiProperty({ example: "Validation failed" })
  message!: string;

  @ApiProperty({ example: "/api/cities?limit=101" })
  path!: string;

  @ApiProperty({ example: "2026-03-24T12:00:00.000Z" })
  timestamp!: string;

  @ApiProperty({
    required: false,
    oneOf: [
      {
        type: "array",
        items: { type: "string" },
        example: ["limit must not be greater than 100"]
      },
      {
        type: "object",
        example: {
          checks: {
            postgres: "up",
            mongo: "down"
          }
        }
      }
    ]
  })
  details?: unknown;
}

import { ApiProperty } from "@nestjs/swagger";

export class ApiErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [
      { type: "string", example: "City 75056 not found" },
      {
        type: "array",
        items: { type: "string" },
        example: ["limit must not be greater than 100"]
      }
    ]
  })
  message!: string | string[];

  @ApiProperty({ example: "Bad Request" })
  error!: string;
}

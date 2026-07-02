import { Type } from "class-transformer";
import { IsInt, IsMongoId, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class GetCityReviewsItemsQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 100, example: 100 })
  limit = 100;

  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  @ApiPropertyOptional({ example: "66b3b4f0d4c4f8a9a1234567" })
  cursor?: string;
}

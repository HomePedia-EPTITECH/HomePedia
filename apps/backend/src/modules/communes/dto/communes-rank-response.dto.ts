import { ApiProperty } from "@nestjs/swagger";
import { CommuneListItemDto } from "./commune-list-response.dto";

export class CommuneRankBreakdownDto {
  @ApiProperty({ type: Number, example: 64 })
  immobilier!: number;

  @ApiProperty({ type: Number, example: 72 })
  securite!: number;

  @ApiProperty({ type: Number, example: 68 })
  education!: number;

  @ApiProperty({ type: Number, example: 70 })
  sante!: number;

  @ApiProperty({ type: Number, example: 66 })
  commerces!: number;

  @ApiProperty({ type: Number, example: 58 })
  salaire!: number;

  @ApiProperty({ type: Number, example: 75 })
  environnement!: number;

  @ApiProperty({ type: Number, example: 61 })
  transports!: number;

  @ApiProperty({ type: Number, example: 63 })
  loisirs!: number;

  @ApiProperty({ type: Number, example: 69 })
  viePratique!: number;
}

export class CommuneRankItemDto {
  @ApiProperty({ type: () => CommuneListItemDto })
  commune!: CommuneListItemDto;

  @ApiProperty({ type: Number, example: 71.2 })
  score!: number;

  @ApiProperty({ type: () => CommuneRankBreakdownDto })
  breakdown!: CommuneRankBreakdownDto;
}

export class CommuneRankMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 34871 })
  total!: number;

  @ApiProperty({ example: 1744 })
  totalPages!: number;
}

export class CommuneRankResponseDto {
  @ApiProperty({ type: () => [CommuneRankItemDto] })
  data!: CommuneRankItemDto[];

  @ApiProperty({ type: () => CommuneRankMetaDto })
  meta!: CommuneRankMetaDto;
}

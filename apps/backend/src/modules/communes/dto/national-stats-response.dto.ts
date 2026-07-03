import { ApiProperty } from "@nestjs/swagger";
import { CommuneNotesDto } from "./common.dto";

export class NationalStatsDto {
  @ApiProperty({ type: Number, nullable: true, example: 52743.18 })
  populationMoyenne!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 28700 })
  revenuMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 10.8 })
  tauxChomageMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 5400 })
  prixM2MaisonMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4700 })
  prixM2AppartementMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 9.2 })
  agressionsMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 6.2 })
  cambriolagesMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 26.0 })
  volsDegradationsMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 5.4 })
  stupefiantsMoyen!: number | null;

  @ApiProperty({ type: () => CommuneNotesDto })
  notesMoyennes!: CommuneNotesDto;
}

export class NationalStatsResponseDto {
  @ApiProperty({ type: () => NationalStatsDto })
  data!: NationalStatsDto;
}

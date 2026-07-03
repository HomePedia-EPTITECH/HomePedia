import { ApiProperty } from "@nestjs/swagger";
import { CommuneSize } from "../communes.types";
import {
  CommuneNotesDto,
  CommuneSalaryDto,
  CommuneServicesDto
} from "./common.dto";

export class CommuneListItemDto {
  @ApiProperty({ example: "75056" })
  id!: string;

  @ApiProperty({ example: "Paris" })
  nom!: string;

  @ApiProperty({ nullable: true, example: "75000" })
  codePostal!: string | null;

  @ApiProperty({ nullable: true, example: "Paris" })
  departement!: string | null;

  @ApiProperty({ nullable: true, example: "Ile-de-France" })
  region!: string | null;

  @ApiProperty({ nullable: true, example: "Metropole du Grand Paris" })
  metropole!: string | null;

  @ApiProperty({ enum: ["village", "ville", "metropole"], example: "metropole" })
  taille!: CommuneSize;

  @ApiProperty({ type: Number, nullable: true, example: 2.3522 })
  lon!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 48.8566 })
  lat!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 2145906 })
  population!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 20566 })
  densite!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 105 })
  superficie!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 36 })
  ageMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 43000 })
  revenuMoyen!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7.5 })
  tauxChomage!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 10450 })
  prixM2Maison!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 9850 })
  prixM2Appartement!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 33.1 })
  partProprietaires!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 61.4 })
  partLocataires!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 85.2 })
  partResidencesPrincipales!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 6.7 })
  partResidencesSecondaires!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 8.1 })
  partResidencesVacantes!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 120 })
  agressions!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 80 })
  cambriolages!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 210 })
  volsDegradations!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 35 })
  stupefiants!: number | null;

  @ApiProperty({ type: () => CommuneNotesDto })
  notes!: CommuneNotesDto;

  @ApiProperty({ type: Number, nullable: true, example: 4.1 })
  noteGlobale!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4820 })
  nbAvis!: number | null;

  @ApiProperty({ type: () => CommuneServicesDto })
  services!: CommuneServicesDto;

  @ApiProperty({ type: () => CommuneSalaryDto })
  salary!: CommuneSalaryDto;
}

export class CommuneListResponseDto {
  @ApiProperty({ type: () => [CommuneListItemDto] })
  data!: CommuneListItemDto[];
}

import { ApiProperty } from "@nestjs/swagger";

export class CommuneNotesDto {
  @ApiProperty({ type: Number, nullable: true, example: 7.2 })
  environnement!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 6.8 })
  transports!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7.5 })
  sante!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 6.1 })
  securite!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7.0 })
  sportsLoisirs!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7.4 })
  culture!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7.6 })
  enseignement!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7.8 })
  commerces!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 7.1 })
  qualiteVie!: number | null;
}

export class CommuneServicesDto {
  @ApiProperty({ type: Number, nullable: true, example: 120 })
  medecins!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 22 })
  pharmacies!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 5 })
  hopitaux!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 340 })
  specialistes!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 18 })
  creches!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 95 })
  ecolesMaternelles!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 103 })
  ecolesPrimaires!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 42 })
  colleges!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 20 })
  lycees!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 8 })
  hypermarches!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 74 })
  supermarches!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 820 })
  restaurants!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 220 })
  banques!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 1400 })
  boulangeries!: number | null;
}

export class CommuneSalaryDto {
  @ApiProperty({ type: Number, nullable: true, example: 4200 })
  cadre!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3200 })
  profIntermediaire!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 2400 })
  employe!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 2200 })
  ouvrier!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3100 })
  total!: number | null;
}

export class CommuneAvisDto {
  @ApiProperty({ example: "Anonyme" })
  auteur!: string;

  @ApiProperty({ type: Number, nullable: true, example: 4 })
  note!: number | null;

  @ApiProperty({ enum: ["positif", "negatif"], example: "positif" })
  sentiment!: "positif" | "negatif";

  @ApiProperty({ example: "Ville calme et agreable" })
  texte!: string;
}

export class CommunePriceHistoryItemDto {
  @ApiProperty({ example: 2025 })
  annee!: number;

  @ApiProperty({ type: Number, example: 3200 })
  prixM2!: number;
}

export class CommuneAgeDistributionItemDto {
  @ApiProperty({ example: "0-14" })
  tranche!: string;

  @ApiProperty({ type: Number, example: 18.4 })
  part!: number;
}

import { ApiProperty } from "@nestjs/swagger";
import { CommuneListItemDto } from "./commune-list-response.dto";
import {
  CommuneAgeDistributionItemDto,
  CommuneAvisDto,
  CommunePriceHistoryItemDto
} from "./common.dto";

export class CommuneDetailDto extends CommuneListItemDto {
  @ApiProperty({ type: () => [CommuneAvisDto] })
  avis!: CommuneAvisDto[];

  @ApiProperty({ type: () => [CommunePriceHistoryItemDto] })
  prixHistorique!: CommunePriceHistoryItemDto[];

  @ApiProperty({ type: () => [CommuneAgeDistributionItemDto] })
  ageDistribution!: CommuneAgeDistributionItemDto[];
}

export class CommuneDetailResponseDto {
  @ApiProperty({ type: () => CommuneDetailDto })
  data!: CommuneDetailDto;
}

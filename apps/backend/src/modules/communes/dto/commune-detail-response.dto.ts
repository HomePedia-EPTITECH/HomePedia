import { ApiProperty } from "@nestjs/swagger";
import { CommuneListItemDto } from "./commune-list-response.dto";
import { CommuneAgeDistributionItemDto, CommunePriceHistoryItemDto } from "./common.dto";

export class CommuneDetailDto extends CommuneListItemDto {
  @ApiProperty({ type: () => [CommunePriceHistoryItemDto] })
  prixHistorique!: CommunePriceHistoryItemDto[];

  @ApiProperty({ type: () => [CommuneAgeDistributionItemDto] })
  ageDistribution!: CommuneAgeDistributionItemDto[];
}

export class CommuneDetailResponseDto {
  @ApiProperty({ type: () => CommuneDetailDto })
  data!: CommuneDetailDto;
}

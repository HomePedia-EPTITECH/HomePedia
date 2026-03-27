import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import { ApiErrorResponse } from "../models/api-error.model";
import { Kpi } from "../models/kpi.model";
import { KpiService } from "../services/kpi.service";
import { KPI_BASE_PATH } from "../routes/kpi.routes";

@ApiTags("kpis")
@Controller(KPI_BASE_PATH)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @ApiOperation({ summary: "List KPI entries" })
  @ApiOkResponse({ type: Kpi, isArray: true })
  @Get()
  findAll() {
    return this.kpiService.findAll();
  }

  @ApiOperation({ summary: "Get a KPI by id" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ type: Kpi })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  @ApiNotFoundResponse({ type: ApiErrorResponse })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.kpiService.findOne(id);
  }
}

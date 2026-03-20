import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { KpiService } from "../services/kpi.service";
import { KPI_BASE_PATH } from "../routes/kpi.routes";

@ApiTags("kpis")
@Controller(KPI_BASE_PATH)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @ApiOperation({ summary: "List KPI entries" })
  @Get()
  findAll() {
    return this.kpiService.findAll();
  }

  @ApiOperation({ summary: "Get a KPI by id" })
  @ApiParam({ name: "id", type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.kpiService.findOne(id);
  }
}

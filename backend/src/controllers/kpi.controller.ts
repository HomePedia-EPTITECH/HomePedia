import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import { CreateKpiDto } from "../dto/create-kpi.dto";
import { UpdateKpiDto } from "../dto/update-kpi.dto";
import { KpiService } from "../services/kpi.service";
import { KPI_BASE_PATH } from "../routes/kpi.routes";

@Controller(KPI_BASE_PATH)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Post()
  create(@Body() dto: CreateKpiDto) {
    return this.kpiService.create(dto);
  }

  @Get()
  findAll() {
    return this.kpiService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.kpiService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateKpiDto) {
    return this.kpiService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.kpiService.remove(id);
  }
}


import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateKpiDto } from "../dto/create-kpi.dto";
import { UpdateKpiDto } from "../dto/update-kpi.dto";
import { Kpi } from "../models/kpi.model";
import { KpiRepository } from "../repositories/kpi.repository";

@Injectable()
export class KpiService {
  constructor(private readonly repository: KpiRepository) {}

  create(dto: CreateKpiDto): Promise<Kpi> {
    return this.repository.create(dto);
  }

  findAll(): Promise<Kpi[]> {
    return this.repository.findAll();
  }

  async findOne(id: number): Promise<Kpi> {
    const kpi = await this.repository.findById(id);
    if (!kpi) {
      throw new NotFoundException(`KPI ${id} not found`);
    }
    return kpi;
  }

  async update(id: number, dto: UpdateKpiDto): Promise<Kpi> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("At least one field must be provided");
    }

    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(`KPI ${id} not found`);
    }
    return updated;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`KPI ${id} not found`);
    }
  }
}


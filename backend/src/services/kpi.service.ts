import { Injectable, NotFoundException } from "@nestjs/common";
import { Kpi } from "../models/kpi.model";
import { KpiRepository } from "../repositories/kpi.repository";

@Injectable()
export class KpiService {
  constructor(private readonly repository: KpiRepository) {}

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
}

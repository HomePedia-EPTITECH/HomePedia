import { Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service";
import { MongoService } from "../db/mongo.service";
import { HealthResponse } from "../models/health.model";

type DependencyStatus = "up" | "down";

@Injectable()
export class HealthService {
  constructor(
    private readonly dbService: DbService,
    private readonly mongoService: MongoService
  ) {}

  async check(): Promise<{ healthy: boolean; response: HealthResponse }> {
    const [postgres, mongo] = await Promise.all([
      this.getDependencyStatus(() => this.dbService.checkConnection()),
      this.getDependencyStatus(() => this.mongoService.checkConnection())
    ]);

    const response: HealthResponse = {
      status: mongo === "up" ? "ok" : "error",
      service: "homepedia-backend",
      timestamp: new Date().toISOString(),
      checks: {
        postgres,
        mongo
      }
    };

    return {
      healthy: mongo === "up",
      response
    };
  }

  private async getDependencyStatus(
    check: () => Promise<void>
  ): Promise<DependencyStatus> {
    try {
      await check();
      return "up";
    } catch {
      return "down";
    }
  }
}

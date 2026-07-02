import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Pool, QueryResult, QueryResultRow } from "pg";

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST ?? "localhost",
      port: Number(process.env.POSTGRES_PORT ?? 5432),
      database: process.env.POSTGRES_DB ?? "homepedia",
      user: process.env.POSTGRES_USER ?? "admin",
      password: process.env.POSTGRES_PASSWORD ?? "",
      max: 10
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = []
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async checkConnection(): Promise<void> {
    await this.query("SELECT 1");
    this.logger.log("PostgreSQL connection established.");
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}


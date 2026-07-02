import { IMemoryDb, newDb } from "pg-mem";
import { Pool, QueryResultRow } from "pg";
import { DbService } from "../db/db.service";

export type PostgresIntegrationHarness = {
  db: IMemoryDb;
  dbService: DbService;
  exec: (sql: string) => void;
  close: () => Promise<void>;
};

export async function createPostgresIntegrationHarness(): Promise<PostgresIntegrationHarness> {
  const db = newDb({
    autoCreateForeignKeyIndices: true
  });

  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool() as Pool;

  const dbService = {
    query: <T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) =>
      pool.query<T>(text, values),
    checkConnection: async () => {
      await pool.query("SELECT 1");
    },
    onModuleDestroy: async () => {
      await pool.end();
    }
  } as DbService;

  return {
    db,
    dbService,
    exec: (sql: string) => {
      db.public.none(sql);
    },
    close: async () => {
      await pool.end();
    }
  };
}

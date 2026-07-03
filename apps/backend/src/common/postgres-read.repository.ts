import { DbService } from "../db/db.service";

export abstract class PostgresReadRepository {
  private readonly schemaName: string;

  protected constructor(protected readonly dbService: DbService) {
    this.schemaName = resolveSchemaName(process.env.POSTGRES_READ_SCHEMA ?? "public");
  }

  protected get schema(): string {
    return this.schemaName;
  }

  protected relation(tableName: string): string {
    return `${this.quoteIdentifier(this.schemaName)}.${this.quoteIdentifier(tableName)}`;
  }

  protected buildOptionalLeftJoin(
    tables: Set<string>,
    tableName: string,
    alias: string,
    predicate: string
  ): string {
    if (!tables.has(tableName)) {
      return "";
    }

    return `LEFT JOIN ${this.relation(tableName)} ${alias} ON ${predicate}`;
  }

  protected selectColumnOrNull(
    tables: Set<string>,
    tableName: string,
    alias: string,
    columnName: string,
    outputName: string,
    transform?: (expression: string) => string
  ): string {
    if (!tables.has(tableName)) {
      return `NULL AS ${this.quoteIdentifier(outputName)}`;
    }

    const expression = `${alias}.${this.quoteIdentifier(columnName)}`;
    const selected = transform ? transform(expression) : expression;
    return `${selected} AS ${this.quoteIdentifier(outputName)}`;
  }

  protected async getAvailableTables(): Promise<Set<string>> {
    try {
      const result = await this.dbService.query<{ table_name: string }>(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = $1
        `,
        [this.schemaName]
      );

      return new Set(result.rows.map((row) => row.table_name));
    } catch {
      return new Set();
    }
  }

  protected quoteIdentifier(value: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
      throw new Error(`Invalid PostgreSQL identifier: ${value}`);
    }

    return `"${value}"`;
  }
}

function resolveSchemaName(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "public";
  }

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) {
    throw new Error(`Invalid PostgreSQL schema name: ${value}`);
  }

  return normalized;
}

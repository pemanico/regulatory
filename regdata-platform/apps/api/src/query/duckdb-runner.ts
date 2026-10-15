import { Injectable } from '@nestjs/common';
import { DuckDBInstance } from '@duckdb/node-api';
import type { QueryRunner } from '@regdata/query';

/**
 * Embedded DuckDB (ADR-005). One in-memory instance per process; one connection per query,
 * so concurrent requests do not share a connection. Reads Parquet or CSV files directly.
 */
@Injectable()
export class DuckDbRunner implements QueryRunner {
  private instance?: Promise<DuckDBInstance>;

  async all(sql: string, params: (string | number)[]): Promise<Record<string, unknown>[]> {
    this.instance ??= DuckDBInstance.create(':memory:');
    const connection = await (await this.instance).connect();
    try {
      const reader = await connection.runAndReadAll(sql, params);
      return reader.getRowObjectsJson() as Record<string, unknown>[];
    } finally {
      connection.closeSync();
    }
  }
}

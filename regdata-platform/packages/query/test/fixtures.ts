import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import type { QueryRunner } from '../src';

/**
 * FICTITIOUS breaks data. Identifiers, fields and values are invented.
 * Layout: business_date, uti, proprietary_id, field_in_break, party_1_value, party_2_value,
 * primary_asset_class, pairing_status, reconciliation_status.
 *
 * Traps covered:
 * - one trade with two fields in break on the same day (rows 1-2);
 * - trades identified only by the proprietary id (rows 4-7), one with an empty UTI string (row 7);
 * - one-sided breaks, with NULL (row 2) and with an empty string (row 4);
 * - the same break on two days (rows 1 and 8);
 * - a Saturday row that must be ignored (row 10);
 * - Thursday 2026-01-08 and Friday 2026-01-09 without data.
 */
export const BREAK_ROWS: (string | null)[][] = [
  ['2026-01-05', 'UTI-1', 'P-1', 'FIELD_A', 'X', 'Y', 'CREDIT', 'PARD', 'NREC'],
  ['2026-01-05', 'UTI-1', 'P-1', 'FIELD_B', '1', null, 'CREDIT', 'PARD', 'NREC'],
  ['2026-01-05', 'UTI-2', null, 'FIELD_A', 'X', 'Z', 'RATES', 'PARD', 'NREC'],
  ['2026-01-05', null, 'P-3', 'FIELD_A', 'X', '', 'RATES', 'PARD', 'NREC'],
  ['2026-01-05', null, 'P-3', 'FIELD_C', 'a', 'b', 'RATES', 'PARD', 'NREC'],
  ['2026-01-05', null, 'P-4', 'FIELD_C', 'a', 'c', 'EQUITY', 'PARD', 'NREC'],
  ['2026-01-05', '', 'P-5', 'FIELD_C', 'a', 'd', 'EQUITY', 'PARD', 'NREC'],
  ['2026-01-06', 'UTI-1', 'P-1', 'FIELD_A', 'X', 'Y', 'CREDIT', 'PARD', 'NREC'],
  ['2026-01-07', 'UTI-2', null, 'FIELD_B', '2', '3', 'RATES', 'PARD', 'NREC'],
  ['2026-01-10', 'UTI-9', 'P-9', 'FIELD_A', 'X', 'Y', 'CREDIT', 'PARD', 'NREC'],
];

const LOGICAL_COLUMNS = [
  'business_date',
  'uti',
  'proprietary_id',
  'field_in_break',
  'party_1_value',
  'party_2_value',
  'primary_asset_class',
  'pairing_status',
  'reconciliation_status',
];

function literal(value: string | null): string {
  return value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`;
}

export interface Fixture {
  connection: DuckDBConnection;
  runner: QueryRunner;
  dir: string;
  parquetPath: string;
  csvPath: string;
  close(): void;
}

/** Writes the fictitious rows as Parquet (logical names) and as CSV (other names, dd/mm/yyyy dates). */
export async function createFixture(): Promise<Fixture> {
  const dir = mkdtempSync(join(tmpdir(), 'regdata-query-'));
  const instance = await DuckDBInstance.create();
  const connection = await instance.connect();

  const columns = LOGICAL_COLUMNS.map((name) => (name === 'business_date' ? `${name} DATE` : `${name} VARCHAR`)).join(', ');
  await connection.run(`CREATE TABLE breaks (${columns})`);
  const values = BREAK_ROWS.map((row) => `(${row.map(literal).join(', ')})`).join(',\n');
  await connection.run(`INSERT INTO breaks VALUES ${values}`);

  const parquetPath = join(dir, 'breaks.parquet');
  await connection.run(`COPY breaks TO '${parquetPath}' (FORMAT parquet)`);

  const csvPath = join(dir, 'breaks.csv');
  await connection.run(`
    COPY (
      SELECT strftime(business_date, '%d/%m/%Y') AS BIZ_DATE, uti AS ID_U, proprietary_id AS ID_P,
             field_in_break AS FLD, party_1_value AS V1, party_2_value AS V2,
             primary_asset_class AS AC, pairing_status AS PS, reconciliation_status AS RS
      FROM breaks
    ) TO '${csvPath}' (FORMAT csv, HEADER)`);

  const runner: QueryRunner = {
    async all(sql, params) {
      const reader = await connection.runAndReadAll(sql, params);
      return reader.getRowObjectsJson() as Record<string, unknown>[];
    },
  };

  return {
    connection,
    runner,
    dir,
    parquetPath,
    csvPath,
    close() {
      connection.closeSync();
    },
  };
}

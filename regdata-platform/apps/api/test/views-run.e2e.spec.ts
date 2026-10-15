import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DuckDBInstance } from '@duckdb/node-api';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** FICTITIOUS breaks: two trades, three fields in break, one with an empty counterparty value. */
async function writeParquet(dir: string): Promise<string> {
  const path = join(dir, 'breaks.parquet');
  const instance = await DuckDBInstance.create();
  const connection = await instance.connect();
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        (DATE '2026-01-05', 'UTI-1', 'P-1', 'FIELD_A', 'X', 'Y', 'CREDIT', 'PARD', 'NREC'),
        (DATE '2026-01-05', 'UTI-1', 'P-1', 'FIELD_B', '1', '',  'CREDIT', 'PARD', 'NREC'),
        (DATE '2026-01-06', NULL,    'P-2', 'FIELD_A', 'X', 'Z', 'RATES',  'PARD', 'NREC')
      ) AS t(business_date, uti, proprietary_id, field_in_break, party_1_value, party_2_value,
             primary_asset_class, pairing_status, reconciliation_status)
    ) TO '${path}' (FORMAT parquet)`);
  connection.closeSync();
  return path;
}

const spec = {
  specVersion: 1,
  jurisdiction: 'EMIR',
  martId: 'emir_recon_breaks',
  metrics: ['breaks_count', 'trades_with_breaks', 'one_sided_breaks'],
  rows: ['field_in_break'],
  period: { from: '2026-01-05', to: '2026-01-09' },
};

describe('POST /api/views/run', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'regdata-api-'));
    const parquet = await writeParquet(dir);
    const bindingsFile = join(dir, 'bindings.json');
    writeFileSync(bindingsFile, JSON.stringify({ marts: { emir_recon_breaks: { source: parquet } } }));
    process.env.QUERY_BINDINGS_FILE = bindingsFile;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.QUERY_BINDINGS_FILE;
  });

  it('runs the spec and returns rows, the generated SQL and warnings', async () => {
    const response = await request(app.getHttpServer()).post('/api/views/run').send(spec).expect(200);
    expect(response.body.rows).toEqual([
      { field_in_break: 'FIELD_A', breaks_count: 2, trades_with_breaks: 2, one_sided_breaks: 0 },
      { field_in_break: 'FIELD_B', breaks_count: 1, trades_with_breaks: 1, one_sided_breaks: 1 },
    ]);
    expect(response.body.sql).toContain('read_parquet');
    expect(response.body.businessDates.missingWeekdays).toEqual(['2026-01-07', '2026-01-08', '2026-01-09']);
    expect(response.body.warnings.map((warning: { code: string }) => warning.code)).toEqual(
      expect.arrayContaining(['MISSING_BUSINESS_DATES', 'METRIC_NOT_CERTIFIED']),
    );
  });

  it('lists the mart in the catalog', async () => {
    const response = await request(app.getHttpServer()).get('/api/catalog/marts').expect(200);
    expect(response.body.map((mart: { id: string }) => mart.id)).toContain('emir_recon_breaks');
  });

  it('rejects an invalid spec with the validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/views/run')
      .send({ ...spec, metrics: ['made_up_metric'] })
      .expect(400);
    expect(response.body.errors[0].code).toBe('UNKNOWN_METRIC');
  });

  it('refuses marts without a semantic model', async () => {
    await request(app.getHttpServer())
      .post('/api/views/run')
      .send({
        specVersion: 1,
        jurisdiction: 'EMIR',
        martId: 'example_emir_validation',
        metrics: ['error_count'],
        period: { from: '2026-07-01', to: '2026-07-31' },
      })
      .expect(400);
  });

  it('hides the mart from users without the EMIR jurisdiction', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/views/run')
      .set('x-dev-jurisdictions', 'CFTC')
      .send(spec)
      .expect(400);
    expect(response.body.errors[0].code).toBe('UNKNOWN_MART');
  });
});

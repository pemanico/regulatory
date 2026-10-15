import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ViewSpecSchema, validateViewSpec, type ViewSpecInput } from '@regdata/contracts';
import { EMIR_RECON_BREAKS, MartBindingSchema, runView, toMartDefinition, type MartBinding } from '../src';
import { createFixture, type Fixture } from './fixtures';

const mart = EMIR_RECON_BREAKS;

function spec(overrides: Partial<ViewSpecInput> = {}) {
  return ViewSpecSchema.parse({
    specVersion: 1,
    jurisdiction: 'EMIR',
    martId: mart.id,
    metrics: ['breaks_count', 'trades_with_breaks', 'one_sided_breaks'],
    // Monday 2026-01-05 to Sunday 2026-01-11.
    period: { from: '2026-01-05', to: '2026-01-11' },
    ...overrides,
  });
}

describe('runView on fictitious Parquet', () => {
  let fixture: Fixture;
  let binding: MartBinding;

  beforeAll(async () => {
    fixture = await createFixture();
    binding = MartBindingSchema.parse({ source: fixture.parquetPath });
  });

  afterAll(() => fixture.close());

  it('counts breaks, distinct trades and one-sided breaks, ignoring the Saturday', async () => {
    const result = await runView(spec(), mart, binding, fixture.runner);
    expect(result.rows).toEqual([{ breaks_count: 9, trades_with_breaks: 5, one_sided_breaks: 2 }]);
  });

  it('counts trades by UTI and proprietary id, not rows or UTI alone', async () => {
    const naive = await fixture.runner.all(
      `SELECT CAST(COUNT(*) AS DOUBLE) AS row_count, CAST(COUNT(DISTINCT uti) AS DOUBLE) AS uti_count
       FROM read_parquet('${fixture.parquetPath}') WHERE business_date BETWEEN DATE '2026-01-05' AND DATE '2026-01-09'`,
      [],
    );
    // Hand-written SQL gives 9 rows and 3 UTIs (one of them an empty string); the metric gives 5 trades.
    expect(naive).toEqual([{ row_count: 9, uti_count: 3 }]);
    const result = await runView(spec({ metrics: ['trades_with_breaks'] }), mart, binding, fixture.runner);
    expect(result.rows[0]?.trades_with_breaks).toBe(5);
  });

  it('groups by field in break', async () => {
    const result = await runView(spec({ rows: ['field_in_break'] }), mart, binding, fixture.runner);
    expect(result.rows).toEqual([
      { field_in_break: 'FIELD_A', breaks_count: 4, trades_with_breaks: 3, one_sided_breaks: 1 },
      { field_in_break: 'FIELD_B', breaks_count: 2, trades_with_breaks: 2, one_sided_breaks: 1 },
      { field_in_break: 'FIELD_C', breaks_count: 3, trades_with_breaks: 3, one_sided_breaks: 0 },
    ]);
    expect(result.columns.map((column) => [column.id, column.kind])).toEqual([
      ['field_in_break', 'dimension'],
      ['breaks_count', 'metric'],
      ['trades_with_breaks', 'metric'],
      ['one_sided_breaks', 'metric'],
    ]);
  });

  it('groups by business date and reports weekdays without data', async () => {
    const result = await runView(spec({ rows: ['business_date'], metrics: ['breaks_count'] }), mart, binding, fixture.runner);
    expect(result.rows).toEqual([
      { business_date: '2026-01-05', breaks_count: 7 },
      { business_date: '2026-01-06', breaks_count: 1 },
      { business_date: '2026-01-07', breaks_count: 1 },
    ]);
    expect(result.businessDates.requestedWeekdays).toBe(5);
    expect(result.businessDates.missingWeekdays).toEqual(['2026-01-08', '2026-01-09']);
    expect(result.warnings.map((warning) => warning.code)).toContain('MISSING_BUSINESS_DATES');
  });

  it('applies filters with parameters', async () => {
    const only = await runView(
      spec({ metrics: ['breaks_count'], filters: [{ dimension: 'field_in_break', operator: 'in', values: ['FIELD_A'] }] }),
      mart,
      binding,
      fixture.runner,
    );
    expect(only.rows[0]?.breaks_count).toBe(4);
    expect(only.params).toContain('FIELD_A');
    expect(only.sql).not.toContain('FIELD_A');

    const others = await runView(
      spec({ metrics: ['breaks_count'], filters: [{ dimension: 'field_in_break', operator: 'neq', values: ['FIELD_A'] }] }),
      mart,
      binding,
      fixture.runner,
    );
    expect(others.rows[0]?.breaks_count).toBe(5);

    const rates = await runView(
      spec({ metrics: ['breaks_count'], filters: [{ dimension: 'primary_asset_class', operator: 'eq', values: ['RATES'] }] }),
      mart,
      binding,
      fixture.runner,
    );
    expect(rates.rows[0]?.breaks_count).toBe(4);
  });

  it('cuts results above the row limit and says so', async () => {
    const result = await runView(spec({ rows: ['field_in_break'], metrics: ['breaks_count'] }), mart, binding, fixture.runner, {
      maxRows: 2,
    });
    expect(result.rows).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toContain('TRUNCATED');
  });

  it('flags draft metrics as not certified', async () => {
    const result = await runView(spec({ metrics: ['breaks_count'] }), mart, binding, fixture.runner);
    expect(result.warnings.map((warning) => warning.code)).toContain('METRIC_NOT_CERTIFIED');
  });

  it('reads CSV with other column names and dd/mm/yyyy dates through the bindings', async () => {
    const csvBinding = MartBindingSchema.parse({
      format: 'csv',
      source: fixture.csvPath,
      columns: {
        business_date: { column: 'BIZ_DATE', dateFormat: '%d/%m/%Y' },
        uti: 'ID_U',
        proprietary_id: 'ID_P',
        field_in_break: 'FLD',
        party_1_value: 'V1',
        party_2_value: 'V2',
        primary_asset_class: 'AC',
        pairing_status: 'PS',
        reconciliation_status: 'RS',
      },
    });
    const result = await runView(spec(), mart, csvBinding, fixture.runner);
    expect(result.rows).toEqual([{ breaks_count: 9, trades_with_breaks: 5, one_sided_breaks: 2 }]);
  });

  it('is a valid catalog entry for the spec validator', () => {
    const validation = validateViewSpec(spec({ rows: ['field_in_break'] }), [toMartDefinition(mart)]);
    expect(validation.valid).toBe(true);
  });
});

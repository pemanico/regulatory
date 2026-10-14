import { describe, expect, it } from 'vitest';
import { validateViewSpec, type MartDefinition, type ViewSpecInput } from '../src';

// Fictitious catalog, for tests only.
const catalog: MartDefinition[] = [
  {
    id: 'test_emir_mart',
    jurisdiction: 'EMIR',
    label: 'EMIR test mart',
    businessNeed: 'Test',
    grain: 'row',
    partitionKey: 'business_date',
    owner: 'tests',
    maxPeriodDays: 400,
    dimensions: [
      { id: 'business_date', label: 'Business date', type: 'date' },
      { id: 'source_system', label: 'Source system', type: 'string' },
      { id: 'error_category', label: 'Error category', type: 'string' },
      { id: 'notional_bucket', label: 'Notional bucket', type: 'number' },
    ],
    metrics: [
      { id: 'error_count', label: 'Errors', description: 'x', status: 'certified', additive: true, version: '1.0' },
      { id: 'error_rate', label: 'Error rate', description: 'x', status: 'draft', additive: false, version: '0.1' },
      { id: 'old_metric', label: 'Old', description: 'x', status: 'deprecated', additive: true, version: '1.0' },
    ],
  },
];

const baseSpec: ViewSpecInput = {
  specVersion: 1,
  jurisdiction: 'EMIR',
  martId: 'test_emir_mart',
  metrics: ['error_count'],
  rows: ['error_category'],
  columns: ['source_system'],
  period: { from: '2026-07-01', to: '2026-09-30' },
};

const codes = (result: ReturnType<typeof validateViewSpec>) => (result.valid ? [] : result.errors.map((e) => e.code));

describe('validateViewSpec', () => {
  it('accepts a valid spec and applies defaults', () => {
    const result = validateViewSpec(baseSpec, catalog);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.spec.filters).toEqual([]);
      expect(result.warnings).toEqual([]);
    }
  });

  it('rejects unknown fields (strict spec)', () => {
    const result = validateViewSpec({ ...baseSpec, sql: 'select 1' }, catalog);
    expect(codes(result)).toContain('SCHEMA');
  });

  it('rejects an empty metric list and non-existent dates', () => {
    const result = validateViewSpec({ ...baseSpec, metrics: [], period: { from: '2026-02-30', to: '2026-03-01' } }, catalog);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('metrics');
      expect(paths).toContain('period.from');
    }
  });

  it('rejects an inverted period', () => {
    const result = validateViewSpec({ ...baseSpec, period: { from: '2026-09-30', to: '2026-07-01' } }, catalog);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0]?.path).toBe('period.to');
  });

  it('rejects the same dimension in rows and columns', () => {
    const result = validateViewSpec({ ...baseSpec, columns: ['error_category'] }, catalog);
    expect(codes(result)).toEqual(['SCHEMA']);
  });

  it('rejects an unknown or hidden mart', () => {
    expect(codes(validateViewSpec({ ...baseSpec, martId: 'other_mart' }, catalog))).toEqual(['UNKNOWN_MART']);
    expect(codes(validateViewSpec(baseSpec, []))).toEqual(['UNKNOWN_MART']);
  });

  it('rejects a jurisdiction different from the mart', () => {
    expect(codes(validateViewSpec({ ...baseSpec, jurisdiction: 'CFTC' }, catalog))).toEqual(['JURISDICTION_MISMATCH']);
  });

  it('rejects non-existent metrics and dimensions', () => {
    const result = validateViewSpec({ ...baseSpec, metrics: ['nope'], rows: ['nope_dim'] }, catalog);
    expect(codes(result)).toEqual(['UNKNOWN_METRIC', 'UNKNOWN_DIMENSION']);
  });

  it('rejects deprecated metrics and warns about uncertified metrics', () => {
    expect(codes(validateViewSpec({ ...baseSpec, metrics: ['old_metric'] }, catalog))).toEqual(['METRIC_DEPRECATED']);
    const draft = validateViewSpec({ ...baseSpec, metrics: ['error_rate'] }, catalog);
    expect(draft.valid).toBe(true);
    expect(draft.warnings.map((w) => w.code)).toEqual(['METRIC_NOT_CERTIFIED']);
  });

  it('validates filter arity and value types', () => {
    expect(
      codes(validateViewSpec({ ...baseSpec, filters: [{ dimension: 'source_system', operator: 'between', values: ['A'] }] }, catalog)),
    ).toEqual(['SCHEMA']);
    expect(
      codes(validateViewSpec({ ...baseSpec, filters: [{ dimension: 'notional_bucket', operator: 'gte', values: ['10'] }] }, catalog)),
    ).toEqual(['FILTER_VALUE_TYPE']);
    expect(
      validateViewSpec({ ...baseSpec, filters: [{ dimension: 'business_date', operator: 'gte', values: ['2026-08-01'] }] }, catalog).valid,
    ).toBe(true);
  });

  it('rejects periods above the mart maximum', () => {
    const result = validateViewSpec({ ...baseSpec, period: { from: '2025-01-01', to: '2026-09-30' } }, catalog);
    expect(codes(result)).toEqual(['PERIOD_TOO_LONG']);
  });
});

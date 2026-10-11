import { describe, expect, it } from 'vitest';
import { validateViewSpec, type MartDefinition, type ViewSpecInput } from '../src';

// Catálogo fictício só para testes.
const catalog: MartDefinition[] = [
  {
    id: 'test_emir_mart',
    jurisdiction: 'EMIR',
    label: 'Mart de teste EMIR',
    businessNeed: 'Teste',
    grain: 'row',
    partitionKey: 'business_date',
    owner: 'tests',
    maxPeriodDays: 400,
    dimensions: [
      { id: 'business_date', label: 'Business date', type: 'date' },
      { id: 'source_system', label: 'Sistema de origem', type: 'string' },
      { id: 'error_category', label: 'Categoria de erro', type: 'string' },
      { id: 'notional_bucket', label: 'Bucket de notional', type: 'number' },
    ],
    metrics: [
      { id: 'error_count', label: 'Erros', description: 'x', status: 'certified', additive: true, version: '1.0' },
      { id: 'error_rate', label: 'Taxa de erro', description: 'x', status: 'draft', additive: false, version: '0.1' },
      { id: 'old_metric', label: 'Antiga', description: 'x', status: 'deprecated', additive: true, version: '1.0' },
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
  it('aceita uma spec válida e aplica defaults', () => {
    const result = validateViewSpec(baseSpec, catalog);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.spec.filters).toEqual([]);
      expect(result.warnings).toEqual([]);
    }
  });

  it('rejeita campos desconhecidos (spec strict)', () => {
    const result = validateViewSpec({ ...baseSpec, sql: 'select 1' }, catalog);
    expect(codes(result)).toContain('SCHEMA');
  });

  it('rejeita lista de métricas vazia e datas inexistentes', () => {
    const result = validateViewSpec({ ...baseSpec, metrics: [], period: { from: '2026-02-30', to: '2026-03-01' } }, catalog);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      const paths = result.errors.map((e) => e.path);
      expect(paths).toContain('metrics');
      expect(paths).toContain('period.from');
    }
  });

  it('rejeita período invertido', () => {
    const result = validateViewSpec({ ...baseSpec, period: { from: '2026-09-30', to: '2026-07-01' } }, catalog);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0]?.path).toBe('period.to');
  });

  it('rejeita a mesma dimensão em linhas e colunas', () => {
    const result = validateViewSpec({ ...baseSpec, columns: ['error_category'] }, catalog);
    expect(codes(result)).toEqual(['SCHEMA']);
  });

  it('rejeita mart desconhecido ou não visível', () => {
    expect(codes(validateViewSpec({ ...baseSpec, martId: 'other_mart' }, catalog))).toEqual(['UNKNOWN_MART']);
    expect(codes(validateViewSpec(baseSpec, []))).toEqual(['UNKNOWN_MART']);
  });

  it('rejeita jurisdição diferente da do mart', () => {
    expect(codes(validateViewSpec({ ...baseSpec, jurisdiction: 'CFTC' }, catalog))).toEqual(['JURISDICTION_MISMATCH']);
  });

  it('rejeita métricas e dimensões inexistentes', () => {
    const result = validateViewSpec({ ...baseSpec, metrics: ['nope'], rows: ['nope_dim'] }, catalog);
    expect(codes(result)).toEqual(['UNKNOWN_METRIC', 'UNKNOWN_DIMENSION']);
  });

  it('rejeita métricas descontinuadas e avisa sobre métricas não certificadas', () => {
    expect(codes(validateViewSpec({ ...baseSpec, metrics: ['old_metric'] }, catalog))).toEqual(['METRIC_DEPRECATED']);
    const draft = validateViewSpec({ ...baseSpec, metrics: ['error_rate'] }, catalog);
    expect(draft.valid).toBe(true);
    expect(draft.warnings.map((w) => w.code)).toEqual(['METRIC_NOT_CERTIFIED']);
  });

  it('valida aridade e tipo dos filtros', () => {
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

  it('rejeita períodos acima do máximo do mart', () => {
    const result = validateViewSpec({ ...baseSpec, period: { from: '2025-01-01', to: '2026-09-30' } }, catalog);
    expect(codes(result)).toEqual(['PERIOD_TOO_LONG']);
  });
});

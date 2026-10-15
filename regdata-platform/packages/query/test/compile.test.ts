import { describe, expect, it } from 'vitest';
import { ViewSpecSchema } from '@regdata/contracts';
import { CompileError, EMIR_RECON_BREAKS, MartBindingSchema, compileView, parseBindings, weekdaysBetween } from '../src';

const baseSpec = {
  specVersion: 1 as const,
  jurisdiction: 'EMIR' as const,
  martId: EMIR_RECON_BREAKS.id,
  metrics: ['breaks_count'],
  period: { from: '2026-01-05', to: '2026-01-09' },
};

describe('compileView', () => {
  it('escapes the source path and maps logical to physical columns', () => {
    const binding = MartBindingSchema.parse({
      source: "/data/o'neil/*.parquet",
      columns: { field_in_break: 'FIELD "X"' },
    });
    const compiled = compileView(ViewSpecSchema.parse({ ...baseSpec, rows: ['field_in_break'] }), EMIR_RECON_BREAKS, binding);
    expect(compiled.data.sql).toContain("read_parquet('/data/o''neil/*.parquet'");
    expect(compiled.data.sql).toContain('NULLIF(TRIM(CAST("FIELD ""X""" AS VARCHAR)), \'\') AS "field_in_break"');
    expect(compiled.data.params).toEqual(['2026-01-05', '2026-01-09']);
  });

  it('keeps user values out of the SQL text', () => {
    const compiled = compileView(
      ViewSpecSchema.parse({
        ...baseSpec,
        filters: [{ dimension: 'field_in_break', operator: 'eq', values: ["x'; DROP TABLE t; --"] }],
      }),
      EMIR_RECON_BREAKS,
      MartBindingSchema.parse({ source: '/data/breaks.parquet' }),
    );
    expect(compiled.data.sql).not.toContain('DROP TABLE');
    expect(compiled.data.params).toContain("x'; DROP TABLE t; --");
  });

  it('reads only the columns the query needs', () => {
    const compiled = compileView(ViewSpecSchema.parse(baseSpec), EMIR_RECON_BREAKS, MartBindingSchema.parse({ source: '/d.parquet' }));
    expect(compiled.data.sql).toContain('AS "business_date"');
    expect(compiled.data.sql).not.toContain('AS "uti"');
  });

  it('rejects metrics and dimensions outside the model', () => {
    const binding = MartBindingSchema.parse({ source: '/d.parquet' });
    expect(() => compileView(ViewSpecSchema.parse({ ...baseSpec, metrics: ['made_up'] }), EMIR_RECON_BREAKS, binding)).toThrow(CompileError);
    expect(() => compileView(ViewSpecSchema.parse({ ...baseSpec, rows: ['uti'] }), EMIR_RECON_BREAKS, binding)).toThrow(CompileError);
  });
});

describe('bindings and calendar', () => {
  it('parses a bindings file and reports errors with their path', () => {
    const parsed = parseBindings({ marts: { emir_recon_breaks: { source: '/d.parquet' } } });
    expect(parsed.marts.emir_recon_breaks?.format).toBe('parquet');
    expect(() => parseBindings({ marts: { emir_recon_breaks: { format: 'xlsx', source: '/d' } } })).toThrow(/marts\.emir_recon_breaks\.format/);
  });

  it('lists Monday to Friday only', () => {
    expect(weekdaysBetween('2026-01-09', '2026-01-12')).toEqual(['2026-01-09', '2026-01-12']);
  });
});

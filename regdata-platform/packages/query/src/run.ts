import type { ResultCell, ViewResult, ViewResultWarning, ViewSpec } from '@regdata/contracts';
import type { MartBinding } from './binding';
import { weekdaysBetween } from './calendar';
import { compileView } from './compile';
import type { SemanticMart } from './model';

/** Executes SQL with positional parameters and returns rows as plain JSON objects. */
export interface QueryRunner {
  all(sql: string, params: (string | number)[]): Promise<Record<string, unknown>[]>;
}

function toCell(value: unknown): ResultCell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (typeof value === 'bigint') return Number(value);
  return String(value);
}

/** Compiles and runs a validated spec; adds the business-date completeness check. */
export async function runView(
  spec: ViewSpec,
  mart: SemanticMart,
  binding: MartBinding,
  runner: QueryRunner,
  options: { maxRows?: number } = {},
): Promise<ViewResult> {
  const compiled = compileView(spec, mart, binding, options);
  const [rawRows, rawDates] = await Promise.all([
    runner.all(compiled.data.sql, compiled.data.params),
    runner.all(compiled.dates.sql, compiled.dates.params),
  ]);

  const truncated = rawRows.length > compiled.maxRows;
  const rows = rawRows.slice(0, compiled.maxRows).map((raw) => {
    const row: Record<string, ResultCell> = {};
    for (const column of compiled.columns) row[column.id] = toCell(raw[column.id]);
    return row;
  });

  const withData = rawDates.map((raw) => String(raw[mart.partitionKey]));
  const present = new Set(withData);
  const weekdays = weekdaysBetween(spec.period.from, spec.period.to);
  const missingWeekdays = weekdays.filter((date) => !present.has(date));

  const warnings: ViewResultWarning[] = [];
  if (missingWeekdays.length > 0) {
    warnings.push({
      code: 'MISSING_BUSINESS_DATES',
      message: `No data for ${missingWeekdays.length} business day(s) in the period (${missingWeekdays.slice(0, 5).join(', ')}${
        missingWeekdays.length > 5 ? ', ...' : ''
      }). The mart may not have been processed for these dates; zero breaks there is not a confirmed result.`,
    });
  }
  if (truncated) {
    warnings.push({
      code: 'TRUNCATED',
      message: `The result has more than ${compiled.maxRows} rows and was cut. Add filters or fewer dimensions.`,
    });
  }
  for (const metricId of spec.metrics) {
    const metric = mart.metrics.find((candidate) => candidate.id === metricId);
    if (metric && metric.status !== 'certified') {
      warnings.push({
        code: 'METRIC_NOT_CERTIFIED',
        message: `Metric ${metric.id} (v${metric.version}) is a draft definition, not yet certified.`,
      });
    }
  }

  return {
    martId: mart.id,
    columns: compiled.columns,
    rows,
    truncated,
    sql: compiled.data.sql,
    params: compiled.data.params,
    businessDates: { requestedWeekdays: weekdays.length, withData, missingWeekdays },
    warnings,
  };
}

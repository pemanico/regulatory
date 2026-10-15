import type { Filter, ResultColumn, ViewSpec } from '@regdata/contracts';
import type { ColumnBinding, MartBinding } from './binding';
import { findColumn, findMetric, type SemanticColumn, type SemanticMart } from './model';

/**
 * Deterministic compiler: validated view spec -> DuckDB SQL with positional parameters.
 * The LLM never writes SQL on this path. User values only reach the SQL as parameters;
 * identifiers come from the semantic model and the local bindings file.
 */

export const DEFAULT_MAX_ROWS = 5000;

export interface CompiledQuery {
  sql: string;
  params: (string | number)[];
}

export interface CompiledView {
  /** Aggregated result: one row per combination of dimensions. */
  data: CompiledQuery;
  /** Distinct business dates with data in the period (completeness check). */
  dates: CompiledQuery;
  columns: ResultColumn[];
  maxRows: number;
}

export class CompileError extends Error {}

export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sourceRelation(binding: MartBinding): string {
  const source = quoteLiteral(binding.source);
  if (binding.format === 'csv') {
    const delimiter = binding.csvDelimiter ? `, delim = ${quoteLiteral(binding.csvDelimiter)}` : '';
    return `read_csv(${source}, header = true, all_varchar = true, union_by_name = true${delimiter})`;
  }
  return `read_parquet(${source}, hive_partitioning = true, union_by_name = true)`;
}

/** Typed expression reading one logical column from the physical source. */
function columnExpression(column: SemanticColumn, binding: MartBinding): string {
  const bound: ColumnBinding = binding.columns[column.id] ?? column.id;
  const physical = quoteIdentifier(typeof bound === 'string' ? bound : bound.column);
  const dateFormat = typeof bound === 'string' ? undefined : bound.dateFormat;

  switch (column.type) {
    case 'date':
      return dateFormat
        ? `CAST(strptime(CAST(${physical} AS VARCHAR), ${quoteLiteral(dateFormat)}) AS DATE)`
        : `CAST(${physical} AS DATE)`;
    case 'number':
      return `CAST(${physical} AS DOUBLE)`;
    case 'string':
      // Empty and blank strings become NULL, so "" and NULL are the same missing value.
      return `NULLIF(TRIM(CAST(${physical} AS VARCHAR)), '')`;
  }
}

function sourceCte(mart: SemanticMart, binding: MartBinding, columnIds: Iterable<string>): string {
  const selected = [...new Set(columnIds)].map((id) => {
    const column = findColumn(mart, id);
    if (!column) throw new CompileError(`Column ${id} does not exist in mart ${mart.id}`);
    return `    ${columnExpression(column, binding)} AS ${quoteIdentifier(column.id)}`;
  });
  return `src AS (\n  SELECT\n${selected.join(',\n')}\n  FROM ${sourceRelation(binding)}\n)`;
}

class Params {
  readonly values: (string | number)[] = [];

  add(value: string | number, type: SemanticColumn['type']): string {
    this.values.push(type === 'number' ? Number(value) : String(value));
    const placeholder = `$${this.values.length}`;
    if (type === 'date') return `CAST(${placeholder} AS DATE)`;
    if (type === 'number') return `CAST(${placeholder} AS DOUBLE)`;
    return placeholder;
  }
}

function filterCondition(filter: Filter, column: SemanticColumn, params: Params): string {
  const target = quoteIdentifier(column.id);
  const values = filter.values.map((value) => params.add(value, column.type));
  switch (filter.operator) {
    case 'eq':
      return `${target} = ${values[0]}`;
    case 'neq':
      // Rows without a value are kept: "not X" includes blanks.
      return `${target} IS DISTINCT FROM ${values[0]}`;
    case 'in':
      return `${target} IN (${values.join(', ')})`;
    case 'not_in':
      return `(${target} IS NULL OR ${target} NOT IN (${values.join(', ')}))`;
    case 'gte':
      return `${target} >= ${values[0]}`;
    case 'lte':
      return `${target} <= ${values[0]}`;
    case 'between':
      return `${target} BETWEEN ${values[0]} AND ${values[1]}`;
  }
}

function outputExpression(column: SemanticColumn): string {
  const name = quoteIdentifier(column.id);
  return column.type === 'date' ? `strftime(${name}, '%Y-%m-%d')` : name;
}

export function compileView(
  spec: ViewSpec,
  mart: SemanticMart,
  binding: MartBinding,
  options: { maxRows?: number } = {},
): CompiledView {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const dateColumn = findColumn(mart, mart.partitionKey);
  if (!dateColumn || dateColumn.type !== 'date') {
    throw new CompileError(`Mart ${mart.id} has no date partition column`);
  }

  const dimensions = [...spec.rows, ...spec.columns].map((id) => {
    const column = findColumn(mart, id);
    if (!column?.dimension) throw new CompileError(`Dimension ${id} does not exist in mart ${mart.id}`);
    return column;
  });
  const metrics = spec.metrics.map((id) => {
    const metric = findMetric(mart, id);
    if (!metric) throw new CompileError(`Metric ${id} does not exist in mart ${mart.id}`);
    return metric;
  });
  const filters = spec.filters.map((filter) => {
    const column = findColumn(mart, filter.dimension);
    if (!column?.dimension) throw new CompileError(`Dimension ${filter.dimension} does not exist in mart ${mart.id}`);
    return { filter, column };
  });

  const used = [
    dateColumn.id,
    ...dimensions.map((column) => column.id),
    ...filters.map(({ column }) => column.id),
    ...metrics.flatMap((metric) => metric.uses),
  ];

  const params = new Params();
  const date = quoteIdentifier(dateColumn.id);
  const conditions = [
    `${date} BETWEEN ${params.add(spec.period.from, 'date')} AND ${params.add(spec.period.to, 'date')}`,
    // Business days are Monday to Friday (ISO day of week 1-5).
    `isodow(${date}) <= 5`,
    ...filters.map(({ filter, column }) => filterCondition(filter, column, params)),
  ];

  const selectList = [
    ...dimensions.map((column) => `  ${outputExpression(column)} AS ${quoteIdentifier(column.id)}`),
    ...metrics.map((metric) => `  CAST(${metric.expression} AS DOUBLE) AS ${quoteIdentifier(metric.id)}`),
  ];
  const dimensionNames = dimensions.map((column) => quoteIdentifier(column.id));
  const grouping = dimensionNames.length > 0 ? `\nGROUP BY ${dimensionNames.join(', ')}\nORDER BY ${dimensionNames.join(', ')}` : '';

  const dataSql = [
    `WITH ${sourceCte(mart, binding, used)}`,
    `SELECT\n${selectList.join(',\n')}`,
    'FROM src',
    `WHERE ${conditions.join('\n  AND ')}${grouping}`,
    `LIMIT ${maxRows + 1}`,
  ].join('\n');

  const dateParams = new Params();
  const datesSql = [
    `WITH ${sourceCte(mart, binding, [dateColumn.id])}`,
    `SELECT DISTINCT strftime(${date}, '%Y-%m-%d') AS ${date}`,
    'FROM src',
    `WHERE ${date} BETWEEN ${dateParams.add(spec.period.from, 'date')} AND ${dateParams.add(spec.period.to, 'date')}`,
    `ORDER BY 1`,
  ].join('\n');

  const columns: ResultColumn[] = [
    ...dimensions.map((column) => ({ id: column.id, label: column.label, kind: 'dimension' as const, type: column.type })),
    ...metrics.map((metric) => ({ id: metric.id, label: metric.label, kind: 'metric' as const, type: 'number' as const })),
  ];

  return {
    data: { sql: dataSql, params: params.values },
    dates: { sql: datesSql, params: dateParams.values },
    columns,
    maxRows,
  };
}

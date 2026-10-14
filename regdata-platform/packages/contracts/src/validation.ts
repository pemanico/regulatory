import type { MartDefinition } from './catalog';
import { daysInclusive, isRealDate } from './common';
import { ViewSpecSchema, type ViewSpec } from './view-spec';

/**
 * Validates a view spec in two phases:
 * 1. structure (Zod schema);
 * 2. semantics, against the mart catalog visible to the user.
 *
 * Runs in the frontend (immediate feedback) and in the backend (authoritative decision).
 */

export type ValidationCode =
  | 'SCHEMA'
  | 'UNKNOWN_MART'
  | 'JURISDICTION_MISMATCH'
  | 'UNKNOWN_METRIC'
  | 'METRIC_DEPRECATED'
  | 'METRIC_NOT_CERTIFIED'
  | 'UNKNOWN_DIMENSION'
  | 'FILTER_VALUE_TYPE'
  | 'PERIOD_TOO_LONG';

export interface ValidationIssue {
  code: ValidationCode;
  /** Path in the spec JSON, e.g. "metrics[1]" or "period.to". */
  path: string;
  message: string;
}

export type ViewSpecValidationResult =
  | { valid: true; spec: ViewSpec; warnings: ValidationIssue[] }
  | { valid: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

export function validateViewSpec(
  input: unknown,
  catalog: readonly MartDefinition[],
): ViewSpecValidationResult {
  const parsed = ViewSpecSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      warnings: [],
      errors: parsed.error.issues.map((issue) => ({
        code: 'SCHEMA',
        path: formatPath(issue.path),
        message: issue.message,
      })),
    };
  }

  const spec = parsed.data;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const mart = catalog.find((candidate) => candidate.id === spec.martId);
  if (!mart) {
    // Does not distinguish "does not exist" from "no permission", so marts are not revealed.
    errors.push({ code: 'UNKNOWN_MART', path: 'martId', message: `Unknown data mart: ${spec.martId}` });
    return { valid: false, errors, warnings };
  }

  if (mart.jurisdiction !== spec.jurisdiction) {
    errors.push({
      code: 'JURISDICTION_MISMATCH',
      path: 'jurisdiction',
      message: `Mart ${mart.id} belongs to ${mart.jurisdiction}, not to ${spec.jurisdiction}`,
    });
  }

  spec.metrics.forEach((metricId, index) => {
    const metric = mart.metrics.find((candidate) => candidate.id === metricId);
    const path = `metrics[${index}]`;
    if (!metric) {
      errors.push({ code: 'UNKNOWN_METRIC', path, message: `Metric ${metricId} does not exist in mart ${mart.id}` });
    } else if (metric.status === 'deprecated') {
      errors.push({ code: 'METRIC_DEPRECATED', path, message: `Metric ${metricId} is deprecated` });
    } else if (metric.status === 'draft') {
      warnings.push({
        code: 'METRIC_NOT_CERTIFIED',
        path,
        message: `Metric ${metricId} is not certified yet: exploratory result`,
      });
    }
  });

  const dimensions = new Map(mart.dimensions.map((dimension) => [dimension.id, dimension]));
  const checkDimension = (dimensionId: string, path: string): void => {
    if (!dimensions.has(dimensionId)) {
      errors.push({ code: 'UNKNOWN_DIMENSION', path, message: `Dimension ${dimensionId} does not exist in mart ${mart.id}` });
    }
  };
  spec.rows.forEach((id, index) => checkDimension(id, `rows[${index}]`));
  spec.columns.forEach((id, index) => checkDimension(id, `columns[${index}]`));

  spec.filters.forEach((filter, index) => {
    const path = `filters[${index}]`;
    const dimension = dimensions.get(filter.dimension);
    if (!dimension) {
      checkDimension(filter.dimension, `${path}.dimension`);
      return;
    }
    filter.values.forEach((value, valueIndex) => {
      const valuePath = `${path}.values[${valueIndex}]`;
      const ok =
        dimension.type === 'number'
          ? typeof value === 'number'
          : dimension.type === 'date'
            ? typeof value === 'string' && isRealDate(value)
            : typeof value === 'string';
      if (!ok) {
        errors.push({
          code: 'FILTER_VALUE_TYPE',
          path: valuePath,
          message: `Value ${JSON.stringify(value)} is not compatible with dimension ${dimension.id} (${dimension.type})`,
        });
      }
    });
  });

  const days = daysInclusive(spec.period.from, spec.period.to);
  if (days > mart.maxPeriodDays) {
    errors.push({
      code: 'PERIOD_TOO_LONG',
      path: 'period',
      message: `Period of ${days} days exceeds the maximum of ${mart.maxPeriodDays} days for mart ${mart.id}`,
    });
  }

  return errors.length > 0 ? { valid: false, errors, warnings } : { valid: true, spec, warnings };
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`;
    const key = String(segment);
    return acc ? `${acc}.${key}` : key;
  }, '');
}

import type { MartDefinition } from './catalog';
import { daysInclusive, isRealDate } from './common';
import { ViewSpecSchema, type ViewSpec } from './view-spec';

/**
 * Validação de uma spec de vista em duas fases:
 * 1. estrutura (schema Zod);
 * 2. semântica, contra o catálogo de marts visível para o utilizador.
 *
 * Corre no frontend (feedback imediato) e no backend (decisão oficial).
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
  /** Caminho no JSON da spec, por exemplo "metrics[1]" ou "period.to". */
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
    // Não distingue "não existe" de "sem permissão", para não revelar marts.
    errors.push({ code: 'UNKNOWN_MART', path: 'martId', message: `Data mart desconhecido: ${spec.martId}` });
    return { valid: false, errors, warnings };
  }

  if (mart.jurisdiction !== spec.jurisdiction) {
    errors.push({
      code: 'JURISDICTION_MISMATCH',
      path: 'jurisdiction',
      message: `O mart ${mart.id} pertence a ${mart.jurisdiction}, não a ${spec.jurisdiction}`,
    });
  }

  spec.metrics.forEach((metricId, index) => {
    const metric = mart.metrics.find((candidate) => candidate.id === metricId);
    const path = `metrics[${index}]`;
    if (!metric) {
      errors.push({ code: 'UNKNOWN_METRIC', path, message: `Métrica ${metricId} não existe no mart ${mart.id}` });
    } else if (metric.status === 'deprecated') {
      errors.push({ code: 'METRIC_DEPRECATED', path, message: `Métrica ${metricId} está descontinuada` });
    } else if (metric.status === 'draft') {
      warnings.push({
        code: 'METRIC_NOT_CERTIFIED',
        path,
        message: `Métrica ${metricId} ainda não está certificada: resultado exploratório`,
      });
    }
  });

  const dimensions = new Map(mart.dimensions.map((dimension) => [dimension.id, dimension]));
  const checkDimension = (dimensionId: string, path: string): void => {
    if (!dimensions.has(dimensionId)) {
      errors.push({ code: 'UNKNOWN_DIMENSION', path, message: `Dimensão ${dimensionId} não existe no mart ${mart.id}` });
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
          message: `Valor ${JSON.stringify(value)} incompatível com a dimensão ${dimension.id} (${dimension.type})`,
        });
      }
    });
  });

  const days = daysInclusive(spec.period.from, spec.period.to);
  if (days > mart.maxPeriodDays) {
    errors.push({
      code: 'PERIOD_TOO_LONG',
      path: 'period',
      message: `Período de ${days} dias excede o máximo de ${mart.maxPeriodDays} dias para o mart ${mart.id}`,
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

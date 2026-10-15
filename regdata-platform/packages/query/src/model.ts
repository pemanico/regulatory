import type { DimensionType, Jurisdiction, MartDefinition, MetricStatus } from '@regdata/contracts';

/**
 * Semantic model of a data mart: logical columns and metrics defined once in code.
 * Logical names are used everywhere in the application; the mapping to the real
 * physical columns lives in a local bindings file (see binding.ts), outside Git.
 */

export interface SemanticColumn {
  /** Logical name, snake_case. Also the SQL alias inside the compiled query. */
  id: string;
  type: DimensionType;
  label: string;
  description: string;
  /** True when users can group and filter by this column. */
  dimension: boolean;
}

export interface SemanticMetric {
  id: string;
  label: string;
  description: string;
  status: MetricStatus;
  additive: boolean;
  version: string;
  /** Aggregate SQL expression over logical column names. */
  expression: string;
  /** Logical columns the expression reads. */
  uses: string[];
}

export interface SemanticMart {
  id: string;
  jurisdiction: Jurisdiction;
  label: string;
  businessNeed: string;
  owner: string;
  /** Logical date column used for the period and the business-day calendar. */
  partitionKey: string;
  maxPeriodDays: number;
  columns: SemanticColumn[];
  metrics: SemanticMetric[];
}

/** Catalog entry derived from the semantic model, so both never diverge. */
export function toMartDefinition(mart: SemanticMart): MartDefinition {
  return {
    id: mart.id,
    jurisdiction: mart.jurisdiction,
    label: mart.label,
    businessNeed: mart.businessNeed,
    grain: 'row',
    partitionKey: mart.partitionKey,
    owner: mart.owner,
    maxPeriodDays: mart.maxPeriodDays,
    dimensions: mart.columns
      .filter((column) => column.dimension)
      .map((column) => ({ id: column.id, label: column.label, type: column.type })),
    metrics: mart.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      description: metric.description,
      status: metric.status,
      additive: metric.additive,
      version: metric.version,
    })),
  };
}

export function findColumn(mart: SemanticMart, id: string): SemanticColumn | undefined {
  return mart.columns.find((column) => column.id === id);
}

export function findMetric(mart: SemanticMart, id: string): SemanticMetric | undefined {
  return mart.metrics.find((metric) => metric.id === id);
}

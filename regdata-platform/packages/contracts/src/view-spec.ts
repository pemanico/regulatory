import { z } from 'zod';
import { IdentifierSchema, IsoDateSchema, JurisdictionSchema } from './common';

/**
 * Specification of a pivot view (section 8 of the Architecture Design).
 * Produced by the Metrics agent from natural language and edited by the
 * pivot with clicks. Never contains SQL.
 */

export const FilterOperatorSchema = z.enum(['eq', 'neq', 'in', 'not_in', 'gte', 'lte', 'between']);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

const SINGLE_VALUE_OPERATORS: readonly FilterOperator[] = ['eq', 'neq', 'gte', 'lte'];

export const FilterValueSchema = z.union([z.string().max(256), z.number().finite()]);

export const FilterSchema = z
  .object({
    dimension: IdentifierSchema,
    operator: FilterOperatorSchema,
    values: z.array(FilterValueSchema).min(1).max(500),
  })
  .strict()
  .superRefine((filter, ctx) => {
    if (SINGLE_VALUE_OPERATORS.includes(filter.operator) && filter.values.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['values'],
        message: `Operator ${filter.operator} requires exactly 1 value`,
      });
    }
    if (filter.operator === 'between' && filter.values.length !== 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['values'],
        message: 'Operator between requires exactly 2 values',
      });
    }
  });
export type Filter = z.infer<typeof FilterSchema>;

export const PeriodSchema = z
  .object({
    from: IsoDateSchema,
    to: IsoDateSchema,
  })
  .strict()
  .refine((period) => period.from <= period.to, {
    message: 'The end date must be equal to or after the start date',
    path: ['to'],
  });
export type Period = z.infer<typeof PeriodSchema>;

export const ComparisonSchema = z.enum(['previous_period', 'previous_year']);
export type Comparison = z.infer<typeof ComparisonSchema>;

export const ViewSpecSchema = z
  .object({
    specVersion: z.literal(1),
    jurisdiction: JurisdictionSchema,
    martId: IdentifierSchema,
    metrics: z.array(IdentifierSchema).min(1, 'Choose at least one metric').max(10),
    rows: z.array(IdentifierSchema).max(5).default([]),
    columns: z.array(IdentifierSchema).max(3).default([]),
    filters: z.array(FilterSchema).max(20).default([]),
    period: PeriodSchema,
    comparison: ComparisonSchema.optional(),
  })
  .strict()
  .superRefine((spec, ctx) => {
    reportDuplicates(spec.metrics, ['metrics'], ctx);
    reportDuplicates(spec.rows, ['rows'], ctx);
    reportDuplicates(spec.columns, ['columns'], ctx);
    spec.columns.forEach((dimension, index) => {
      if (spec.rows.includes(dimension)) {
        ctx.addIssue({
          code: 'custom',
          path: ['columns', index],
          message: `Dimension ${dimension} cannot be in rows and columns at the same time`,
        });
      }
    });
  });

/** Spec after validation (defaults applied). */
export type ViewSpec = z.output<typeof ViewSpecSchema>;
/** Spec as received (rows, columns and filters optional). */
export type ViewSpecInput = z.input<typeof ViewSpecSchema>;

function reportDuplicates(values: readonly string[], path: (string | number)[], ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({ code: 'custom', path: [...path, index], message: `Duplicate value: ${value}` });
    }
    seen.add(value);
  });
}

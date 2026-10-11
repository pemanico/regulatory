import { z } from 'zod';
import { IdentifierSchema, IsoDateSchema, JurisdictionSchema } from './common';

/**
 * Especificação de uma vista de pivot (secção 8 do Architecture Design).
 * É o que o Metrics agent produz a partir de linguagem natural e o que o
 * pivot edita por cliques. Nunca contém SQL.
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
        message: `O operador ${filter.operator} exige exatamente 1 valor`,
      });
    }
    if (filter.operator === 'between' && filter.values.length !== 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['values'],
        message: 'O operador between exige exatamente 2 valores',
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
    message: 'A data final tem de ser igual ou posterior à data inicial',
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
    metrics: z.array(IdentifierSchema).min(1, 'Escolhe pelo menos uma métrica').max(10),
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
          message: `A dimensão ${dimension} não pode estar em linhas e colunas ao mesmo tempo`,
        });
      }
    });
  });

/** Spec depois de validada (com defaults aplicados). */
export type ViewSpec = z.output<typeof ViewSpecSchema>;
/** Spec tal como chega (rows, columns e filters opcionais). */
export type ViewSpecInput = z.input<typeof ViewSpecSchema>;

function reportDuplicates(values: readonly string[], path: (string | number)[], ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      ctx.addIssue({ code: 'custom', path: [...path, index], message: `Valor repetido: ${value}` });
    }
    seen.add(value);
  });
}

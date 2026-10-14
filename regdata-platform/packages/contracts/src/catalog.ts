import { z } from 'zod';
import { IdentifierSchema, JurisdictionSchema } from './common';

/**
 * Data mart catalog (section 17 of the Architecture Design).
 * Each mart answers one business need, is row level with the business
 * rules already applied, and is partitioned by business date.
 */

export const MetricStatusSchema = z.enum(['draft', 'certified', 'deprecated']);
export type MetricStatus = z.infer<typeof MetricStatusSchema>;

export const DimensionTypeSchema = z.enum(['string', 'number', 'date']);
export type DimensionType = z.infer<typeof DimensionTypeSchema>;

export const DimensionDefSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1),
  type: DimensionTypeSchema,
});
export type DimensionDef = z.infer<typeof DimensionDefSchema>;

export const MetricDefSchema = z.object({
  id: IdentifierSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  status: MetricStatusSchema,
  /** Non-additive metrics (rates, percentages) cannot be summed across rows. */
  additive: z.boolean(),
  version: z.string().min(1),
});
export type MetricDef = z.infer<typeof MetricDefSchema>;

export const MartDefSchema = z.object({
  id: IdentifierSchema,
  jurisdiction: JurisdictionSchema,
  label: z.string().min(1),
  businessNeed: z.string().min(1),
  grain: z.literal('row'),
  partitionKey: IdentifierSchema,
  owner: z.string().min(1),
  dimensions: z.array(DimensionDefSchema).min(1),
  metrics: z.array(MetricDefSchema).min(1),
  /** Maximum period per view, to protect the query engines. */
  maxPeriodDays: z.number().int().positive(),
});
export type MartDefinition = z.infer<typeof MartDefSchema>;

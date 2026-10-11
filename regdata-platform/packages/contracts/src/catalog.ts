import { z } from 'zod';
import { IdentifierSchema, JurisdictionSchema } from './common';

/**
 * Catálogo de data marts (secção 17 do Architecture Design).
 * Cada mart responde a uma necessidade de negócio, está ao nível da linha,
 * com as regras já aplicadas, particionado por business date.
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
  /** Métricas não aditivas (taxas, percentagens) não podem ser somadas entre linhas. */
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
  /** Período máximo por vista, para proteger os motores de consulta. */
  maxPeriodDays: z.number().int().positive(),
});
export type MartDefinition = z.infer<typeof MartDefSchema>;

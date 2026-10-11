import { z } from 'zod';

/** Jurisdições cobertas pela plataforma. */
export const JURISDICTIONS = ['EMIR', 'CFTC', 'MIFID_TR'] as const;
export const JurisdictionSchema = z.enum(JURISDICTIONS);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

/** Identificadores técnicos (marts, métricas, dimensões): snake_case. */
export const IdentifierSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,63}$/, 'Identificador inválido: usar snake_case (a-z, 0-9, _)');

/** Data de negócio no formato AAAA-MM-DD, validada como data real. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD')
  .refine((value) => isRealDate(value), 'Data inexistente');

export function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Número de dias entre duas datas ISO, inclusive. */
export function daysInclusive(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

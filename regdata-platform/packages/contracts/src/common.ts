import { z } from 'zod';

/** Jurisdictions covered by the platform. */
export const JURISDICTIONS = ['EMIR', 'CFTC', 'MIFID_TR'] as const;
export const JurisdictionSchema = z.enum(JURISDICTIONS);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

/** Technical identifiers (marts, metrics, dimensions): snake_case. */
export const IdentifierSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,63}$/, 'Invalid identifier: use snake_case (a-z, 0-9, _)');

/** Business date in YYYY-MM-DD format, validated as a real date. */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => isRealDate(value), 'Date does not exist');

export function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Number of days between two ISO dates, inclusive. */
export function daysInclusive(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

import { z } from 'zod';

/**
 * Local bindings: where each mart's files are and how logical columns map to the
 * real column names. Kept in a local JSON file next to the .env, never in Git.
 *
 * Example (fictitious):
 * {
 *   "marts": {
 *     "emir_recon_breaks": {
 *       "format": "parquet",
 *       "source": "D:/data/breaks/business_date=*\/*.parquet",
 *       "columns": {
 *         "field_in_break": "FIELD_NAME_X",
 *         "business_date": { "column": "BIZ_DATE", "dateFormat": "%d/%m/%Y" }
 *       }
 *     }
 *   }
 * }
 * Columns not listed use their logical name.
 */

export const ColumnBindingSchema = z.union([
  z.string().min(1),
  z
    .object({
      column: z.string().min(1),
      /** strptime format for dates stored as text, e.g. "%d/%m/%Y". */
      dateFormat: z.string().min(1).optional(),
    })
    .strict(),
]);
export type ColumnBinding = z.infer<typeof ColumnBindingSchema>;

export const MartBindingSchema = z
  .object({
    format: z.enum(['parquet', 'csv']).default('parquet'),
    /** File path or glob, e.g. "/data/breaks/**\/*.parquet". */
    source: z.string().min(1),
    /** CSV only: field delimiter; detected automatically when absent. */
    csvDelimiter: z.string().length(1).optional(),
    columns: z.record(z.string(), ColumnBindingSchema).default({}),
  })
  .strict();
export type MartBinding = z.output<typeof MartBindingSchema>;
export type MartBindingInput = z.input<typeof MartBindingSchema>;

export const BindingsFileSchema = z
  .object({
    marts: z.record(z.string(), MartBindingSchema),
  })
  .strict();
export type BindingsFile = z.output<typeof BindingsFileSchema>;

/** Parses the bindings file content; throws with a readable message when invalid. */
export function parseBindings(json: unknown): BindingsFile {
  const parsed = BindingsFileSchema.safeParse(json);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ');
    throw new Error(`Invalid bindings file: ${details}`);
  }
  return parsed.data;
}

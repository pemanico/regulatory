import { z } from 'zod';
import { IsoDateSchema } from './common';

/**
 * Field-level validation rules (EMIR) converted from the rules, action type
 * and DTCC-to-BNPP mapping spreadsheets.
 * See docs/brain/09-regras-validacao-campos.md.
 */

export const ACTION_TYPES = ['NEWT', 'MODI', 'VALU', 'CORR', 'TERM', 'EROR', 'REVI', 'POSC'] as const;
export const ActionTypeSchema = z.enum(ACTION_TYPES);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const FIELD_STATUSES = ['M', 'C', 'O', 'NA'] as const;
export const FieldStatusSchema = z.enum(FIELD_STATUSES);
export type FieldStatus = z.infer<typeof FieldStatusSchema>;

const nullableStatus = FieldStatusSchema.nullable();

/** Status per action type; null when it could not be read (always reported as an issue). */
export const StatusByActionTypeSchema = z.object({
  NEWT: nullableStatus,
  MODI: nullableStatus,
  VALU: nullableStatus,
  CORR: nullableStatus,
  TERM: nullableStatus,
  EROR: nullableStatus,
  REVI: nullableStatus,
  POSC: nullableStatus,
});
export type StatusByActionType = z.infer<typeof StatusByActionTypeSchema>;

export const BnppFieldRoleSchema = z.enum(['party_1', 'party_2', 'other']);
export type BnppFieldRole = z.infer<typeof BnppFieldRoleSchema>;

export const BnppFieldSchema = z.object({
  name: z.string().min(1),
  role: BnppFieldRoleSchema,
});
export type BnppField = z.infer<typeof BnppFieldSchema>;

export const SourceRefSchema = z.object({
  fileName: z.string(),
  sheetName: z.string(),
  /** 1-based spreadsheet row number. */
  row: z.number().int().positive(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const FieldRuleRecordSchema = z.object({
  /** Table.Item, e.g. "2.17". */
  fieldId: z.string().min(1),
  regulation: z.literal('EMIR'),
  table: z.string().min(1),
  item: z.string().min(1),
  section: z.string(),
  fieldName: z.string(),
  /** Format text kept as in the source, one entry per source line. */
  formatLines: z.array(z.string()),
  /** Conditions joined into one numbered paragraph; wording preserved. */
  condition: z.string(),
  errorCodes: z.array(z.string()),
  statusByActionType: StatusByActionTypeSchema,
  bnppFields: z.array(BnppFieldSchema),
  document: z.object({
    version: z.string().nullable(),
    effectiveFrom: IsoDateSchema.nullable(),
  }),
  source: z.object({
    rules: SourceRefSchema,
    actionTypes: SourceRefSchema.nullable(),
    mapping: SourceRefSchema.nullable(),
  }),
});
export type FieldRuleRecord = z.infer<typeof FieldRuleRecordSchema>;

export type IssueSeverity = 'error' | 'warning';

export type IssueCode =
  | 'NO_RULES_SHEET'
  | 'NO_ACTION_TYPES_SHEET'
  | 'NO_MAPPING_SHEET'
  | 'MULTIPLE_SHEETS'
  | 'MISSING_ACTION_TYPE_COLUMN'
  | 'MISSING_TABLE'
  | 'MISSING_ITEM'
  | 'DUPLICATE_FIELD_ID'
  | 'ACTION_TYPES_NOT_FOUND'
  | 'ACTION_TYPES_WITHOUT_RULE'
  | 'SECTION_MISMATCH'
  | 'FIELD_NAME_MISMATCH'
  | 'STATUS_MISSING'
  | 'EMPTY_STATUS'
  | 'INVALID_STATUS'
  | 'NO_BNPP_MAPPING'
  | 'EMPTY_BNPP_MAPPING'
  | 'UNUSED_MAPPING'
  | 'DUPLICATE_MAPPING'
  | 'BNPP_FIELD_REUSED'
  | 'PARTY_FIELD_UNPAIRED'
  | 'UNUSUAL_ERROR_CODE'
  | 'REFERENCE_OUTSIDE_FILE'
  | 'TOO_MANY_ROWS';

export interface ConversionIssue {
  severity: IssueSeverity;
  code: IssueCode;
  message: string;
  fieldId?: string;
  source?: SourceRef;
}

export const ReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export interface FieldReview {
  status: ReviewStatus;
  reviewer?: string;
  comment?: string;
  reviewedAt?: string;
}

export const ReviewRequestSchema = z
  .object({
    decision: z.enum(['approved', 'rejected']),
    comment: z.string().max(2000).optional(),
  })
  .strict()
  .refine((request) => request.decision === 'approved' || (request.comment?.trim().length ?? 0) > 0, {
    message: 'Comentário obrigatório ao rejeitar',
    path: ['comment'],
  });
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

const optionalText = (max: number) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), z.string().trim().max(max).optional());

export const UploadMetadataSchema = z.object({
  documentVersion: optionalText(50),
  effectiveFrom: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    IsoDateSchema.optional(),
  ),
});
export type UploadMetadata = z.infer<typeof UploadMetadataSchema>;

export interface FieldRuleItem {
  record: FieldRuleRecord;
  issues: ConversionIssue[];
  /** Text chunk for the RAG, rendered from the record. */
  chunk: string;
  review: FieldReview;
}

export interface FieldRulesUploadSummary {
  id: string;
  fileNames: string[];
  uploadedBy: string;
  uploadedAt: string;
  blockLabels: [string, string];
  counts: {
    fields: number;
    withErrors: number;
    withWarnings: number;
    pending: number;
    approved: number;
    rejected: number;
    uploadIssues: number;
  };
}

export interface FieldRulesUploadDetail extends FieldRulesUploadSummary {
  /** Issues not tied to a converted field (missing sheets, rows without key, unused mappings). */
  uploadIssues: ConversionIssue[];
  items: FieldRuleItem[];
}

export interface FieldRulesExport {
  fileName: string;
  contentType: 'application/json' | 'text/markdown';
  content: string;
  fields: number;
}

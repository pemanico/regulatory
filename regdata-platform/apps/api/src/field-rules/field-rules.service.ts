import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FieldRuleRecordSchema,
  ReviewRequestSchema,
  UploadMetadataSchema,
  type FieldRuleItem,
  type FieldRulesExport,
  type FieldRulesUploadDetail,
  type FieldRulesUploadSummary,
} from '@regdata/contracts';
import { DEFAULT_BLOCK_LABELS, convertFieldRules, renderChunk, type SheetData } from '@regdata/field-rules';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { readWorkbook } from './excel-reader';

/** Minimal shape of a file received by the multipart interceptor (multer memory storage). */
export interface UploadedSpreadsheet {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 3;
const MAX_STORED_UPLOADS = 20;

interface StoredUpload {
  detail: FieldRulesUploadDetail;
}

/**
 * Upload, conversion and review of field-level validation rules.
 * Storage is in memory for now (lost on restart); the export is the hand-off to indexing.
 */
@Injectable()
export class FieldRulesService {
  private readonly uploads = new Map<string, StoredUpload>();
  private readonly blockLabels = parseBlockLabels(process.env.FIELD_RULES_BLOCK_LABELS);
  private readonly fourEyes = (process.env.FIELD_RULES_FOUR_EYES ?? 'true').toLowerCase() !== 'false';

  async createUpload(files: UploadedSpreadsheet[] | undefined, body: unknown, user: AuthenticatedUser): Promise<FieldRulesUploadDetail> {
    this.assertAccess(user);
    if (!files || files.length === 0) throw new BadRequestException('Nenhum ficheiro recebido (campo "files").');
    if (files.length > MAX_FILES) throw new BadRequestException(`Máximo de ${MAX_FILES} ficheiros por upload.`);

    const metadata = UploadMetadataSchema.safeParse(body ?? {});
    if (!metadata.success) {
      throw new BadRequestException(metadata.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    }

    const sheets: SheetData[] = [];
    for (const file of files) {
      if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
        throw new BadRequestException(`Formato não suportado: ${file.originalname}. Só .xlsx.`);
      }
      try {
        sheets.push(...(await readWorkbook(file.originalname, file.buffer)));
      } catch {
        throw new BadRequestException(`Não foi possível ler ${file.originalname}. Confirma que é um .xlsx válido.`);
      }
    }

    const result = convertFieldRules(sheets, {
      documentVersion: metadata.data.documentVersion ?? null,
      effectiveFrom: metadata.data.effectiveFrom ?? null,
    });

    const items: FieldRuleItem[] = result.fields.map(({ record, issues }) => ({
      record: FieldRuleRecordSchema.parse(record),
      issues,
      chunk: renderChunk(record, { blockLabels: this.blockLabels }),
      review: { status: 'pending' },
    }));

    const detail: FieldRulesUploadDetail = {
      id: randomUUID(),
      fileNames: files.map((file) => file.originalname),
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      blockLabels: this.blockLabels,
      uploadIssues: result.uploadIssues,
      items,
      counts: emptyCounts(),
    };
    refreshCounts(detail);

    this.uploads.set(detail.id, { detail });
    this.evictOldUploads();
    return detail;
  }

  list(user: AuthenticatedUser): FieldRulesUploadSummary[] {
    this.assertAccess(user);
    return [...this.uploads.values()]
      .map(({ detail }) => toSummary(detail))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  get(id: string, user: AuthenticatedUser): FieldRulesUploadDetail {
    this.assertAccess(user);
    return this.find(id).detail;
  }

  review(id: string, fieldId: string, body: unknown, user: AuthenticatedUser): FieldRuleItem {
    this.assertAccess(user);
    const stored = this.find(id);
    const parsed = ReviewRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join('; '));
    }

    const item = stored.detail.items.find((candidate) => candidate.record.fieldId === fieldId);
    if (!item) throw new NotFoundException(`Campo ${fieldId} não encontrado neste upload.`);

    this.assertNotUploader(stored.detail, user);
    if (parsed.data.decision === 'approved' && hasErrors(item)) {
      throw new ConflictException(`O campo ${fieldId} tem erros de conversão e não pode ser aprovado. Corrige o Excel e volta a carregar.`);
    }

    item.review = {
      status: parsed.data.decision,
      reviewer: user.id,
      comment: parsed.data.comment?.trim() || undefined,
      reviewedAt: new Date().toISOString(),
    };
    refreshCounts(stored.detail);
    return item;
  }

  /** Approves every pending field with no errors and no warnings. */
  approveClean(id: string, user: AuthenticatedUser): FieldRulesUploadSummary {
    this.assertAccess(user);
    const stored = this.find(id);
    this.assertNotUploader(stored.detail, user);

    const now = new Date().toISOString();
    for (const item of stored.detail.items) {
      if (item.review.status === 'pending' && item.issues.length === 0) {
        item.review = { status: 'approved', reviewer: user.id, comment: 'Aprovação em bloco (sem erros nem avisos)', reviewedAt: now };
      }
    }
    refreshCounts(stored.detail);
    return toSummary(stored.detail);
  }

  /** Exports approved fields only: canonical records (JSON) or RAG chunks (Markdown). */
  export(id: string, format: string | undefined, user: AuthenticatedUser): FieldRulesExport {
    this.assertAccess(user);
    const stored = this.find(id);
    const approved = stored.detail.items.filter((item) => item.review.status === 'approved');
    const stamp = stored.detail.uploadedAt.slice(0, 10);

    if (format === 'markdown') {
      const content = approved.map((item) => item.chunk).join('\n\n---\n\n');
      return { fileName: `field-rules-chunks-${stamp}.md`, contentType: 'text/markdown', content, fields: approved.length };
    }
    if (format === undefined || format === 'json') {
      const content = JSON.stringify(
        approved.map((item) => ({ ...item.record, review: item.review })),
        null,
        2,
      );
      return { fileName: `field-rules-${stamp}.json`, contentType: 'application/json', content, fields: approved.length };
    }
    throw new BadRequestException('Formato de exportação inválido: usar json ou markdown.');
  }

  private find(id: string): StoredUpload {
    const stored = this.uploads.get(id);
    if (!stored) throw new NotFoundException('Upload não encontrado.');
    return stored;
  }

  private assertAccess(user: AuthenticatedUser): void {
    if (!user.jurisdictions.includes('EMIR')) {
      throw new ForbiddenException('Sem acesso a regras EMIR.');
    }
  }

  private assertNotUploader(detail: FieldRulesUploadDetail, user: AuthenticatedUser): void {
    if (this.fourEyes && detail.uploadedBy === user.id) {
      throw new ForbiddenException('Quem carregou o ficheiro não pode rever os campos (4-eyes).');
    }
  }

  private evictOldUploads(): void {
    const ordered = [...this.uploads.values()].sort((a, b) => a.detail.uploadedAt.localeCompare(b.detail.uploadedAt));
    while (ordered.length > MAX_STORED_UPLOADS) {
      const oldest = ordered.shift();
      if (oldest) this.uploads.delete(oldest.detail.id);
    }
  }
}

function parseBlockLabels(raw: string | undefined): [string, string] {
  if (!raw) return DEFAULT_BLOCK_LABELS;
  const labels = raw.split(',').map((label) => label.trim().toUpperCase());
  const valid = labels.length === 2 && labels.every((label) => /^[A-Z0-9_]{1,20}$/.test(label));
  if (!valid) throw new Error(`FIELD_RULES_BLOCK_LABELS inválido: "${raw}". Exemplo: LEG_1,LEG_2`);
  return [labels[0] as string, labels[1] as string];
}

function hasErrors(item: FieldRuleItem): boolean {
  return item.issues.some((issue) => issue.severity === 'error');
}

function emptyCounts(): FieldRulesUploadSummary['counts'] {
  return { fields: 0, withErrors: 0, withWarnings: 0, pending: 0, approved: 0, rejected: 0, uploadIssues: 0 };
}

function refreshCounts(detail: FieldRulesUploadDetail): void {
  const counts = emptyCounts();
  counts.fields = detail.items.length;
  counts.uploadIssues = detail.uploadIssues.length;
  for (const item of detail.items) {
    if (hasErrors(item)) counts.withErrors += 1;
    if (item.issues.some((issue) => issue.severity === 'warning')) counts.withWarnings += 1;
    counts[item.review.status] += 1;
  }
  detail.counts = counts;
}

function toSummary(detail: FieldRulesUploadDetail): FieldRulesUploadSummary {
  const { id, fileNames, uploadedBy, uploadedAt, blockLabels, counts } = detail;
  return { id, fileNames, uploadedBy, uploadedAt, blockLabels, counts };
}

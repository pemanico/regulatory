import {
  ACTION_TYPES,
  type ActionType,
  type ConversionIssue,
  type FieldRuleRecord,
  type FieldStatus,
  type SourceRef,
  type StatusByActionType,
} from '@regdata/contracts';
import { classifyBnppFields, splitBnppFields } from './mapping';
import { cell, isEmptyRow, locateSheets, type LocatedSheet, type SheetData, type SheetKind } from './sheets';
import {
  ERROR_CODE_PATTERN,
  cleanCondition,
  findFieldReferences,
  normalizeForCompare,
  normalizeKeyPart,
  parseErrorCodes,
  splitLines,
} from './text';

export const MAX_ROWS_PER_SHEET = 10_000;

export interface ConvertOptions {
  documentVersion?: string | null;
  effectiveFrom?: string | null;
}

export interface ConvertedField {
  record: FieldRuleRecord;
  issues: ConversionIssue[];
}

export interface ConversionResult {
  fields: ConvertedField[];
  /** Issues not tied to a converted field. */
  uploadIssues: ConversionIssue[];
}

interface ActionTypeRow {
  section: string;
  fieldName: string;
  statuses: Partial<Record<ActionType, string>>;
  source: SourceRef;
  used: boolean;
}

interface MappingRow {
  dtccName: string;
  bnpp: string[];
  source: SourceRef;
  used: boolean;
}

const STATUS_WORDS: Record<string, FieldStatus> = {
  M: 'M',
  MANDATORY: 'M',
  C: 'C',
  CONDITIONAL: 'C',
  O: 'O',
  OPTIONAL: 'O',
  NA: 'NA',
  'N/A': 'NA',
  '-': 'NA',
  'NOT APPLICABLE': 'NA',
  'NOT RELEVANT': 'NA',
};

/** Parses one status cell. Empty and unknown values are errors, never defaulted. */
export function parseStatus(raw: string): { status: FieldStatus | null; problem: 'empty' | 'invalid' | null } {
  const value = raw.trim().toUpperCase().replace(/\s+/g, ' ');
  if (value === '') return { status: null, problem: 'empty' };
  const dashUnified = value.replace(/[‐-―−]/g, '-');
  const status = STATUS_WORDS[dashUnified];
  return status ? { status, problem: null } : { status: null, problem: 'invalid' };
}

function sourceRef(located: LocatedSheet, rowIndex: number): SourceRef {
  return { fileName: located.sheet.fileName, sheetName: located.sheet.sheetName, row: rowIndex + 1 };
}

function where(source: SourceRef): string {
  return `${source.fileName} › ${source.sheetName}, linha ${source.row}`;
}

function dataRows(located: LocatedSheet, uploadIssues: ConversionIssue[]): number[] {
  const indexes: number[] = [];
  const rows = located.sheet.rows;
  if (rows.length > MAX_ROWS_PER_SHEET) {
    uploadIssues.push({
      severity: 'error',
      code: 'TOO_MANY_ROWS',
      message: `A folha ${located.sheet.sheetName} tem ${rows.length} linhas; o máximo é ${MAX_ROWS_PER_SHEET}. Só as primeiras foram lidas.`,
    });
  }
  const last = Math.min(rows.length, MAX_ROWS_PER_SHEET);
  for (let index = located.headerRow + 1; index < last; index += 1) {
    if (!isEmptyRow(rows[index])) indexes.push(index);
  }
  return indexes;
}

function pickOne(located: LocatedSheet[], kind: SheetKind, label: string, uploadIssues: ConversionIssue[]): LocatedSheet | undefined {
  const matches = located.filter((entry) => entry.kind === kind);
  if (matches.length > 1) {
    uploadIssues.push({
      severity: 'error',
      code: 'MULTIPLE_SHEETS',
      message: `Encontradas ${matches.length} folhas de ${label}: ${matches
        .map((entry) => `${entry.sheet.fileName} › ${entry.sheet.sheetName}`)
        .join('; ')}. Foi usada a primeira.`,
    });
  }
  return matches[0];
}

/**
 * Converts the rules, action type and mapping sheets into canonical records.
 * Join between rules and action types: Table + Item. Section and Field are only verified.
 * Join with the mapping: normalized field name (the mapping has no Table.Item).
 */
export function convertFieldRules(sheets: SheetData[], options: ConvertOptions = {}): ConversionResult {
  const uploadIssues: ConversionIssue[] = [];
  const located = locateSheets(sheets);

  const rulesSheet = pickOne(located, 'rules', 'regras', uploadIssues);
  const actionSheet = pickOne(located, 'actionTypes', 'estado por action type', uploadIssues);
  const mappingSheet = pickOne(located, 'mapping', 'mapping DTCC ↔ BNPP', uploadIssues);

  if (!rulesSheet) {
    uploadIssues.push({
      severity: 'error',
      code: 'NO_RULES_SHEET',
      message: 'Nenhuma folha de regras encontrada (cabeçalhos esperados: Table, Item, Section, Field, Format, Conditions, Error codes).',
    });
    return { fields: [], uploadIssues };
  }
  if (!actionSheet) {
    uploadIssues.push({
      severity: 'error',
      code: 'NO_ACTION_TYPES_SHEET',
      message: 'Nenhuma folha de estado por action type encontrada (cabeçalhos esperados: Table, Item, Section, Field e NEWT … POSC).',
    });
  }
  if (!mappingSheet) {
    uploadIssues.push({
      severity: 'warning',
      code: 'NO_MAPPING_SHEET',
      message: 'Nenhuma folha de mapping DTCC ↔ BNPP encontrada (cabeçalhos esperados: DTCC Report, BNPP). Os campos ficam sem campos BNPP.',
    });
  }

  const missingActionTypeColumns = actionSheet ? ACTION_TYPES.filter((type) => actionSheet.actionTypeColumns[type] === undefined) : [];
  if (actionSheet && missingActionTypeColumns.length > 0) {
    uploadIssues.push({
      severity: 'error',
      code: 'MISSING_ACTION_TYPE_COLUMN',
      message: `Colunas de action type em falta em ${actionSheet.sheet.sheetName}: ${missingActionTypeColumns.join(', ')}.`,
    });
  }

  const actionRows = actionSheet ? readActionTypes(actionSheet, uploadIssues) : new Map<string, ActionTypeRow>();
  const mappingRows = mappingSheet ? readMapping(mappingSheet, uploadIssues) : new Map<string, MappingRow>();

  const fields = new Map<string, ConvertedField>();
  const rows = rulesSheet.sheet.rows;
  const columns = rulesSheet.columns;

  for (const rowIndex of dataRows(rulesSheet, uploadIssues)) {
    const row = rows[rowIndex];
    const source = sourceRef(rulesSheet, rowIndex);
    const table = normalizeKeyPart(cell(row, columns.table));
    const item = normalizeKeyPart(cell(row, columns.item));
    const fieldName = cell(row, columns.field).trim();

    if (!table || !item) {
      uploadIssues.push({
        severity: 'error',
        code: table ? 'MISSING_ITEM' : 'MISSING_TABLE',
        message: `Regra sem ${table ? 'Item' : 'Table'} ("${fieldName || 'sem nome'}") em ${where(source)}. Campo ignorado.`,
        source,
      });
      continue;
    }

    const fieldId = `${table}.${item}`;
    const existing = fields.get(fieldId);
    if (existing) {
      existing.issues.push({
        severity: 'error',
        code: 'DUPLICATE_FIELD_ID',
        message: `O campo ${fieldId} aparece mais de uma vez na folha de regras (também em ${where(source)}).`,
        fieldId,
        source,
      });
      continue;
    }

    const issues: ConversionIssue[] = [];
    const section = cell(row, columns.section).trim();

    const errorCodes = parseErrorCodes(cell(row, columns.errorCodes));
    const unusual = errorCodes.filter((code) => !ERROR_CODE_PATTERN.test(code));
    if (unusual.length > 0) {
      issues.push({
        severity: 'warning',
        code: 'UNUSUAL_ERROR_CODE',
        message: `Códigos de erro com formato inesperado: ${unusual.join(', ')}.`,
        fieldId,
        source,
      });
    }

    const actionRow = actionRows.get(fieldId);
    const statusByActionType = {} as StatusByActionType;
    for (const type of ACTION_TYPES) statusByActionType[type] = null;

    if (!actionRow) {
      if (actionSheet) {
        issues.push({
          severity: 'error',
          code: 'ACTION_TYPES_NOT_FOUND',
          message: `Sem linha para ${fieldId} na folha de estado por action type.`,
          fieldId,
        });
      }
    } else {
      actionRow.used = true;
      if (normalizeForCompare(actionRow.section) !== normalizeForCompare(section)) {
        issues.push({
          severity: 'warning',
          code: 'SECTION_MISMATCH',
          message: `Section diferente entre as folhas: "${section}" (regras) vs "${actionRow.section}" (action types).`,
          fieldId,
          source: actionRow.source,
        });
      }
      if (normalizeForCompare(actionRow.fieldName) !== normalizeForCompare(fieldName)) {
        issues.push({
          severity: 'warning',
          code: 'FIELD_NAME_MISMATCH',
          message: `Nome do campo diferente entre as folhas: "${fieldName}" (regras) vs "${actionRow.fieldName}" (action types).`,
          fieldId,
          source: actionRow.source,
        });
      }
      const empty: ActionType[] = [];
      const invalid: string[] = [];
      for (const type of ACTION_TYPES) {
        const raw = actionRow.statuses[type];
        if (raw === undefined) continue;
        const parsed = parseStatus(raw);
        statusByActionType[type] = parsed.status;
        if (parsed.problem === 'empty') empty.push(type);
        if (parsed.problem === 'invalid') invalid.push(`${type}="${raw.trim()}"`);
      }
      if (empty.length > 0) {
        issues.push({
          severity: 'error',
          code: 'EMPTY_STATUS',
          message: `Estado vazio em ${empty.join(', ')}. Uma célula vazia não é tratada como NA.`,
          fieldId,
          source: actionRow.source,
        });
      }
      if (invalid.length > 0) {
        issues.push({
          severity: 'error',
          code: 'INVALID_STATUS',
          message: `Estados fora de M/C/O/-: ${invalid.join(', ')}.`,
          fieldId,
          source: actionRow.source,
        });
      }
    }

    if (actionRow && missingActionTypeColumns.length > 0) {
      issues.push({
        severity: 'error',
        code: 'STATUS_MISSING',
        message: `Sem estado para ${missingActionTypeColumns.join(', ')} (coluna em falta).`,
        fieldId,
      });
    } else if (!actionSheet) {
      issues.push({
        severity: 'error',
        code: 'STATUS_MISSING',
        message: 'Sem estado por action type (folha em falta).',
        fieldId,
      });
    }

    const mapping = mappingRows.get(normalizeForCompare(fieldName));
    let bnppFields: FieldRuleRecord['bnppFields'] = [];
    if (mappingSheet) {
      if (!mapping) {
        issues.push({
          severity: 'warning',
          code: 'NO_BNPP_MAPPING',
          message: `O campo "${fieldName}" não tem correspondência no mapping DTCC ↔ BNPP (ligação pelo nome do campo).`,
          fieldId,
        });
      } else {
        mapping.used = true;
        if (mapping.bnpp.length === 0) {
          issues.push({
            severity: 'warning',
            code: 'EMPTY_BNPP_MAPPING',
            message: `O mapping de "${fieldName}" não tem campos BNPP.`,
            fieldId,
            source: mapping.source,
          });
        }
        const classified = classifyBnppFields(mapping.bnpp);
        bnppFields = classified.fields;
        if (classified.unpaired.length > 0) {
          issues.push({
            severity: 'warning',
            code: 'PARTY_FIELD_UNPAIRED',
            message: `Campos de parte sem o par da outra parte: ${classified.unpaired.join(', ')}.`,
            fieldId,
            source: mapping.source,
          });
        }
      }
    }

    const record: FieldRuleRecord = {
      fieldId,
      regulation: 'EMIR',
      table,
      item,
      section,
      fieldName,
      formatLines: splitLines(cell(row, columns.format)),
      condition: cleanCondition(cell(row, columns.conditions)),
      errorCodes,
      statusByActionType,
      bnppFields,
      document: {
        version: options.documentVersion ?? null,
        effectiveFrom: options.effectiveFrom ?? null,
      },
      source: {
        rules: source,
        actionTypes: actionRow?.source ?? null,
        mapping: mapping?.source ?? null,
      },
    };

    fields.set(fieldId, { record, issues });
  }

  // Cross-field references that point outside the uploaded file.
  for (const { record, issues } of fields.values()) {
    const outside = findFieldReferences(record.condition).filter((reference) => !fields.has(reference));
    if (outside.length > 0) {
      issues.push({
        severity: 'warning',
        code: 'REFERENCE_OUTSIDE_FILE',
        message: `As condições referem campos que não estão neste ficheiro: ${outside.join(', ')}.`,
        fieldId: record.fieldId,
      });
    }
  }

  for (const [fieldId, actionRow] of actionRows) {
    if (!fields.has(fieldId) && !actionRow.used) {
      uploadIssues.push({
        severity: 'warning',
        code: 'ACTION_TYPES_WITHOUT_RULE',
        message: `A folha de action types tem ${fieldId} ("${actionRow.fieldName}"), que não existe na folha de regras.`,
        source: actionRow.source,
      });
    }
  }

  for (const mapping of mappingRows.values()) {
    if (!mapping.used) {
      uploadIssues.push({
        severity: 'warning',
        code: 'UNUSED_MAPPING',
        message: `O campo DTCC "${mapping.dtccName}" do mapping não corresponde a nenhum campo da folha de regras.`,
        source: mapping.source,
      });
    }
  }

  return { fields: [...fields.values()], uploadIssues };
}

function readActionTypes(located: LocatedSheet, uploadIssues: ConversionIssue[]): Map<string, ActionTypeRow> {
  const result = new Map<string, ActionTypeRow>();
  const columns = located.columns;

  for (const rowIndex of dataRows(located, uploadIssues)) {
    const row = located.sheet.rows[rowIndex];
    const source = sourceRef(located, rowIndex);
    const table = normalizeKeyPart(cell(row, columns.table));
    const item = normalizeKeyPart(cell(row, columns.item));
    const fieldName = cell(row, columns.field).trim();

    if (!table || !item) {
      uploadIssues.push({
        severity: 'error',
        code: table ? 'MISSING_ITEM' : 'MISSING_TABLE',
        message: `Linha de action types sem ${table ? 'Item' : 'Table'} ("${fieldName || 'sem nome'}"${item ? `, item ${item}` : ''}) em ${where(source)}. O campo correspondente fica sem estados.`,
        source,
      });
      continue;
    }

    const fieldId = `${table}.${item}`;
    if (result.has(fieldId)) {
      uploadIssues.push({
        severity: 'error',
        code: 'DUPLICATE_FIELD_ID',
        message: `O campo ${fieldId} aparece mais de uma vez na folha de action types (${where(source)}). Foi usada a primeira linha.`,
        source,
      });
      continue;
    }

    const statuses: Partial<Record<ActionType, string>> = {};
    for (const type of ACTION_TYPES) {
      const index = located.actionTypeColumns[type];
      if (index !== undefined) statuses[type] = cell(row, index);
    }

    result.set(fieldId, { section: cell(row, columns.section).trim(), fieldName, statuses, source, used: false });
  }
  return result;
}

function readMapping(located: LocatedSheet, uploadIssues: ConversionIssue[]): Map<string, MappingRow> {
  const result = new Map<string, MappingRow>();
  const owners = new Map<string, string>();
  const columns = located.columns;

  for (const rowIndex of dataRows(located, uploadIssues)) {
    const row = located.sheet.rows[rowIndex];
    const source = sourceRef(located, rowIndex);
    const dtccName = cell(row, columns.dtcc).trim();
    if (!dtccName) continue;

    const key = normalizeForCompare(dtccName);
    const bnpp = splitBnppFields(cell(row, columns.bnpp));

    if (result.has(key)) {
      uploadIssues.push({
        severity: 'warning',
        code: 'DUPLICATE_MAPPING',
        message: `O campo DTCC "${dtccName}" aparece mais de uma vez no mapping (${where(source)}). Foi usada a primeira linha.`,
        source,
      });
      continue;
    }

    for (const name of bnpp) {
      const owner = owners.get(name);
      if (owner && owner !== dtccName) {
        uploadIssues.push({
          severity: 'warning',
          code: 'BNPP_FIELD_REUSED',
          message: `O campo BNPP ${name} está mapeado para "${owner}" e para "${dtccName}".`,
          source,
        });
      } else {
        owners.set(name, dtccName);
      }
    }

    result.set(key, { dtccName, bnpp, source, used: false });
  }
  return result;
}

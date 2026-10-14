import { ACTION_TYPES, type BnppFieldRole, type FieldRuleRecord } from '@regdata/contracts';

export interface RenderOptions {
  /** Labels of the two rule blocks, e.g. ["LEG_1", "LEG_2"] or ["PARTY_1", "PARTY_2"]. */
  blockLabels: [string, string];
}

export const DEFAULT_BLOCK_LABELS: [string, string] = ['LEG_1', 'LEG_2'];

function namesWithRole(record: FieldRuleRecord, role: BnppFieldRole): string[] {
  return record.bnppFields.filter((field) => field.role === role).map((field) => field.name);
}

function bnppLineForBlock(record: FieldRuleRecord, role: 'party_1' | 'party_2'): string {
  const own = namesWithRole(record, role);
  if (own.length > 0) return own.join(', ');
  const common = namesWithRole(record, 'other');
  if (common.length > 0) return `${common.join(', ')} (common field, no per-party field)`;
  return 'no BNPP mapping';
}

function sourceLine(record: FieldRuleRecord): string {
  const { rules } = record.source;
  const version = record.document.version ? ` v${record.document.version}` : ' (version not stated)';
  const effective = record.document.effectiveFrom ? `, effective from ${record.document.effectiveFrom}` : '';
  return `${rules.fileName}${version}${effective} · sheet ${rules.sheetName}, row ${rules.row}`;
}

/**
 * Renders the RAG chunk for one field using the mandatory template
 * (docs/brain/09-regras-validacao-campos.md §1). Both blocks carry the same rules;
 * each block names the BNPP field of its side.
 */
export function renderChunk(record: FieldRuleRecord, options: RenderOptions = { blockLabels: DEFAULT_BLOCK_LABELS }): string {
  const [format, ...moreFormat] = record.formatLines.length > 0 ? record.formatLines : [''];
  const lines: string[] = [
    `FIELD_ID: ${record.fieldId}`,
    `CONTEXT: Section: ${record.section}`,
    `FIELD_NAME: ${record.fieldName}`,
    `FORMAT: ${format}`,
    ...moreFormat.map((line) => `  ${line}`),
  ];

  // Optional action types absent from the source (e.g. POSC, not used yet) are left out.
  const notInSource = new Set(record.actionTypesNotInSource);
  const actionTypes = ACTION_TYPES.filter((type) => !notInSource.has(type));
  const roles: ['party_1', 'party_2'] = ['party_1', 'party_2'];
  roles.forEach((role, index) => {
    lines.push(
      `RULES_${options.blockLabels[index]}:`,
      `  BNPP_Field: ${bnppLineForBlock(record, role)}`,
      `  Condition: ${record.condition}`,
      `  Error_Codes: [${record.errorCodes.join(', ')}]`,
      '  Status_by_Action_Type:',
      ...actionTypes.map((type) => `    ${type}: ${record.statusByActionType[type] ?? '?'}`),
    );
  });

  const others = namesWithRole(record, 'other');
  const hasPartyFields = record.bnppFields.some((field) => field.role !== 'other');
  if (others.length > 0 && hasPartyFields) {
    lines.push(`OTHER_BNPP_FIELDS: ${others.join(', ')}`);
  }
  lines.push(`REGULATION: ${record.regulation}`, `SOURCE: ${sourceLine(record)}`);

  return lines.join('\n');
}

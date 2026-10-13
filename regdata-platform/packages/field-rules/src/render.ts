import { ACTION_TYPES, type BnppFieldRole, type FieldRuleRecord } from '@regdata/contracts';

export interface RenderOptions {
  /** Labels of the two rule blocks, e.g. ["LEG_1", "LEG_2"] or ["PARTE_1", "PARTE_2"]. */
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
  if (common.length > 0) return `${common.join(', ')} (campo comum, sem campo por parte)`;
  return 'sem mapeamento BNPP';
}

function sourceLine(record: FieldRuleRecord): string {
  const { rules } = record.source;
  const version = record.document.version ? ` v${record.document.version}` : ' (versão não indicada)';
  const effective = record.document.effectiveFrom ? `, vigente desde ${record.document.effectiveFrom}` : '';
  return `${rules.fileName}${version}${effective} · folha ${rules.sheetName}, linha ${rules.row}`;
}

/**
 * Renders the RAG chunk for one field using the mandatory template
 * (docs/brain/09-regras-validacao-campos.md §1). Both blocks carry the same rules;
 * each block names the BNPP field of its side.
 */
export function renderChunk(record: FieldRuleRecord, options: RenderOptions = { blockLabels: DEFAULT_BLOCK_LABELS }): string {
  const [format, ...moreFormat] = record.formatLines.length > 0 ? record.formatLines : [''];
  const lines: string[] = [
    `ID_CAMPO: ${record.fieldId}`,
    `CONTEXTO: Section: ${record.section}`,
    `NOME_CAMPO: ${record.fieldName}`,
    `FORMATO: ${format}`,
    ...moreFormat.map((line) => `  ${line}`),
  ];

  const roles: ['party_1', 'party_2'] = ['party_1', 'party_2'];
  roles.forEach((role, index) => {
    lines.push(
      `REGRAS_${options.blockLabels[index]}:`,
      `  Campo_BNPP: ${bnppLineForBlock(record, role)}`,
      `  Condition: ${record.condition}`,
      `  Error_Codes: [${record.errorCodes.join(', ')}]`,
      '  Status_por_Action_Type:',
      ...ACTION_TYPES.map((type) => `    ${type}: ${record.statusByActionType[type] ?? '?'}`),
    );
  });

  const others = namesWithRole(record, 'other');
  const hasPartyFields = record.bnppFields.some((field) => field.role !== 'other');
  if (others.length > 0 && hasPartyFields) {
    lines.push(`OUTROS_CAMPOS_BNPP: ${others.join(', ')}`);
  }
  lines.push(`REGULACAO: ${record.regulation}`, `FONTE: ${sourceLine(record)}`);

  return lines.join('\n');
}

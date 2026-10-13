import { describe, expect, it } from 'vitest';
import { convertFieldRules, renderChunk } from '../src';
import { ACTION_ROWS, MAPPING_ROWS, RULE_ROWS, actionSheet, mappingSheet, rulesSheet, standardSheets } from './fixtures';

const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code);

function field(result: ReturnType<typeof convertFieldRules>, fieldId: string) {
  const found = result.fields.find((entry) => entry.record.fieldId === fieldId);
  if (!found) throw new Error(`field ${fieldId} not converted`);
  return found;
}

describe('convertFieldRules', () => {
  it('converts the three sheets and builds Table.Item ids', () => {
    const result = convertFieldRules(standardSheets(), { documentVersion: '1.0', effectiveFrom: '2026-01-01' });
    expect(result.uploadIssues).toEqual([]);
    expect(result.fields.map((entry) => entry.record.fieldId)).toEqual(['9.1', '9.2', '9.3']);
    expect(field(result, '9.1').record.document).toEqual({ version: '1.0', effectiveFrom: '2026-01-01' });
  });

  it('joins rules and action types by Table + Item; dash differences in Section are not a mismatch', () => {
    const result = convertFieldRules(standardSheets());
    const first = field(result, '9.1');
    expect(codes(first.issues)).not.toContain('SECTION_MISMATCH');
    expect(first.record.statusByActionType).toEqual({ NEWT: 'C', MODI: 'C', VALU: 'NA', CORR: 'C', TERM: 'NA', EROR: 'NA', REVI: 'C', POSC: 'C' });
  });

  it('keeps condition wording, joins lines and removes bullets', () => {
    const result = convertFieldRules(standardSheets());
    expect(field(result, '9.1').record.condition).toBe(
      "1. If field 9.2 is populated with 'X', this field shall be populated. 2. Otherwise this field shall be left blank.",
    );
    expect(field(result, '9.2').record.condition).toBe('Shall contain one of the allowed values.');
  });

  it('turns numbered error codes into an array', () => {
    const result = convertFieldRules(standardSheets());
    expect(field(result, '9.1').record.errorCodes).toEqual(['EX-VR-9001-01', 'EX-VR-9001-02']);
  });

  it('keeps format lines as in the source', () => {
    const result = convertFieldRules(standardSheets());
    expect(field(result, '9.1').record.formatLines).toEqual(['Up to 10 alphanumeric characters', 'ISO 4217']);
  });

  it('classifies BNPP fields as party 1, party 2 or other, ignoring trailing commas and case in names', () => {
    const result = convertFieldRules(standardSheets());
    expect(field(result, '9.1').record.bnppFields).toEqual([
      { name: 'P1_EX_CODE', role: 'party_1' },
      { name: 'P2_EX_CODE', role: 'party_2' },
    ]);
    expect(field(result, '9.2').record.bnppFields).toEqual([{ name: 'X_EX_TYPE', role: 'other' }]);
    expect(field(result, '9.3').record.bnppFields.map((entry) => entry.role)).toEqual(['party_1', 'party_2', 'other']);
  });

  it('flags references to fields outside the file', () => {
    const result = convertFieldRules(standardSheets());
    expect(codes(field(result, '9.3').issues)).toContain('REFERENCE_OUTSIDE_FILE');
    expect(codes(field(result, '9.1').issues)).not.toContain('REFERENCE_OUTSIDE_FILE');
  });

  it('reports an action type row with empty Table and leaves the field without statuses', () => {
    const rows = ACTION_ROWS.map((row) => [...row]);
    rows[2] = ['', ...rows[2]!.slice(1)];
    const result = convertFieldRules([rulesSheet(RULE_ROWS), actionSheet(rows), mappingSheet(MAPPING_ROWS)]);
    expect(codes(result.uploadIssues)).toContain('MISSING_TABLE');
    expect(codes(field(result, '9.3').issues)).toContain('ACTION_TYPES_NOT_FOUND');
    expect(field(result, '9.3').record.statusByActionType.NEWT).toBeNull();
  });

  it('treats empty status cells as errors, never as NA', () => {
    const rows = ACTION_ROWS.map((row) => [...row]);
    rows[0]![4] = '';
    rows[0]![5] = 'Maybe';
    const result = convertFieldRules([rulesSheet(RULE_ROWS), actionSheet(rows), mappingSheet(MAPPING_ROWS)]);
    expect(codes(field(result, '9.1').issues)).toEqual(expect.arrayContaining(['EMPTY_STATUS', 'INVALID_STATUS']));
    expect(field(result, '9.1').record.statusByActionType.NEWT).toBeNull();
  });

  it('accepts status words and abbreviated headers', () => {
    const header = ['Table', 'Item', 'Section', 'Field', 'NEW', 'MOD', 'VALU', 'CORR', 'TERM', 'EROR', 'REV', 'POSC'];
    const rows = [['9', '1', 'Section 9a - Example information', 'Example code', 'Mandatory', 'Conditional', 'Not applicable', 'Optional', 'N/A', '-', 'M', 'C']];
    const result = convertFieldRules([rulesSheet(RULE_ROWS.slice(0, 1)), actionSheet(rows, header)]);
    expect(field(result, '9.1').record.statusByActionType).toEqual({ NEWT: 'M', MODI: 'C', VALU: 'NA', CORR: 'O', TERM: 'NA', EROR: 'NA', REVI: 'M', POSC: 'C' });
  });

  it('reports a missing POSC column on the upload and on each field', () => {
    const header = ['Table', 'Item', 'Section', 'Field', 'NEWT', 'MODI', 'VALU', 'CORR', 'TERM', 'EROR', 'REVI'];
    const rows = ACTION_ROWS.map((row) => row.slice(0, 11));
    const result = convertFieldRules([rulesSheet(RULE_ROWS), actionSheet(rows, header), mappingSheet(MAPPING_ROWS)]);
    expect(codes(result.uploadIssues)).toContain('MISSING_ACTION_TYPE_COLUMN');
    expect(codes(field(result, '9.1').issues)).toContain('STATUS_MISSING');
    expect(field(result, '9.1').record.statusByActionType.POSC).toBeNull();
  });

  it('flags duplicates, missing mappings and unused mappings', () => {
    const rules = [...RULE_ROWS, RULE_ROWS[0]!];
    const mapping = [...MAPPING_ROWS.slice(0, 2), ['Unknown DTCC field', 'P1_UNKNOWN, P2_UNKNOWN']];
    const result = convertFieldRules([rulesSheet(rules), actionSheet(ACTION_ROWS), mappingSheet(mapping)]);
    expect(codes(field(result, '9.1').issues)).toContain('DUPLICATE_FIELD_ID');
    expect(codes(field(result, '9.3').issues)).toContain('NO_BNPP_MAPPING');
    expect(codes(result.uploadIssues)).toContain('UNUSED_MAPPING');
  });

  it('warns when a party field has no counterpart', () => {
    const mapping = [['Example code', 'P1_EX_CODE'], ...MAPPING_ROWS.slice(1)];
    const result = convertFieldRules([rulesSheet(RULE_ROWS), actionSheet(ACTION_ROWS), mappingSheet(mapping)]);
    expect(codes(field(result, '9.1').issues)).toContain('PARTY_FIELD_UNPAIRED');
  });

  it('reports a section mismatch that is more than punctuation', () => {
    const rows = ACTION_ROWS.map((row) => [...row]);
    rows[1]![2] = 'Section 9z - Other section';
    const result = convertFieldRules([rulesSheet(RULE_ROWS), actionSheet(rows), mappingSheet(MAPPING_ROWS)]);
    expect(codes(field(result, '9.2').issues)).toContain('SECTION_MISMATCH');
  });

  it('fails clearly when no rules sheet is found', () => {
    const result = convertFieldRules([actionSheet(ACTION_ROWS)]);
    expect(result.fields).toEqual([]);
    expect(codes(result.uploadIssues)).toEqual(['NO_RULES_SHEET']);
  });

  it('reads rules and action types from the same sheet', () => {
    const header = [...['Table', 'Item', 'Section', 'Field', 'Format', 'Conditions', 'Error codes'], 'NEWT', 'MODI', 'VALU', 'CORR', 'TERM', 'EROR', 'REVI', 'POSC'];
    const rows = RULE_ROWS.map((row, index) => [...row, ...ACTION_ROWS[index]!.slice(4)]);
    const result = convertFieldRules([{ fileName: 'single.xlsx', sheetName: 'All', rows: [header, ...rows] }]);
    expect(field(result, '9.2').record.statusByActionType.NEWT).toBe('M');
    expect(codes(result.uploadIssues)).toEqual(['NO_MAPPING_SHEET']);
  });
});

describe('renderChunk', () => {
  it('renders both blocks with the BNPP field of each side', () => {
    const result = convertFieldRules(standardSheets(), { documentVersion: '1.0', effectiveFrom: '2026-01-01' });
    const chunk = renderChunk(field(result, '9.3').record, { blockLabels: ['LEG_1', 'LEG_2'] });
    expect(chunk).toContain('ID_CAMPO: 9.3');
    expect(chunk).toContain('CONTEXTO: Section: Section 9b - Example amounts');
    expect(chunk).toContain('REGRAS_LEG_1:\n  Campo_BNPP: P1_EX_AMOUNT_1');
    expect(chunk).toContain('REGRAS_LEG_2:\n  Campo_BNPP: P2_EX_AMOUNT_1');
    expect(chunk).toContain('OUTROS_CAMPOS_BNPP: Z_EX_AMOUNT_TOTAL');
    expect(chunk).toContain('Error_Codes: [EX-VR-9003-01]');
    expect(chunk).toContain('    POSC: O');
    expect(chunk).toContain('FONTE: example-rules.xlsx v1.0, vigente desde 2026-01-01');
  });

  it('uses configurable block labels and shows common fields in both blocks', () => {
    const result = convertFieldRules(standardSheets());
    const chunk = renderChunk(field(result, '9.2').record, { blockLabels: ['PARTE_1', 'PARTE_2'] });
    expect(chunk).toContain('REGRAS_PARTE_1:\n  Campo_BNPP: X_EX_TYPE (campo comum, sem campo por parte)');
    expect(chunk).toContain('REGRAS_PARTE_2:');
    expect(chunk).not.toContain('OUTROS_CAMPOS_BNPP');
  });

  it('shows unreadable statuses as ?', () => {
    const result = convertFieldRules([rulesSheet(RULE_ROWS)]);
    expect(renderChunk(field(result, '9.1').record)).toContain('    NEWT: ?');
  });
});

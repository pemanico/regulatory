import type { SheetData } from '../src';

/**
 * FICTITIOUS fixtures. Field ids, names, codes and BNPP field names are invented;
 * the layout mirrors the real spreadsheets (rules, action types, DTCC-to-BNPP mapping).
 */

export const RULES_HEADER = ['Table', 'Item', 'Section', 'Field', 'Format', 'Conditions', 'Error codes'];
export const ACTION_HEADER = ['Table', 'Item', 'Section', 'Field', 'NEWT', 'MODI', 'VALU', 'CORR', 'TERM', 'EROR', 'REVI', 'POSC'];
export const MAPPING_HEADER = ['DTCC Report', 'BNPP'];

export function rulesSheet(rows: string[][], header = RULES_HEADER): SheetData {
  return { fileName: 'example-rules.xlsx', sheetName: 'Rules', rows: [['Example title row'], header, ...rows] };
}

export function actionSheet(rows: string[][], header = ACTION_HEADER): SheetData {
  return { fileName: 'example-rules.xlsx', sheetName: 'ActionTypes', rows: [header, ...rows] };
}

export function mappingSheet(rows: string[][]): SheetData {
  return { fileName: 'example-mapping.xlsx', sheetName: 'Mapping', rows: [MAPPING_HEADER, ...rows] };
}

export const RULE_ROWS: string[][] = [
  [
    '9',
    '1',
    'Section 9a – Example information',
    'Example code',
    'Up to 10 alphanumeric characters\nISO 4217',
    '1. If field 9.2 is populated with \'X\', this field shall be populated.\n2. Otherwise this field shall be left blank.',
    '1. EX-VR-9001-01\n2. EX-VR-9001-02',
  ],
  ['9', '2', 'Section 9a - Example information', 'Example type', '4 alphabetical characters', '• Shall contain one of the allowed values.', '1. EX-VR-9002-01'],
  ['9', '3', 'Section 9b - Example amounts', 'Example amount 1', 'Up to 18 numeric characters', 'Refer to field 8.99.', '1. EX-VR-9003-01'],
];

export const ACTION_ROWS: string[][] = [
  ['9', '1', 'Section 9a - Example information', 'Example code', 'C', 'C', '-', 'C', '-', '-', 'C', 'C'],
  ['9', '2', 'Section 9a - Example information', 'Example type', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M'],
  ['9', '3', 'Section 9b - Example amounts', 'Example amount 1', 'C', '-', 'C', 'C', '-', '-', 'C', 'O'],
];

export const MAPPING_ROWS: string[][] = [
  ['Example code', 'P1_EX_CODE, P2_EX_CODE,'],
  ['example type', 'X_EX_TYPE'],
  ['Example amount 1', 'P1_EX_AMOUNT_1, P2_EX_AMOUNT_1, Z_EX_AMOUNT_TOTAL'],
];

export function standardSheets(): SheetData[] {
  return [rulesSheet(RULE_ROWS), actionSheet(ACTION_ROWS), mappingSheet(MAPPING_ROWS)];
}

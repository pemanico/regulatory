import { ACTION_TYPES, type ActionType } from '@regdata/contracts';
import { normalizeForCompare } from './text';

/** A worksheet as plain text cells. Reading the .xlsx is done by the caller. */
export interface SheetData {
  fileName: string;
  sheetName: string;
  rows: string[][];
}

export type SheetKind = 'rules' | 'actionTypes' | 'mapping';

export interface LocatedSheet {
  sheet: SheetData;
  kind: SheetKind;
  /** 0-based index of the header row. */
  headerRow: number;
  columns: Record<string, number>;
  actionTypeColumns: Partial<Record<ActionType, number>>;
}

const HEADER_SEARCH_ROWS = 15;

const RULES_HEADERS: Record<string, string[]> = {
  table: ['table'],
  item: ['item'],
  section: ['section'],
  field: ['field', 'field name'],
  format: ['format'],
  conditions: ['conditions', 'condition'],
  errorCodes: ['error codes', 'error code', 'error_codes'],
};

const KEY_HEADERS: Record<string, string[]> = {
  table: ['table'],
  item: ['item'],
  section: ['section'],
  field: ['field', 'field name'],
};

const MAPPING_HEADERS: Record<string, string[]> = {
  dtcc: ['dtcc report', 'dtcc', 'dtcc field'],
  bnpp: ['bnpp', 'bnpp field', 'bnpp fields'],
};

/** Optional mapping column with the concatenation Table.Item (e.g. "2.24"). */
const MAPPING_FIELD_ID_HEADERS = ['table.item', 'table item', 'tableitem', 'table+item', 'field_id', 'field id', 'id_campo', 'id campo']; // check-language: allow (accepted legacy header names)

const ACTION_TYPE_LONG_NAMES: Record<string, ActionType> = {
  NEW: 'NEWT',
  MODIFY: 'MODI',
  MODIFICATION: 'MODI',
  VALUATION: 'VALU',
  CORRECT: 'CORR',
  CORRECTION: 'CORR',
  TERMINATE: 'TERM',
  TERMINATION: 'TERM',
  ERROR: 'EROR',
  REVIVE: 'REVI',
  POSITIONCOMPONENT: 'POSC',
};

/** Maps a header such as "NEWT", "NEW", "Modify" or "POSC" to an action type. */
export function matchActionType(header: string): ActionType | null {
  const letters = header.toUpperCase().replace(/[^A-Z]/g, '');
  if (letters.length < 3) return null;
  const exactOrPrefix = ACTION_TYPES.find((code) => code === letters || code.startsWith(letters));
  return exactOrPrefix ?? ACTION_TYPE_LONG_NAMES[letters] ?? null;
}

function findColumns(header: string[], wanted: Record<string, string[]>): Record<string, number> | null {
  const normalized = header.map((cell) => normalizeForCompare(cell));
  const columns: Record<string, number> = {};
  for (const [key, synonyms] of Object.entries(wanted)) {
    const index = normalized.findIndex((cell) => synonyms.includes(cell));
    if (index < 0) return null;
    columns[key] = index;
  }
  return columns;
}

function findActionTypeColumns(header: string[]): Partial<Record<ActionType, number>> {
  const found: Partial<Record<ActionType, number>> = {};
  header.forEach((cell, index) => {
    const actionType = matchActionType(cell);
    if (actionType && found[actionType] === undefined) found[actionType] = index;
  });
  return found;
}

/**
 * Finds the rules, action type and mapping tables in the uploaded sheets by their headers.
 * A sheet can hold both the rules and the action type statuses (same header row).
 */
export function locateSheets(sheets: SheetData[]): LocatedSheet[] {
  const located: LocatedSheet[] = [];

  for (const sheet of sheets) {
    const searchRows = Math.min(HEADER_SEARCH_ROWS, sheet.rows.length);
    let foundRules = false;
    let foundActionTypes = false;
    let foundMapping = false;

    for (let rowIndex = 0; rowIndex < searchRows; rowIndex += 1) {
      const header = sheet.rows[rowIndex] ?? [];

      if (!foundRules) {
        const columns = findColumns(header, RULES_HEADERS);
        if (columns) {
          located.push({ sheet, kind: 'rules', headerRow: rowIndex, columns, actionTypeColumns: {} });
          foundRules = true;
        }
      }

      if (!foundActionTypes) {
        const columns = findColumns(header, KEY_HEADERS);
        const actionTypeColumns = findActionTypeColumns(header);
        if (columns && Object.keys(actionTypeColumns).length > 0) {
          located.push({ sheet, kind: 'actionTypes', headerRow: rowIndex, columns, actionTypeColumns });
          foundActionTypes = true;
        }
      }

      if (!foundMapping) {
        const columns = findColumns(header, MAPPING_HEADERS);
        if (columns) {
          const fieldIdColumn = header.findIndex((cellValue) => MAPPING_FIELD_ID_HEADERS.includes(normalizeForCompare(cellValue)));
          if (fieldIdColumn >= 0) columns.fieldId = fieldIdColumn;
          located.push({ sheet, kind: 'mapping', headerRow: rowIndex, columns, actionTypeColumns: {} });
          foundMapping = true;
        }
      }
    }
  }

  return located;
}

export function cell(row: string[] | undefined, index: number | undefined): string {
  if (!row || index === undefined) return '';
  return (row[index] ?? '').toString();
}

export function isEmptyRow(row: string[] | undefined): boolean {
  return !row || row.every((value) => (value ?? '').toString().trim() === '');
}

import type { SheetData } from '@regdata/field-rules';
import { Workbook } from 'exceljs';

/** Maximum rows read per worksheet; larger sheets are cut and reported by the converter. */
const MAX_ROWS = 10_001;
const MAX_COLUMNS = 60;

/** Reads every worksheet of an .xlsx file as plain text cells. */
export async function readWorkbook(fileName: string, data: Buffer): Promise<SheetData[]> {
  const workbook = new Workbook();
  await workbook.xlsx.load(data as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const sheets: SheetData[] = [];
  workbook.eachSheet((worksheet) => {
    const rows: string[][] = [];
    const rowCount = Math.min(worksheet.rowCount, MAX_ROWS);
    const columnCount = Math.min(worksheet.columnCount, MAX_COLUMNS);

    for (let rowNumber = 1; rowNumber <= rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const values: string[] = [];
      for (let column = 1; column <= columnCount; column += 1) {
        values.push(cellText(row.getCell(column)));
      }
      rows.push(values);
    }

    sheets.push({ fileName, sheetName: worksheet.name, rows });
  });
  return sheets;
}

function cellText(cell: { text?: unknown; value?: unknown }): string {
  try {
    const text = cell.text;
    if (typeof text === 'string') return text;
  } catch {
    // Fall back to the raw value below.
  }
  const value = cell.value;
  return value === null || value === undefined ? '' : String(value);
}

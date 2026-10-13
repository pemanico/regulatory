/** Text helpers. Normalisation is only used for comparisons, never for stored text. */

const DASHES = /[‐-―−﹘﹣－]/g;
const BULLET = /^\s*[•●▪◦‣∙·*-]\s+/;
const NUMBERED_LINE = /^\s*\d+\s*[.)]\s+/;

/** Comparison key: unified dashes, collapsed whitespace, lower case. */
export function normalizeForCompare(value: string): string {
  return value.normalize('NFKC').replace(DASHES, '-').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Key part for Table/Item: trims and turns "2.0" (numeric cells) into "2". */
export function normalizeKeyPart(value: string): string {
  const trimmed = value.trim();
  const numeric = /^(\d+)(?:\.0+)?$/.exec(trimmed);
  return numeric?.[1] ?? trimmed;
}

/** Splits a cell into non-empty trimmed lines. */
export function splitLines(value: string): string[] {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Joins a multi-line condition into one numbered paragraph.
 * Only formatting changes: bullets are removed and lines are joined; the wording is preserved.
 * Lines are numbered only when the source has several lines and no numbering at all.
 */
export function cleanCondition(raw: string): string {
  const lines = splitLines(raw).map((line) => line.replace(BULLET, '').trim()).filter(Boolean);
  if (lines.length === 0) return '';
  const alreadyNumbered = lines.some((line) => NUMBERED_LINE.test(line));
  const parts = lines.length > 1 && !alreadyNumbered ? lines.map((line, index) => `${index + 1}. ${line}`) : lines;
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Parses an error code cell such as "1. EMIR-VR-2017-01\n2. EMIR-VR-2017-02" into an array. */
export function parseErrorCodes(raw: string): string[] {
  const withoutNumbering = raw.replace(/(^|\s)\d+\s*[.)](?=\s|[A-Za-z])/g, ' ');
  const codes = withoutNumbering
    .split(/[\s,;]+/)
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
  return [...new Set(codes)];
}

export const ERROR_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

/** Field references in conditions, e.g. "field 2.13" -> "2.13". */
export function findFieldReferences(text: string): string[] {
  const references = new Set<string>();
  for (const match of text.matchAll(/\bfields?\s+(\d+)\.(\d+)\b/gi)) {
    references.add(`${match[1]}.${match[2]}`);
  }
  return [...references];
}

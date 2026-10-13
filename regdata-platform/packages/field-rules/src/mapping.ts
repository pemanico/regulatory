import type { BnppField } from '@regdata/contracts';

/** Party-prefixed field names, e.g. "XX1_NAME" / "XX2_NAME". Any letters are accepted unless a prefix is configured. */
const ANY_PARTY_FIELD = /^([A-Za-z]*?)([12])_(.+)$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Builds the party-field pattern; with a prefix (e.g. "AB") only "AB1_..." and "AB2_..." are party fields. */
export function partyFieldPattern(partyPrefix?: string | null): RegExp {
  const prefix = partyPrefix?.trim();
  if (!prefix) return ANY_PARTY_FIELD;
  return new RegExp(`^(${escapeRegExp(prefix)})([12])_(.+)$`, 'i');
}

/** Splits a BNPP mapping cell ("A, B, C," with possible trailing comma) into field names. */
export function splitBnppFields(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export interface ClassifiedFields {
  fields: BnppField[];
  /** Party fields with no counterpart for the other party. */
  unpaired: string[];
}

/**
 * Classifies BNPP fields as party 1, party 2 or other.
 * A field is a party field when its name is "<prefix>1_<rest>" or "<prefix>2_<rest>";
 * the prefix is any letters, or the configured one (case-insensitive).
 */
export function classifyBnppFields(names: string[], partyPrefix?: string | null): ClassifiedFields {
  const pattern = partyFieldPattern(partyPrefix);
  const parsed = names.map((name) => {
    const match = pattern.exec(name);
    return match
      ? { name, prefix: (match[1] ?? '').toUpperCase(), party: match[2], rest: match[3] ?? '' }
      : { name, prefix: '', party: null, rest: '' };
  });

  const fields: BnppField[] = parsed.map((entry) => ({
    name: entry.name,
    role: entry.party === '1' ? 'party_1' : entry.party === '2' ? 'party_2' : 'other',
  }));

  const unpaired = parsed
    .filter((entry) => entry.party !== null)
    .filter(
      (entry) =>
        !parsed.some(
          (other) => other.party !== null && other.party !== entry.party && other.prefix === entry.prefix && other.rest === entry.rest,
        ),
    )
    .map((entry) => entry.name);

  return { fields, unpaired };
}

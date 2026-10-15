import type { SemanticMart } from '../model';

/**
 * EMIR reconciliation breaks mart (docs/brain/marts/emir-recon-breaks.md).
 * One row per field in break of a matched position, per business date; a trade
 * can have several rows on the same day. Only breaks are stored.
 *
 * Column names are logical; real names are mapped in the local bindings file.
 */

/** Trade key: UTI and proprietary id together. Either can be empty. */
const TRADE_KEY = 'row(uti, proprietary_id)';

/** True when a party value is missing (string columns are trimmed, empty strings become NULL). */
const isBlank = (column: string) => `(${column} IS NULL)`;

export const EMIR_RECON_BREAKS: SemanticMart = {
  id: 'emir_recon_breaks',
  jurisdiction: 'EMIR',
  label: 'EMIR reconciliation breaks by field',
  businessNeed: 'Fields in break on matched positions, with the value reported by each party, per business date',
  owner: 'Regulatory reporting operations',
  partitionKey: 'business_date',
  maxPeriodDays: 366,
  columns: [
    { id: 'business_date', type: 'date', label: 'Business date', description: 'Processing date', dimension: true },
    { id: 'uti', type: 'string', label: 'UTI', description: 'Unique Trade Identifier', dimension: false },
    {
      id: 'proprietary_id',
      type: 'string',
      label: 'Proprietary id',
      description: 'Proprietary trade identifier; same business rules as the UTI',
      dimension: false,
    },
    {
      id: 'field_in_break',
      type: 'string',
      label: 'Field in break',
      description: 'Field whose party 1 and party 2 values differ',
      dimension: true,
    },
    { id: 'party_1_value', type: 'string', label: 'Party 1 value', description: 'Value reported by the bank', dimension: false },
    {
      id: 'party_2_value',
      type: 'string',
      label: 'Party 2 value',
      description: 'Value reported by the counterparty, as received from the trade repository',
      dimension: false,
    },
    {
      id: 'primary_asset_class',
      type: 'string',
      label: 'Primary asset class',
      description: 'Primary asset class of the trade',
      dimension: true,
    },
    {
      id: 'pairing_status',
      type: 'string',
      label: 'Pairing status',
      description: 'Pairing status from the trade repository',
      dimension: true,
    },
    {
      id: 'reconciliation_status',
      type: 'string',
      label: 'Reconciliation status',
      description: 'Reconciliation status from the trade repository',
      dimension: true,
    },
  ],
  metrics: [
    {
      id: 'breaks_count',
      label: 'Breaks',
      description: 'Number of fields in break (one per row: trade x field x business date)',
      status: 'draft',
      additive: true,
      version: '0.1.0',
      expression: 'COUNT(*)',
      uses: [],
    },
    {
      id: 'trades_with_breaks',
      label: 'Trades with breaks',
      description:
        'Distinct trades (UTI + proprietary id) with at least one field in break in the period; a trade with breaks on several days counts once',
      status: 'draft',
      additive: false,
      version: '0.1.0',
      expression: `COUNT(DISTINCT ${TRADE_KEY})`,
      uses: ['uti', 'proprietary_id'],
    },
    {
      id: 'one_sided_breaks',
      label: 'One-sided breaks',
      description: 'Breaks where exactly one of the two parties has no value',
      status: 'draft',
      additive: true,
      version: '0.1.0',
      expression: `COUNT(*) FILTER (WHERE ${isBlank('party_1_value')} <> ${isBlank('party_2_value')})`,
      uses: ['party_1_value', 'party_2_value'],
    },
  ],
};

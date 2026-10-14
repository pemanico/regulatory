import { MartDefSchema, type MartDefinition } from '@regdata/contracts';

/**
 * FICTITIOUS CATALOG for development.
 *
 * The ids, dimensions and metrics below are examples and do NOT match real
 * marts. They will be replaced by the real catalog (mart cards in Git) after
 * the discovery phase. Each entry is validated against the schema at startup.
 */
const RAW_FIXTURES: unknown[] = [
  {
    id: 'example_emir_validation',
    jurisdiction: 'EMIR',
    label: 'EMIR — validation results (example)',
    businessNeed: 'Track EMIR validation failures by category and source system',
    grain: 'row',
    partitionKey: 'business_date',
    owner: 'example-owner',
    maxPeriodDays: 400,
    dimensions: [
      { id: 'business_date', label: 'Business date', type: 'date' },
      { id: 'legal_entity', label: 'Legal entity', type: 'string' },
      { id: 'source_system', label: 'Source system', type: 'string' },
      { id: 'error_category', label: 'Error category', type: 'string' },
      { id: 'asset_class', label: 'Asset class', type: 'string' },
    ],
    metrics: [
      {
        id: 'error_count',
        label: 'Number of errors',
        description: 'Count of rows with a validation error',
        status: 'certified',
        additive: true,
        version: '1.0',
      },
      {
        id: 'error_rate',
        label: 'Error rate',
        description: 'Rows with an error / total rows',
        status: 'draft',
        additive: false,
        version: '0.1',
      },
    ],
  },
  {
    id: 'example_cftc_recon',
    jurisdiction: 'CFTC',
    label: 'CFTC — internal vs repository reconciliation (example)',
    businessNeed: 'Track CFTC reconciliation breaks',
    grain: 'row',
    partitionKey: 'business_date',
    owner: 'example-owner',
    maxPeriodDays: 400,
    dimensions: [
      { id: 'business_date', label: 'Business date', type: 'date' },
      { id: 'legal_entity', label: 'Legal entity', type: 'string' },
      { id: 'break_type', label: 'Break type', type: 'string' },
    ],
    metrics: [
      {
        id: 'break_count',
        label: 'Number of breaks',
        description: 'Count of rows with a break',
        status: 'certified',
        additive: true,
        version: '1.0',
      },
    ],
  },
];

export const CATALOG_FIXTURES: readonly MartDefinition[] = RAW_FIXTURES.map((raw) => MartDefSchema.parse(raw));

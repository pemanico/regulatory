import { MartDefSchema, type MartDefinition } from '@regdata/contracts';

/**
 * CATÁLOGO FICTÍCIO para desenvolvimento.
 *
 * Os ids, dimensões e métricas abaixo são exemplos e NÃO correspondem a marts
 * reais. Serão substituídos pelo catálogo real (fichas de mart em Git) depois
 * da fase de descoberta. Cada entrada é validada pelo schema no arranque.
 */
const RAW_FIXTURES: unknown[] = [
  {
    id: 'example_emir_validation',
    jurisdiction: 'EMIR',
    label: 'EMIR — resultados de validação (exemplo)',
    businessNeed: 'Acompanhar falhas de validação EMIR por categoria e sistema de origem',
    grain: 'row',
    partitionKey: 'business_date',
    owner: 'example-owner',
    maxPeriodDays: 400,
    dimensions: [
      { id: 'business_date', label: 'Business date', type: 'date' },
      { id: 'legal_entity', label: 'Entidade legal', type: 'string' },
      { id: 'source_system', label: 'Sistema de origem', type: 'string' },
      { id: 'error_category', label: 'Categoria de erro', type: 'string' },
      { id: 'asset_class', label: 'Asset class', type: 'string' },
    ],
    metrics: [
      {
        id: 'error_count',
        label: 'Número de erros',
        description: 'Contagem de linhas com erro de validação',
        status: 'certified',
        additive: true,
        version: '1.0',
      },
      {
        id: 'error_rate',
        label: 'Taxa de erro',
        description: 'Linhas com erro / total de linhas',
        status: 'draft',
        additive: false,
        version: '0.1',
      },
    ],
  },
  {
    id: 'example_cftc_recon',
    jurisdiction: 'CFTC',
    label: 'CFTC — reconciliação interna vs repositório (exemplo)',
    businessNeed: 'Acompanhar breaks de reconciliação CFTC',
    grain: 'row',
    partitionKey: 'business_date',
    owner: 'example-owner',
    maxPeriodDays: 400,
    dimensions: [
      { id: 'business_date', label: 'Business date', type: 'date' },
      { id: 'legal_entity', label: 'Entidade legal', type: 'string' },
      { id: 'break_type', label: 'Tipo de break', type: 'string' },
    ],
    metrics: [
      {
        id: 'break_count',
        label: 'Número de breaks',
        description: 'Contagem de linhas com break',
        status: 'certified',
        additive: true,
        version: '1.0',
      },
    ],
  },
];

export const CATALOG_FIXTURES: readonly MartDefinition[] = RAW_FIXTURES.map((raw) => MartDefSchema.parse(raw));

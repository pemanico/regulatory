# MART: emir-recon-breaks

> Nomes reais de colunas (autorizado pelo Ordep, 2026-10-15); **sem dados**. Modelo completo e ligações: [`../10-reconciliacao-emir.md`](../10-reconciliacao-emir.md). Cabeçalho completo transcrito da amostra de 2026-10-12 (segundo PDF, 52 colunas); pode ter erros de transcrição.

```yaml
mart_id: emir-recon-breaks          # id no código: emir_recon_breaks
jurisdiction: EMIR
label: Data Mart BNPP — breaks de reconciliação EMIR por campo
business_need: >
  Saber, por business date, que posições matched têm campos em break na
  reconciliação do trade repository, com o valor reportado pelo BNPP e pela
  contraparte. Responde em parte à necessidade de negócio (Ordep, 2026-10-15).
grain: posição matched × campo em break   # só breaks; vários breaks por UTI/PROPRIETARY
partition_key: BUSINESS_DATE
location: (ficheiro de bindings local)
format: csv hoje, parquet no futuro
produced_by:
  dag: PySpark/Airflow, sobre uma reconciliação prévia (só posições matched)
freshness: diária, por business date (dias úteis = segunda a sexta)
owner: (equipa, a indicar)
```

## Colunas

| Coluna real | Nome lógico no código | Significado | Papel |
| --- | --- | --- | --- |
| `BUSINESS_DATE` | `business_date` | Data de processamento (ISO na amostra) | partição / chave de ligação |
| `PROPRIETARY` | `proprietary_id` | Identificador proprietário; mesmas regras de negócio que o UTI | chave de ligação |
| `UTI` | `uti` | Unique Trade Identifier; pode vir vazio quando o trade só tem `PROPRIETARY` (visto na amostra) | chave de ligação |
| `BREAKING_FIELD` | `field_in_break` | Campo em break; preenchido sempre que TP1 ≠ TP2 | dimensão / ligação ao mapping |
| `BNPP_REPORTED` | `party_1_value` | Valor reportado pelo BNPP (= `TP1_<campo>` do recon status file) | atributo |
| `CPTY_REPORTED` | `party_2_value` | Valor reportado pela contraparte (= `TP2_<campo>`) | atributo |
| `REC_STAT_ID` | — | Id da linha de estado de reconciliação (repete-se nos vários breaks do mesmo trade) | chave técnica |
| `RCNCLTNRPT_ID`, `TXDTLS_ID`, `RPT_ID` | — | Ids do report e da transação no recon status file | chaves técnicas |
| `REFERENCE_DATE` | — | Data de referência do report | atributo |
| `REC_CATEGORY` | `rec_category` | Categoria da reconciliação | dimensão |
| `REPORTING_TYPE` | `reporting_type` | One-sided / two-sided | dimensão |
| `PAIRING` | `pairing_status` | Estado de pairing do trade repository | dimensão |
| `RECONCILIATION` | `reconciliation_status` | Estado de reconciliação do trade repository | dimensão |
| `VALUATION_RECONCILIATION` | `valuation_reconciliation_status` | Estado da reconciliação de valuation | dimensão |
| `REVIVED` | — | Trade revived | atributo |
| `FURTHER_MODIFICATION` | — | Further modification | atributo |
| `TOTAL_NUMBER_TRANSACTIONS`, `RPT` (transcrito assim; provavelmente `TOTAL_NUMBER_TRANSACTIONS_RPT`) | — | Totais do report | atributos |
| `REPORTING_COUNTERPARTY_LEI`, `OTHER_COUNTERPARTY_LEGAL_LEI`, `REPORT_SUBMITTING_ENTITY`, `ENTITY_RESP_FOR_REPORT` | — | LEIs das contrapartes e entidades (valores nunca no repositório) | atributos |
| `FILENAME` | — | Ficheiro de origem do trade repository | auditoria |
| `C_PRIMARY_ASSET_CLASS` | `primary_asset_class` | Classe de ativo principal | dimensão |
| `MATCHIG_MSK` | — | Chave de matching (nome tal como no ficheiro) | chave técnica |
| `TSR_BODY_ID`, `TSR_EXECUTION_TIMESTAMP`, `TSR_MATURITY_DATE_UNDERLYING`, `TSR_NOTIONAL_AMOUNT_LEG1`, `TSR_NOTIONAL_AMOUNT_LEG2`, `TSR_NOTIONAL_CURRENCY_1`, `TSR_NOTIONAL_CURRENCY_2`, `TSR_EXCHANGE_RATE_1`, `TSR_FORWARD_EXCHANGE_RATE` | — | Atributos do trade | atributos |
| `TSR_CONTRACT_TYPE` | `contract_type` | Tipo de contrato | dimensão |
| `BNPP_PORTFOLIO_ID`, `BNPP_BODY_ID`, `BNPP_REP_BEHALF_CODE_NAME`, `BNPP_EMIR_CLR_TSKLD_NAME`, `BNPP_EMIR_STATUS_NAME`, `BNPP_TRADE_NUMBER`, `BNPP_COUNTERPARTY_CRDS_CODE`, `BNPP_COUNTERPARTY_CRDS_CODE_BNPP_BUSINESS_LINE` | — | Atributos internos do trade e da contraparte | atributos |
| `BNPP_ACTIVITY_L1` … `BNPP_ACTIVITY_L4` | `activity_l1` … `activity_l4` | Hierarquia de atividade interna | dimensões |
| `RECONCILIATION_FLAG` | `reconciliation_flag` | Estado da posição na reconciliação prévia ("Matched") | dimensão |

## Métricas (código: `packages/query/src/marts/emir-recon-breaks.ts`)

| Id | Definição | Aditiva? | Estado |
| --- | --- | --- | --- |
| `breaks_count` | nº de linhas (posição × campo × dia) | sim | draft |
| `trades_with_breaks` | count distinct de (UTI, PROPRIETARY), vazio = NULL | não (distinct) | draft |
| `one_sided_breaks` | breaks com exatamente um dos lados vazio | sim | draft |

## Casos que usam este mart

- [CASO-001](../casos/CASO-001-explicar-break.md): perceber porque é que um campo está em break.

## Notas e armadilhas

- Corre sobre uma reconciliação prévia e só calcula breaks das posições matched. Sem taxas sobre o universo matched (fora do âmbito).
- Granularidade posição × campo: somar linhas conta breaks, não trades.
- Valores das partes guardados como texto: comparar números ou timestamps exige normalização (ex. `100` vs `100.0`; timestamps com e sem `Z`; exemplos fictícios).
- Breaks com um dos lados vazio.
- Na amostra, os valores de `BREAKING_FIELD` têm a forma do sufixo das colunas `TP1_`/`TP2_` (ex. `DELIVERY_TYPE`, `PRODUCT_CLASSIFICATION`), e há valores sem correspondência no mapping (`PRICE`, `PRICE_CCY`; o `BNPP_CCY` da primeira transcrição era `PRICE_CCY`) — questão #38.

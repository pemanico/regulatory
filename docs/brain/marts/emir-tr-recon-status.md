# MART: emir-tr-recon-status

> Fonte externa (ficheiro diário do trade repository, `recon_status_<yyyymmdd>`), não um mart produzido pelo banco. Nomes reais de colunas (autorizado pelo Ordep, 2026-10-15); **sem dados**. Cabeçalho transcrito da amostra de 2026-10-12 (PDF): pode ter erros de transcrição e colunas em falta. Modelo completo: [`../10-reconciliacao-emir.md`](../10-reconciliacao-emir.md).

```yaml
mart_id: emir-tr-recon-status
jurisdiction: EMIR
label: Recon status file do trade repository (DTCC)
business_need: >
  Estado de pairing e reconciliação de cada trade reportado, com o valor
  reportado por cada parte em cada campo reconciliado.
grain: um trade por business date (a confirmar)
partition_key: business_date
location: (binding local)
format: csv hoje, parquet no futuro
produced_by:
  dag: recebido do trade repository; carregado no data lake
freshness: diária
owner: (equipa, a indicar)
consumers: [emir-recon-breaks]
volume_per_month: (a indicar)
```

## Estrutura

| Grupo | Conteúdo (lógico) | Papel |
| --- | --- | --- |
| Identificação do report | ids do report e da transação, reference date, nome do ficheiro | chave / auditoria |
| Estados | categoria, tipo de reporting (one-/two-sided), pairing, reconciliação, reconciliação de valuation, revived, further modification | dimensões |
| Contrapartes | LEI da reporting counterparty, da outra contraparte, da entidade responsável | dimensões (dados sensíveis: nunca no repositório público) |
| Campos reconciliados | Pares de colunas `TP1_<campo>` / `TP2_<campo>`: valor reportado pela parte 1 e pela parte 2; algumas colunas com sufixo `_V` (aparentemente para a reconciliação de valuation, a confirmar) | atributos |
| Contexto | classe de ativo principal, business date | dimensão / partição |

## Notas e armadilhas

- Business date em `dd/mm/yyyy` no CSV; o mart de breaks usa ISO. Em Parquet, ambos devem ser `date`.
- Contém o UTI e o proprietary id (mesmas regras de negócio que o UTI): chave de ligação ao mart de breaks, com a business date. Os cabeçalhos transcritos nos PDF estavam incompletos.
- Pares TP1/TP2 com sufixos diferentes e colunas repetidas no cabeçalho (`10` §4.3): emparelhar sempre pela linha do mapping.
- É o denominador natural de "trades reconciliáveis" para os KPIs de taxa.

## Cabeçalho (amostra de 2026-10-12, 218 colunas transcritas)

Colunas gerais: `RCNCLTNRP_ID`, `TXDTLS_ID`, `RPT_REFERENCE_DATE`, `REC_CATEGORY`, `REPORTING_TYPE`, `PAIRING_RECONCILIATION`, `VALUATION_RECONCILIATION`, `REVIVED`, `FURTHER_MODIFICATION`, `TOTAL_NUMBER_TRANSACTIONS`, `TOTAL_NUMBER_TRANSACTIONS_RPT`, `REPORTING_COUNTERPARTY_LEI`, `OTHER_COUNTERPARTY_LEI`, `ENTITY_RESP_FOR_REPORT`, `FILENAME`, `C_PRIMARY_ASSET_CLASS`, `BUSINESS_DATE`.

UTI e PROPRIETARY vêm neste ficheiro (Ordep), mas não aparecem no cabeçalho transcrito: nas linhas há valores sem cabeçalho a seguir a `ENTITY_RESP_FOR_REPORT` (questão #43).

Colunas duplicadas no cabeçalho transcrito: `TP1_NTNL_AMT_LEG1_END_DATE`, `TP1_NTNL_AMT_LEG1_SCHED_AMT`, `TP1_NTNL_QTY_LEG1_END_DATE`, `TP1_NTNL_QTY_LEG1_SCHED_QTY`, `TP1_REFERENCE_ENTITY`, `TP2_NTNL_QTY_LEG2_END_DATE`, `TP2_PCKG_TRANS_PRICE`, `TP2_REFERENCE_ENTITY`, `TP2_SPREAD_LEG2`, `TP2_TOTAL_NOTIONAL_QTY_LEG2`.

Pares por campo (sufixo depois de `TP1_`/`TP2_`; ⚠ = par incompleto ou repetido, a confirmar no ficheiro original):

| Sufixo | Partes |
| --- | --- |
| `PRODUCT_CLASSIFICATION` | TP2, TP1 |
| `CONTRACT_TYPE` | TP1, TP2 |
| `ASSET_CLASS` | TP1, TP2 |
| `CONFIRMATION_TIMESTAMP` | TP1, TP2 |
| `CLEARING_OBLIGATION` | TP1, TP2 |
| `UNIQUE_PRODUCT_ID` | TP1, TP2 |
| `MASTER_AGREEMENT_TYPE` | TP1, TP2 |
| `MASTER_AGREEMENT_VRSN` | TP1, TP2 |
| `INTRAGROUP` | TP1, TP2 |
| `PTRR_TECHNIQUE` | TP1, TP2 |
| `SRCR_SERVICE_PROVIDER` | TP1, TP2 |
| `VENUE_OF_EXECUTION` | TP1, TP2 |
| `TOTAL_NOTIONAL_QTY_LEG1` | TP1 ⚠ |
| `TOTAL_NOTIONAL_QTY_LEG2` | TP2, TP2, TP2 ⚠ |
| `FIXED_RATE_LEG1_COUPON` | TP1 ⚠ |
| `FIXED_RATE_LEG2_COUPON` | TP2 ⚠ |
| `FIXED_RATE_LEG1_CONT_CONV` | TP1 ⚠ |
| `FIXED_RATE_LEG2_CONT_CONV` | TP2 ⚠ |
| `FIX_RT_LEG1_FREQ_PERI` | TP1 ⚠ |
| `FIX_RT_LEG1_FREQ_PERI_MULT` | TP1 ⚠ |
| `FIX_RT_LEG2_FREQ_PERI` | TP2 ⚠ |
| `FIX_RT_LEG2_FREQ_PERI_MULT` | TP2 ⚠ |
| `FLOAT_RATE_LEG1_IDENTIFIER` | TP1 ⚠ |
| `FLOAT_RATE_LEG2_IDENTIFIER` | TP2 ⚠ |
| `FLOAT_RATE_LEG1_IND` | TP1 ⚠ |
| `FLOAT_RATE_LEG2_IND` | TP2 ⚠ |
| `FLOAT_RT_LEG1_RESET_FRQ_PERI` | TP1 ⚠ |
| `FLOAT_RT_LEG1_RESET_FRQ_PERI_MULT` | TP1 ⚠ |
| `FLOAT_RT_LEG2_RESET_FRQ_PERI` | TP2 ⚠ |
| `FLOAT_RT_LEG2_RESET_FRQ_PERI_MULT` | TP2 ⚠ |
| `FLOAT_RT_LEG1_FREQ_PERI` | TP1 ⚠ |
| `FLOAT_RT_LEG1_FREQ_PERI_MULT` | TP1 ⚠ |
| `FLOAT_RT_LEG2_FREQ_PERI` | TP2 ⚠ |
| `FLOAT_RT_LEG2_FREQ_PERI_MULT` | TP2 ⚠ |
| `FLOAT_RT_LEG1_IND` | TP1 ⚠ |
| `FLOAT_RT_LEG2_IND` | TP2 ⚠ |
| `FLOAT_RT_LEG1_RATE_LEG_IND` | TP1 ⚠ |
| `FLOAT_RT_LEG2_RATE_LEG_IND` | TP2 ⚠ |
| `INDEX_FACTOR` | TP1 ⚠ |
| `LEVEL` | TP1, TP2 |
| `DRIV_CRYPTO_ASSETS` | TP1, TP2 |
| `SETTLEMENT_CCY_1` | TP1, TP2 |
| `SETTLEMENT_CCY_2` | TP1, TP2 |
| `TRACKING_NUMBER` | TP1 ⚠ |
| `RPT_TRACKING_NUMBER` | TP2 ⚠ |
| `PRIOR_UTI` | TP1, TP2 |
| `EXCHANGE_RATE1` | TP1 ⚠ |
| `EXCHANGE_RATE` | TP2 ⚠ |
| `FWD_EXCHANGE_RATE` | TP1, TP2 |
| `INTERCONNECTION_POINT` | TP1, TP2 |
| `LOAD_TYP` | TP1, TP2 |
| `OPTN_PREMIUM_PAYMT_DATE` | TP1 ⚠ |
| `SERIES` | TP1, TP2 |
| `VERSION` | TP1, TP2 |
| `VALUATION_METHOD` | TP1, TP2 |
| `DELTA` | TP1, TP2 |
| `NTNL_AMT_LEG1_EFFCT_DATE` | TP1, TP2 |
| `NTNL_AMT_LEG2_EFFCT_DATE` | TP2 ⚠ |
| `NTNL_QTY_LEG1_END_DATE` | TP1, TP1, TP1, TP2 ⚠ |
| `NTNL_QTY_LEG2_END_DATE` | TP2, TP2 ⚠ |
| `NTNL_AMT_LEG1_SCHED_AMT` | TP1, TP2, TP1 ⚠ |
| `NTNL_AMT_LEG2_SCHED_AMT` | TP2 ⚠ |
| `NTNL_QTY_LEG1_SCHED_QTY` | TP1, TP1, TP2 ⚠ |
| `NTNL_QTY_LEG2_SCHED_QTY` | TP2 ⚠ |
| `NTNL_AMT_LEG1_SCHED_END_DATE` | TP1 ⚠ |
| `NTNL_AMT_LEG2_SCHED_END_DATE` | TP2 ⚠ |
| `NTNL_QTY_LEG1_SCHED_END_DATE` | TP1 ⚠ |
| `NTNL_QTY_LEG2_SCHED_END_DATE` | TP2 ⚠ |
| `NTNL_AMT_LEG1_END_DATE` | TP1, TP2, TP1 ⚠ |
| `NTNL_AMT_LEG2_END_DATE` | TP2 ⚠ |
| `OTHER_PAYMENT_TYPE` | TP1, TP2 |
| `OTHER_PAYMENT_CCY` | TP1, TP2 |
| `OTHER_PAYMENT_PAYER` | TP1, TP2 |
| `OTHER_PAYMENT_RECEIVER` | TP1, TP2 |
| `DLVRY_INTV_START_TIME` | TP1, TP2 |
| `DLVRY_INTV_END_TIME` | TP1, TP2 |
| `DLVRY_POINT_ZONE` | TP1, TP2 |
| `UNADJ_EFFCT_DATE_STRIKE_PRICE` | TP1, TP2 |
| `UNADJ_END_DATE_STRIKE_PRICE` | TP1, TP2 |
| `EFFCT_DATE_STRIKE_PRICE` | TP1, TP2 |
| `END_DATE_STRIKE_PRICE` | TP1, TP2 |
| `SMD_AMT_CCY` | TP1, TP2 |
| `SCHD_AMT_CCY` | TP1, TP2 |
| `PRICE_TIME_INTV_QTY` | TP1, TP2 |
| `UNDRLY_IDENTIFICATION_TYPE` | TP1, TP2 |
| `CONFIRMED` | TP1, TP2 |
| `CLEARED` | TP1, TP2 |
| `REFERENCE_ENTITY` | TP1, TP2, TP1, TP2 ⚠ |
| `TRANCHE` | TP1, TP2 |
| `STRIKE_PRICE` | TP1, TP2 |
| `PCKG_TRANS_PRICE` | TP1, TP2, TP2 ⚠ |
| `SPREAD_LEG1` | TP1 ⚠ |
| `SPREAD_LEG2` | TP2, TP1, TP2 ⚠ |
| `NOTIONAL_AMT_LEG1_CCY` | TP1, TP2 |
| `NOTIONAL_AMT_LEG2_CCY` | TP1, TP2 |
| `VALUATION_CCY` | TP1, TP2 |
| `EXCHANGE_RATE_BASIS` | TP1, TP2 |
| `BASE_PRODUCT` | TP1, TP2 |
| `SUB_PRODUCT` | TP1, TP2 |
| `FURTHER_SUB_PRODUCT` | TP1, TP2 |
| `PCKG_TRANS_PRICE_CCY` | TP2 ⚠ |
| `PCKG_TRANS_PRICE_TYP` | TP2 ⚠ |
| `VALUATION_AMT` | TP2 ⚠ |
| `OTHER_PAYMENT_AMT_V` | TP1, TP2 |
| `OTHER_PAYMENT_CCY_V` | TP1, TP2 |
| `OTHER_PAYMENT_PAYER_V` | TP1, TP2 |
| `OTHER_PAYMENT_RECEIVER_V` | TP1, TP2 |
| `DLVRY_INTV_START_TIME_V` | TP1, TP2 |
| `DLVRY_INTV_END_TIME_V` | TP1, TP2 |
| `DLVRY_POINT_ZONE_V` | TP1, TP2 |
| `UNADJ_EFFCT_DATE_STRIKE_PRICE_V` | TP1, TP2 |
| `UNADJ_END_DATE_STRIKE_PRICE_V` | TP1, TP2 |
| `EFFCT_DATE_STRIKE_PRICE_V` | TP1, TP2 |
| `END_DATE_STRIKE_PRICE_V` | TP1, TP2 |
| `CCY_PRICE_TIME_INTV_QTY_V` | TP2 ⚠ |
| `PRICE_TIME_INTV_QTY_V` | TP1 ⚠ |
| `UNDRLY_IDENTIFICATION_TYPE_V` | TP2 ⚠ |
| `MASTER_AGREEMENT_VRSN_V` | TP2 ⚠ |
| `INDEX_FACTOR_V` | TP1, TP2 |

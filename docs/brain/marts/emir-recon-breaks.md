# MART: emir-recon-breaks

> Ficha **anonimizada**: nomes de colunas lógicos e inventados, sem valores reais. Nomes reais só no binding local do banco. Modelo completo e ligações: [`../10-reconciliacao-emir.md`](../10-reconciliacao-emir.md).

```yaml
mart_id: emir-recon-breaks
jurisdiction: EMIR
label: Breaks de reconciliação EMIR por campo
business_need: >
  Saber, por business date, que trades têm campos em break na reconciliação do
  trade repository, com o valor reportado pelo BNPP e pela contraparte.
  Responde em parte à necessidade de negócio (Ordep, 2026-10-15).
grain: trade × campo em break      # só breaks; um trade pode ter várias linhas no mesmo dia
partition_key: business_date
location: (binding local)
format: csv hoje, parquet no futuro
produced_by:
  dag: (PySpark/Airflow; nome real fora do repositório)
  rules: [ver 09-regras-validacao-campos.md]
freshness: diária, por business date
owner: (equipa, a indicar)
consumers: []
volume_per_month: (a indicar)
```

## Colunas (lógicas)

Só as colunas descritas pelo Ordep ou necessárias às ligações. O mart real tem também identificadores do report, estados do trade repository, atributos do trade (datas, notional, moeda, tipo de contrato) e hierarquia interna (atividade, linha de negócio).

| Coluna lógica | Tipo | Significado | Papel |
| --- | --- | --- | --- |
| `business_date` | date | Data de processamento | partição / chave de ligação |
| `uti` | string | Unique Trade Identifier | chave de ligação ao recon status file (UTI + proprietary id + business date) |
| `proprietary_id` | string | Identificador proprietário do trade; mesmas regras de negócio que o UTI | chave de ligação |
| `field_in_break` | string | Campo em break; preenchido sempre que o valor da parte 1 ≠ valor da parte 2 | dimensão / ligação ao mapping (`10` §4.1) |
| `party_1_value` | string | Valor reportado pelo BNPP (coluna `TP1_<campo>` do recon) | atributo |
| `party_2_value` | string | Valor reportado pela contraparte (coluna `TP2_<campo>` do recon) | atributo |
| `pairing_status` | string | Estado de pairing do trade repository | dimensão |
| `reconciliation_status` | string | Estado de reconciliação do trade repository | dimensão |
| `valuation_reconciliation_status` | string | Estado da reconciliação de valuation | dimensão |
| `primary_asset_class` | string | Classe de ativo principal | dimensão |
| `reconciliation_flag` | string | Estado da posição na reconciliação prévia; o mart só tem posições matched (`10` §4.4) | dimensão |

## Métricas derivadas (para a semantic layer)

Propostas em `10` §5, todas em `draft` até fechar #19 e as questões #38–#40.

| Id | Definição | Aditiva? | Estado |
| --- | --- | --- | --- |
| `breaks_count` | nº de linhas | sim | draft |
| `trades_with_breaks` | count distinct da chave do trade | não (distinct) | draft |

## Casos que usam este mart

- Exemplo prático de matching EMIR (`10-reconciliacao-emir.md`).
- [CASO-001](../casos/CASO-001-explicar-break.md): perceber porque é que um campo está em break.

## Notas e armadilhas

- Corre sobre uma reconciliação prévia e só calcula breaks das posições matched; aging em dias úteis (segunda a sexta). Sem taxas sobre o universo matched (fora do âmbito).

- Granularidade trade × campo: somar linhas conta breaks, não trades.
- Valores das partes guardados como texto: comparar números ou timestamps exige normalização (ex. `100` vs `100.0`; timestamps com e sem `Z`; exemplos fictícios).
- Breaks com um dos lados vazio.
- Na amostra, os valores de `field_in_break` parecem sufixos de colunas do trade repository, e alguns não existem no mapping (`10` §4.1).

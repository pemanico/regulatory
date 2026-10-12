# MART: id_do_mart

> Copiar para `<id_do_mart>.md` e atualizar a tabela em `docs/brain/README.md`.
> Nomes de colunas reais só com autorização; caso contrário, nomes alterados com os mesmos tipos.

```yaml
mart_id:
jurisdiction:            # EMIR | CFTC | MIFID_TR
label:
business_need:           # que necessidade de negócio responde
grain: row               # uma linha por caso
partition_key: business_date
location:                # ex. s3://.../  (ou caminho alterado)
format: parquet
produced_by:
  dag:
  rules: []              # ids de regra, quando existirem fichas
freshness:               # ex. diária após o fecho do DAG
owner:                   # equipa, não pessoa
consumers: []            # reports, dashboards, casos que o usam
volume_per_month:        # ordem de grandeza
```

## Colunas

| Coluna | Tipo | Significado | Papel |
| --- | --- | --- | --- |
| business_date | date | | partição / dimensão |
| | | | dimensão / medida / chave |

## Métricas derivadas (para a semantic layer)

| Id | Definição | Aditiva? | Estado |
| --- | --- | --- | --- |
| | | | draft |

## Casos que usam este mart

-

## Notas e armadilhas

- Ex.: registos duplicados por versão, colunas nulas em certos sistemas, diferenças entre jurisdições.

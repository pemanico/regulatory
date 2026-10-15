# MART: emir-tr-recon-status

> Fonte externa (ficheiro diário do trade repository), não um mart produzido pelo banco; ficha no mesmo formato porque é consultada da mesma forma. **Anonimizada**: nomes lógicos, sem valores reais. Modelo completo: [`../10-reconciliacao-emir.md`](../10-reconciliacao-emir.md).

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

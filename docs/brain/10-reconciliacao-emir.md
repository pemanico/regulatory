# Reconciliação EMIR: modelo de dados e ligações

Primeiro exemplo prático de matching EMIR (questão #20), apresentado pelo Ordep em 2026-10-15. Este ficheiro está no repositório **público**: nomes de colunas, valores e identificadores reais não entram aqui. Os nomes abaixo são **lógicos e inventados**; a correspondência com os nomes reais fica num binding local no banco (ver §6).

Fichas dos dois conjuntos de dados: [`marts/emir-recon-breaks.md`](marts/emir-recon-breaks.md) e [`marts/emir-tr-recon-status.md`](marts/emir-tr-recon-status.md).

## 1. Os cinco artefactos

| # | Artefacto | O que é | Formato hoje → futuro | Muda? |
| --- | --- | --- | --- | --- |
| A | Regras por campo | Uma linha por campo EMIR: Table, Item, Section, Field, Format, Conditions, Error codes | Excel | Não mudou (Ordep, 2026-10-15) |
| B | Estado por action type | Uma linha por campo: M/C/O/- por action type | Excel | Não mudou |
| C | Mapping campo ↔ colunas do trade repository | Nome do campo (= `Field` de A/B) ↔ colunas do recon status file, uma por parte (`TP1_<campo>`, `TP2_<campo>`) ou uma só coluna | Excel | Não mudou |
| D | Recon status file | Ficheiro diário do trade repository (DTCC) com o estado de pairing/reconciliação e, por campo, o valor de cada parte | CSV → Parquet | Dados diários |
| E | Mart de breaks (BNPP) | Resultado do PySpark/Airflow: **uma linha por campo em break** de cada trade, com o valor de cada parte e o nome do campo | CSV → Parquet | Dados diários |

O processamento é feito por **business date**; o ficheiro de regras (A/B) é o mesmo para todas as datas.

## 2. Ligações (definidas pelo Ordep)

```
A regras ──(Table.Item / Field)── B action types
   │
 Field name
   │
C mapping ──(colunas TP1_<x>, TP2_<x>)── D recon status file
   │                                         │
 campo em break                       UTI + proprietary id + business date
   │                                         │
E mart de breaks ────────────────────────────┘
```

| De | Para | Chave |
| --- | --- | --- |
| D recon status | C mapping | Nome da coluna do recon (`TP1_<x>` / `TP2_<x>`) ↔ coluna DTCC do mapping |
| C mapping | A/B regras e action types | Nome do campo (`Field`) — ou `Table.Item`, quando o mapping tiver a coluna |
| E mart | D recon status | UTI + proprietary id + business date |
| E mart | C mapping | Campo em break ↔ campo do mapping (ver §4.1: a forma exata ainda não está confirmada) |

## 3. Semântica do mart de breaks (Ordep)

- `party_1_value` (nome lógico): valor reportado pelo BNPP = valor da coluna `TP1_<campo>` do recon status file (ex. para o campo "Asset class", a coluna TP1 desse campo).
- `party_2_value`: valor reportado pela contraparte, tal como chega no ficheiro da DTCC = coluna `TP2_<campo>`.
- `field_in_break`: preenchido para **todos** os campos em que `TP1_<campo>` ≠ `TP2_<campo>`.
- Um trade (UTI / proprietary id) pode ter **vários breaks** → várias linhas no mesmo dia.

Consequência para os KPIs: o mart tem granularidade *trade × campo em break*. Contar linhas conta breaks, não trades; "% de trades com break" precisa de `count distinct` da chave do trade e de um denominador que só existe no recon status file (D).

## 4. O que a amostra mostra e ainda não bate certo

Observado nas amostras de 2026-10-12 (PDF transcritos a partir de CSV; alguns identificadores aparecem escritos de forma diferente entre ficheiros, por isso parte disto pode ser erro de transcrição).

### 4.1 Forma do nome do campo em break

Ordep (2026-10-15): o campo em break vem na coluna própria do mart; "Asset class" era só um exemplo de campo. Na amostra os valores têm a forma do **sufixo da coluna do trade repository** (maiúsculas com underscores, igual ao que vem depois de `TP1_`/`TP2_`), e há valores que não têm coluna correspondente no mapping nem no recon (um parece um campo interno do banco). Se for assim, a ligação E → C faz-se retirando o prefixo de parte às colunas do mapping, não pelo nome do campo, e os campos sem correspondência têm de ser contados e listados, não ignorados.

Proposta (não decidida): ligar o campo em break ao mapping pelas duas formas — nome do campo normalizado **ou** sufixo das colunas `TP1_`/`TP2_` da linha do mapping — e reportar os que não ligam a nenhuma. Funciona qualquer que seja a forma real, sem depender de mais esclarecimentos.

### 4.2 Chave de ligação E ↔ D

- Ordep (2026-10-15): o UTI e o proprietary id vêm no recon status file; o proprietary id segue as **mesmas regras de negócio que o UTI** (é tratado como identificador do trade). A ligação mart ↔ recon é UTI + proprietary id + business date. Os cabeçalhos transcritos nos PDF estavam incompletos (havia valores sem cabeçalho).
- A business date vem em formatos diferentes (`dd/mm/yyyy` no recon, ISO no mart). Em Parquet, ambas devem ser do tipo `date`; até lá, o join tem de normalizar.

### 4.3 Pares TP1/TP2 assimétricos

No mapping e no recon há pares em que o sufixo da parte 1 e da parte 2 não é igual (ex. um sufixo com uma palavra repetida; leg 1 da parte 1 emparelhada com leg 2 da parte 2; nomes de taxa de câmbio e de tracking number diferentes entre partes) e colunas repetidas no cabeçalho do recon. Se for real e não erro de transcrição: o par TP1/TP2 tem de vir **explicitamente da linha do mapping**, nunca de casar nomes por padrão. O conversor de regras já assinala estes casos (`PARTY_FIELD_UNPAIRED`).

### 4.4 Estado "matched" com breaks

Ordep (2026-10-15): **o mart só tem breaks.** Logo, um trade reconciliável que está no recon status file e não aparece no mart não tem campos em break nessa business date, e o denominador de qualquer taxa vem do recon status file.

Ordep (2026-10-15): o mart corre **sobre uma reconciliação feita antes** e só calcula os breaks das **posições matched** dessa reconciliação. A flag "Matched" é o estado da posição nessa reconciliação prévia; os breaks são diferenças campo a campo dentro de posições já matched. Não há contradição com o NREC do trade repository: são níveis diferentes (posição matched vs campos reconciliados).

Consequência: uma taxa de break teria de usar como denominador as posições matched da reconciliação prévia. Decisão do Ordep (2026-10-15): **fora do âmbito** — a plataforma trabalha só sobre os breaks; não há KPIs de taxa sobre o universo matched.

### 4.5 Breaks com um dos lados vazio

Há breaks em que um dos valores está vazio. Para os KPIs é útil separar "valores diferentes" de "campo não reportado por uma das partes"; a regra de action type (B) diz se o campo era obrigatório, condicional ou opcional para esse trade.

### 4.6 Action type do trade

Para ligar um break às regras de B (era obrigatório? era opcional?) seria preciso o action type do último report do trade. Ordep (2026-10-15): o action type não vem em nenhum dos ficheiros; **ignora-se por agora**. O estado M/C/O é mostrado para todos os action types, sem escolher um.

Proposta (não decidida): quando o estado é igual em todos os action types que levam o campo (os que não são `-`), mostrá-lo como estado efetivo; quando difere, indicar "depende do action type".

## 5. Uso principal (Ordep, 2026-10-15)

Os utilizadores olham para o mart, veem o break e vão ao ficheiro de regras de negócio para perceber o porquê do erro. Caso em [`casos/CASO-001-explicar-break.md`](casos/CASO-001-explicar-break.md). Os KPIs abaixo são secundários face a este uso.

## 5.1 KPIs candidatos (proposta, não decidido)

| Id | Definição proposta | Fonte | Depende de |
| --- | --- | --- | --- |
| `breaks_count` | Nº de linhas do mart (trade × campo) na business date | E | — |
| `trades_with_breaks` | Nº de trades distintos com ≥ 1 break | E | chave do trade (§4.2) |
| `breaks_by_field` | `breaks_count` por campo, com nome do campo e Table.Item via mapping | E + C + A | §4.1 |
| `breaks_by_asset_class` | `breaks_count` por classe de ativo | E | — |
| `one_sided_breaks` | Breaks com um dos lados vazio, por campo e estado M/C/O | E + B | §4.5, §4.6 |

Aging (dias em break) exige histórico de várias business dates; conta-se sempre em **dias úteis = segunda a sexta**, sem calendário de feriados (Ordep, 2026-10-15).

Fora do âmbito: taxas sobre o universo de posições matched (ex. % de posições com break). Os KPIs são contagens e distribuições de breaks.

## 6. Nomes reais e binding local

O código da plataforma usa os nomes lógicos (ex. `party_1_value`, `field_in_break`, `uti`, `proprietary_id`, `business_date`). No banco, um ficheiro de configuração local faz a correspondência nome lógico → coluna real e caminho do Parquet, ao mesmo nível do `.env`. Assim o repositório público não precisa dos nomes reais e o Ordep só edita configuração, não código. Implementado em 2026-10-15 (PR #16): `apps/api/query-bindings.json`, local, com `source` (Parquet ou CSV) e `columns` (nome lógico → nome real, formato de data opcional).

# Regras de validação por campo (EMIR) — conversão para o sistema

Estado: **implementado** (2026-10-13) — página web de upload e revisão, API e conversor (`regdata-platform/packages/field-rules`). Secção 1 = especificação do Ordep. Secções 2–6 = análise e propostas do Claude, aplicadas na implementação; os pontos ainda em aberto estão em `04-questoes-abertas.md`.

Contexto: regras de negócio de um controlo específico, reutilizáveis noutros controlos EMIR. A origem é um Excel com, por campo, a secção, o nome, o formato, as condições, os códigos de erro e, numa tabela separada, o estado por action type. O Excel não pode sair do banco.

## 1. Especificação (Ordep)

**Chave do campo (`ID_CAMPO`):** `Table.Item` para todos os campos (ex. Table 2 + Item 24 → `2.24`). Esclarecido pelo Ordep: o "2.24" da especificação original era um exemplo da concatenação, não uma exceção.

**Expansão por leg:** cada campo é expandido em dois blocos, `REGRAS_LEG_1` e `REGRAS_LEG_2`. Mesmo que o Excel só tenha um conjunto de regras ou estados, a estrutura é duplicada para as duas legs.

**Lookup relacional (action type):** "join" entre os dados do campo e a tabela de estados por action type, com chave composta `Table` + `Item` + `Section` + `Field`. Mapeamento estrito:

| Origem | Destino |
| --- | --- |
| Mandatory | M |
| Conditional | C |
| Optional | O |
| Not relevant / Not Applicable | NA |
| `-` (valor real na folha) | NA |

**Limpeza e densidade semântica:**
- Condições: sem bullet points; condições e notas em várias linhas passam a um único parágrafo coeso, numerado; preservar todas as referências cruzadas a campos (ex. "refer to field 1.1").
- Códigos de erro: lista limpa em array, ex. `[CODE-01, CODE-02]`.
- Formatos e taxonomias: manter tal como estão (ISO, NACE, EIC, etc.), porque são críticos para a pesquisa semântica.

**Template obrigatório:**

```
ID_CAMPO: [Table.Item]
CONTEXTO: Section: [Section Name]
NOME_CAMPO: [Field Name]
FORMATO: [Full Format/Taxonomy details]
REGRAS_LEG_1:
  Condition: [parágrafo coeso com regras e dependências]
  Error_Codes: [array de códigos]
  Status_por_Action_Type:
    NEWT: [M/C/O/NA]
    MODI: [M/C/O/NA]
    VALU: [M/C/O/NA]
    CORR: [M/C/O/NA]
    TERM: [M/C/O/NA]
    EROR: [M/C/O/NA]
    REVI: [M/C/O/NA]
    POSC: [M/C/O/NA]
REGRAS_LEG_2:
  Condition: [duplicado da leg 1]
  Error_Codes: [duplicado da leg 1]
  Status_por_Action_Type: [duplicado da leg 1]
```

## 1.1 Mapping DTCC ↔ BNPP (Ordep, 2026-10-13)

- Existe um mapping com uma coluna do lado **DTCC** (campo do trade repository) e uma coluna do lado **BNPP** (campo interno).
- Quando o campo tem **leg 1 e leg 2**, a coluna BNPP tem **dois campos** (um por leg) para o mesmo campo DTCC.
- Um controlo pode não usar todos os campos BNPP, mas o mapping tem de os ter todos em conta.

Consequência: a expansão por leg faz sentido **ao nível do mapping**. A regra do campo DTCC aplica-se a cada campo BNPP que lhe corresponde, e é aí que a leg 1 e a leg 2 se distinguem.

## 1.2 Estrutura observada nas fotos (2026-10-13)

Nomes de colunas BNPP **anonimizados** neste repositório (público). Os nomes reais ficam só no banco.

**Folha de regras por campo** (ficheiro interno de reconciliation status matching EMIR REFIT):

| Coluna | Conteúdo | Notas de parsing |
| --- | --- | --- |
| A `Table` | Número da tabela (1, 2…) | |
| B `Item` | Número do item (ex. 11, 17, 151) | `ID_CAMPO` = Table.Item (ex. 2.11) |
| C `Section` | Ex. "Section 2b - Contract information" | |
| D `Field` | Nome do campo | |
| E `Format` | Formato e valores permitidos, por vezes em várias linhas | Manter tal como está |
| F `Conditions` | Condições numeradas "1. … 2. …", em várias linhas | Juntar linhas, manter numeração e texto |
| G `Error codes` | Lista numerada "1. EMIR-VR-xxxx-xx 2. …" | Retirar a numeração → array |

O texto das condições e os códigos `EMIR-VR-…` correspondem às validation rules publicadas pela ESMA (a confirmar, questão #28). As colunas de estado por action type não aparecem nas fotos.

**Folha de mapping DTCC ↔ BNPP:**

| Coluna | Conteúdo |
| --- | --- |
| `DTCC Report` | Nome do campo no relatório da DTCC (ex. "Asset class", "Settlement currency 1") |
| `BNPP` | Um ou mais campos internos separados por vírgula, por vezes com vírgula final |

Padrões encontrados (nomes fictícios):

| Padrão | Exemplo fictício | Significado provável |
| --- | --- | --- |
| Um campo | `X_UTI` | Campo único, sem valor por parte |
| Dois campos com prefixo de parte | `P1_ISIN, P2_ISIN` | Valor reportado pela **parte 1** e pela **parte 2** |
| Três campos | `P1_ASSET_CLASS, P2_ASSET_CLASS, X_PRIMARY_ASSET_CLASS` | Duas partes + um campo adicional (derivado ou consolidado) |
| Campos numerados do lado DTCC | "Settlement currency 1" → `P1_SETTLEMENT_CCY_1, P2_SETTLEMENT_CCY_1` | O "1"/"2" do campo DTCC é do próprio campo; o prefixo é a parte |

**Coluna `Table.Item` no mapping:** o Ordep confirmou (2026-10-13) que o mapping pode ter a coluna `Table.Item`, concatenação de `Table` e `Item`. Quando existe, é a chave de ligação às regras; o nome do campo DTCC passa a verificação. Sem a coluna, o conversor liga pelo nome normalizado.

**Folha de estado por action type:**

| Coluna | Conteúdo |
| --- | --- |
| `Table`, `Item`, `Section`, `Field` | Mesma identificação da folha de regras |
| `NEWT`, `MODI`, `VALU`, `CORR`, `TERM`, `EROR`, `REVI` | Um valor por action type (obrigatórios) |
| `POSC` | Não é usado por agora (Ordep, 2026-10-13). Opcional: se faltar, não é erro e fica fora do chunk |

Valores encontrados: `M`, `C`, `O` e `-`. O `-` corresponde a não aplicável → `NA`. Os valores já vêm abreviados; o mapeamento por extenso (Mandatory, Conditional…) da especificação só é preciso se aparecerem noutras versões do ficheiro.

Problemas reais já visíveis na amostra (justificam §4.3 e §4.4):
- **Traço diferente na `Section`:** "Section 2b – Contract information" (travessão) e "Section 2f - Clearing" (hífen), na mesma folha. Um join por `Section` em texto falha com isto.
- **`Table` vazio** numa linha (item 131, "Currency of the price/time interval quantity"). Com join por `Table` + `Item`, este campo perde o estado sem erro. O conversor tem de o reportar.
- Os estados variam por action type no mesmo campo (ex. "Delta": NEWT `C`, MODI `-`, VALU `C`), por isso não há valores por defeito por campo.

## 2. O Excel é convertido no banco, por código, numa página web

Decisão do Ordep (2026-10-13): upload numa página web, com opção de o utilizador validar as regras.

- O conversor é **código genérico** (TypeScript, em inglês) dentro da aplicação, desenvolvido no repositório público e testado com dados fictícios.
- No banco, o utilizador carrega os Excel na página **Regras de validação**, vê os problemas de conversão, revê campo a campo (4-eyes) e exporta os aprovados.
- Campos com erros não podem ser aprovados: corrige-se o Excel e volta-se a carregar.
- Hoje a exportação (registos JSON e chunks Markdown) é a passagem para o RAG; a indexação automática no OpenSearch e a gravação no Git interno são o passo seguinte.
- As fotos servem só para mostrar a **estrutura** do Excel (cabeçalhos, algumas linhas, a tabela de action types), para escrever o parser e o mapeamento de colunas.
- Evita transcrever regras a partir de fotos: um único M/C/O mal lido é uma regra errada no sistema, sem ninguém dar por isso.

## 3. Proposta: duas saídas a partir da mesma fonte

Pelo princípio de `07-rag.md` §1 (o que tem resposta exata não é RAG):

| Saída | Formato | Para quê |
| --- | --- | --- |
| **Registo canónico** | Um YAML (ou linha CSV) por campo, com todos os atributos estruturados | Respostas exatas por tool determinística: "o campo X é obrigatório em MODI?" → `rules.get` |
| **Chunk para RAG** | Texto no template da secção 1, gerado a partir do registo canónico | Pesquisa semântica: "que campos usam códigos NACE?", "que regras referem o campo 1.1?" |

O chunk nunca é editado à mão: é sempre regenerado a partir do registo canónico, para não divergirem.

## 4. Pontos a rever na especificação

### 4.1 Duplicar todas as regras para as duas legs introduz informação falsa

> **Revisto após §1.2:** os dois campos BNPP por campo DTCC correspondem à **parte 1 e à parte 2** do trade (prefixos de trade party), não às legs do contrato. A duplicação pedida pelo Ordep está certa no conteúdo (a regra aplica-se às duas partes da reconciliação), mas o **nome** `LEG` colide com os campos que são mesmo por leg em EMIR REFIT (ex. "Settlement currency 1/2", e campos de notional e taxa por leg). Proposta: blocos `REGRAS_PARTE_1` / `REGRAS_PARTE_2` (ou `TP1`/`TP2`), um por campo BNPP de cada parte; campos adicionais (ex. o terceiro campo de asset class) num bloco próprio.
>
> Texto anterior, mantido para histórico: com o mapping DTCC ↔ BNPP, os blocos por leg ganham significado quando cada bloco aponta para o campo BNPP da respetiva leg. A proposta abaixo passa a ser: **blocos por leg gerados a partir do mapping**, um por campo BNPP mapeado; campos com um só campo BNPP têm um único bloco. Os argumentos seguintes mantêm-se para os campos sem legs.


- Muitos campos não são por leg (identificadores, contrapartes, datas de execução). Escrever `REGRAS_LEG_2` para eles afirma que existe uma leg 2 com regras, o que não é verdade. Um agente que recupere esse chunk vai repeti-lo.
- Os campos que são por leg costumam já existir como campos separados no próprio layout (ex. um campo para a leg 1 e outro para a leg 2). Duplicar cria uma terceira e quarta versão.
- Chunks quase idênticos ocupam o top-k da pesquisa e empurram resultados úteis para fora.
- **Legs não são lados da transação.** Leg 1 e leg 2 são as pernas de um contrato (ex. as duas pernas de um swap). Os dois lados da transação são as duas contrapartes. Se o objetivo é dizer que a regra vale para as duas contrapartes, a expansão por leg não diz isso.

Alternativa revista:
- campo DTCC com **dois** campos BNPP (leg 1 e leg 2) → dois blocos, `REGRAS_LEG_1` e `REGRAS_LEG_2`, cada um com o campo BNPP correspondente;
- campo DTCC com **um** campo BNPP → um único bloco `REGRAS`, com `LEGS: não aplicável`;
- campo DTCC sem correspondência BNPP → registado na mesma, com `MAPEAMENTO_BNPP: nenhum`, para ser visível que existe.

Cada campo BNPP tem `usado_no_controlo: sim/não` por controlo, para o mapping estar completo mesmo quando o controlo não usa o campo.

### 4.2 ~~A exceção do 2.24~~ — resolvido

Não há exceção: todos os campos usam `Table.Item`.

### 4.3a Ligação do mapping às regras — resolvido

O mapping tem a coluna `Table.Item` (concatenação de `Table` e `Item`). Implementado:

- cabeçalhos aceites: `Table.Item`, `Table Item`, `Table+Item`, `ID_CAMPO`, `Field id`; valor normalizado (espaços removidos, `+` → `.`);
- ligação pelo `Table.Item`; o nome DTCC é verificação (`MAPPING_NAME_MISMATCH`);
- se o `Table.Item` não ligar mas o nome ligar, usa a linha do nome e avisa (`MAPPING_ID_MISMATCH`);
- `Table.Item` repetido no mapping → `DUPLICATE_MAPPING`.

**Risco:** se a coluna estiver formatada como número no Excel, `2.10` é lido como `2.1` e colide com o campo 2.1. O conversor deteta-o pela verificação do nome e pelo id duplicado, mas a correção é formatar a coluna como **texto** no Excel.

Sem a coluna, o conversor liga por nome normalizado e lista os campos que não ligaram.

### 4.3 O join não deve depender de texto

Juntar por `Section` e `Field` (nomes) falha com uma diferença de espaços, maiúsculas ou um carácter. Um join falhado faz desaparecer o estado por action type desse campo, sem erro.

Proposta: join por `Table` + `Item`; `Section` e `Field` normalizados servem de **verificação**. Qualquer diferença é reportada, nunca ignorada.

### 4.4 Valores fora do mapeamento

O mapeamento tem de dizer o que fazer com células vazias, valores desconhecidos ou variantes ("Not relevant", "Not applicable", "N/A"). Proposta: vazio ou desconhecido → **erro de conversão**, nunca `NA` por defeito.

### 4.5 "Limpar" condições não pode mudar o significado

Juntar linhas num parágrafo numerado é formatação. Reescrever palavras é interpretação. Numa regra regulatória, "and" vs "or", "shall" vs "may", ou uma negação mudam a regra. Proposta: a conversão só muda a formatação (bullets → "(1) … (2) …", quebras de linha → espaço) e preserva o texto palavra a palavra. Feita por código, não por LLM.

### 4.6 Metadados em falta no template

Para citar e filtrar por vigência (`07-rag.md` §2), cada registo precisa também de: regulação (EMIR), versão do documento de origem, data de vigência, id do controlo que o usa, origem (`source_uri`). Sem versão, o sistema não sabe que regra estava em vigor numa data.

## 5. Verificações do conversor

- Número de campos à saída igual ao número de campos no Excel.
- Todos os campos com estado nos 7 action types obrigatórios (NEWT, MODI, VALU, CORR, TERM, EROR, REVI); `POSC` opcional enquanto não for usado (célula vazia ou inválida = aviso).
- Nenhum valor de estado fora de M/C/O/NA.
- Nenhum `ID_CAMPO` duplicado.
- Todas as referências cruzadas ("field 1.1") apontam para campos existentes.
- Diferenças entre `Section`/`Field` dos dois lados do join reportadas.
- Todos os campos das regras ligados ao mapping (lista dos que não ligaram); campos com valor por parte têm exatamente um campo BNPP para a parte 1 e um para a parte 2; campos adicionais classificados; nenhum campo BNPP mapeado para dois campos DTCC sem ser assinalado; vírgulas finais e espaços no mapping tratados.
- Relatório de conversão com contagens e erros; a conversão falha se houver erros.

## 6. Exemplo (fictício)

Registo canónico:

```yaml
id_campo: "9.99"
regulation: EMIR
source: { document: "example-validation-rules.xlsx", version: "0.0-example", effective_from: "2026-01-01" }
table: "9"
item: "99"
section: "Example section"
field_name: "Example field"
format: "ISO 4217 3-letter currency code"
applies_to: { counterparties: both }
dtcc_field_name: "Example field"
bnpp_mapping:                      # fictitious internal field names
  - { bnpp_field: "P1_EX_FIELD", role: party_1, used_in_controls: [example-control] }
  - { bnpp_field: "P2_EX_FIELD", role: party_2, used_in_controls: [example-control] }
  - { bnpp_field: "X_EX_FIELD",  role: other,   used_in_controls: [] }   # mapped, not used by this control
condition: "(1) Populated when field 9.98 is populated. (2) Refer to field 1.1."
error_codes: [EX-001, EX-002]
status_by_action_type: { NEWT: M, MODI: M, VALU: NA, CORR: M, TERM: NA, EROR: NA, REVI: C, POSC: M }
used_by_controls: [example-control]
```

Chunk para RAG gerado (template da secção 1, com a alternativa de 4.1):

```
ID_CAMPO: 9.99
CONTEXTO: Section: Example section
NOME_CAMPO: Example field
FORMATO: ISO 4217 3-letter currency code
APLICA_A: ambas as contrapartes
REGRAS_PARTE_1:
  Campo_BNPP: P1_EX_FIELD (usado no controlo example-control)
  Condition: (1) Populated when field 9.98 is populated. (2) Refer to field 1.1.
  Error_Codes: [EX-001, EX-002]
  Status_por_Action_Type:
    NEWT: M
    MODI: M
    VALU: NA
    CORR: M
    TERM: NA
    EROR: NA
    REVI: C
    POSC: M
REGRAS_PARTE_2:
  Campo_BNPP: P2_EX_FIELD (usado no controlo example-control)
  Condition: (1) Populated when field 9.98 is populated. (2) Refer to field 1.1.
  Error_Codes: [EX-001, EX-002]
  Status_por_Action_Type:
    NEWT: M
    MODI: M
    VALU: NA
    CORR: M
    TERM: NA
    EROR: NA
    REVI: C
    POSC: M
OUTROS_CAMPOS_BNPP: X_EX_FIELD (mapeado; não usado neste controlo)
FONTE: example-validation-rules.xlsx v0.0-example (vigente desde 2026-01-01)
```

# RAG e Agentic RAG

Desenho do conhecimento que o agente consulta: o que entra no RAG, o que não entra, como é guardado no OpenSearch, como é ingerido (código PySpark e documentação em Word, Excel, CSV e PDF) e como o agente o usa.

Estado: secções 1–5 vêm do *Architecture Design* (acordado). Secção 6: princípio decidido pelo Ordep (documentação convertida para texto em Git); formatos, estrutura e ferramentas são proposta a validar.

## 1. Princípio: RAG só para o que é texto

O RAG serve para conhecimento não estruturado: explicar, contextualizar, citar. Tudo o que tem estrutura e uma resposta exata vai para tabelas ou para o registry, e é consultado por tools determinísticas.

| Tipo de conhecimento | Onde vive | Como o agente chega lá |
| --- | --- | --- |
| Specs funcionais, runbooks, post-mortems | OpenSearch (RAG) | `docs.search` |
| Texto regulatório (RTS/ITS EMIR Refit, CFTC Parts 43/45, RTS 22 MiFIR) | OpenSearch (RAG) | `docs.search` |
| Fichas de regra (lógica em linguagem simples) | Registry em Git + OpenSearch | `rules.get` (verdade) + `docs.search` (contexto) |
| Código PySpark (ao nível da função) | OpenSearch, ligado ao `rule_id` | `docs.search`, sempre via ficha |
| Fichas de mart | Registry em Git + OpenSearch | `catalog.get` + `docs.search` |
| Definições de categorias de erro | Registry + OpenSearch | `category.get` + `docs.search` |
| Validation rules ESMA / CFTC | **Tabelas**, não RAG | `rules.get` / query tipada |
| Mapeamentos de campos | **Tabelas**, não RAG | query tipada |
| Definições de métricas | **Semantic layer**, não RAG | `metrics.query` / `metrics.explain` |
| Versões em vigor de regras | **Registry**, não RAG | `rules.get(as_of)` |
| Dados dos marts | **Semantic layer / Trino**, nunca RAG | `metrics.query` |

Regra prática: se a pergunta tem uma resposta exata e verificável ("qual a versão em vigor", "qual o valor do campo X"), não é RAG.

## 2. OpenSearch: desenho do índice

- **Pesquisa híbrida:** BM25 + kNN, com reranker por cima. Em texto regulatório e código, o BM25 ganha muitas vezes ("field 2.41", "Article 9", nome de função).
- **Chunking estrutural**, nunca por tamanho fixo:

| Fonte | Unidade de chunk |
| --- | --- |
| Texto regulatório | Artigo / campo / secção |
| Specs em Word ou PDF | Secção por títulos; tabelas inteiras num chunk |
| Código PySpark | Função ou regra |
| Fichas (regra, mart, categoria) | Ficha inteira |
| Runbooks, post-mortems | Secção |

- **Metadata obrigatória em cada chunk:**

```yaml
doc_id:
source_uri:          # caminho/URL de origem
doc_type:            # spec | regulation | runbook | postmortem | rule_card | mart_card | code | category
jurisdiction:        # EMIR | CFTC | MIFID_TR | ALL
version:
effective_from:
effective_to:
owner:
acl_groups: []       # grupos que podem ver
content_hash:        # deteta duplicados e alterações
ingested_at:
links:               # rule_id, mart_id, metric_id, commit
```

- **Filtro de ACL aplicado na query**, nunca depois: o utilizador só recupera chunks dos grupos e jurisdições a que tem acesso.
- **Filtro de vigência por defeito** (versão atual); `as_of` explícito para perguntas históricas.
- **Reindexação** automática em cada merge no Git (fichas, código) e por sensor no Airflow para documentação.

## 3. Ingestão do código PySpark

1. **Parsing estrutural (AST)** dos jobs: funções, transformações, colunas de entrada e saída, tabelas lidas e escritas.
2. **Geração de fichas de regra por LLM** a partir de cada função: o que faz, inputs, outputs, lógica em linguagem simples.
3. **Revisão humana obrigatória.** Só depois de revista a ficha passa a oficial no registry.
4. **Indexação** da ficha e do código, com versão, commit e ligação ao lineage (OpenLineage) e às métricas que a usam.
5. **Reindexação em cada merge**, via CI.

Medir a taxa de fichas corrigidas pelos revisores. Se for alta, o problema está no código ou na documentação e o agente não o vai resolver.

## 4. Fluxo Agentic RAG (adaptado do padrão RAG vs Agentic RAG)

```
1. Pergunta (via AI Gateway: auth, quotas, audit)
2. Rewrite + extração de intent (modelo pequeno)
   ├─ Fast path: pedido simples de métrica/vista → semantic layer → verificação → resposta
   └─ Caminho agentic:
3–4. Precisa de mais contexto?  Não → LLM responde com o que tem
5. Que fonte? (tools tipadas, filtradas pelo RBAC do utilizador)
     - semantic layer: métricas e deltas
     - registry: regras, categorias, versões
     - OpenSearch: specs e documentação
     - templates ClickHouse/Trino: drill-through
6–7. Contexto recuperado, com ids de evidência
8. LLM redige a partir da evidência (não calcula números)
9–10. Verificação:
     - determinística: cada número existe nos resultados das tools; regras citadas com id e versão; docs citados por documento e secção
     - LLM-judge: a resposta responde à pergunta?
     Falha e passos < limite → volta ao 2
     Falha no limite → resposta parcial + o que falta
11. Resposta final com painel de evidência
```

Diferenças face ao padrão genérico da imagem de referência:

| Padrão genérico | Neste projeto | Porquê |
| --- | --- | --- |
| Internet como fonte | Fora | Fuga de dados, fontes sem confiança |
| Tudo passa pelo loop | Fast path antes | A maioria dos pedidos é "mostra X por Y" |
| "A resposta é relevante?" só por LLM | + validação determinística | O modelo que errou tende a aprovar o próprio erro |
| Loop livre | Máximo 2–3 iterações, limite de queries e tokens | Custo e latência |

## 5. Anti-alucinação

- Números só vindos de outputs de tools; o validator bloqueia números sem origem.
- Regras citadas com `rule_id@version`; documentação com documento, secção e versão.
- "Não tenho evidência" é uma resposta válida.
- Golden set de perguntas por regime, com respostas validadas por especialistas, como gate no CI de prompts e modelos.

## 6. Documentação como código: Word, Excel, CSV e PDF convertidos para texto em Git

**Decisão do Ordep (2026-10-12):** toda a documentação (hoje em Word, Excel, PDF e CSV) é convertida para ficheiros de texto e versionada em Git, para que cada alteração seja visível para agentes e intervenientes. O PDF deixa de ser formato de trabalho: é caro de processar e opaco a diffs.

Consequência: o Git passa a ser a **fonte de verdade da documentação**, e o RAG indexa a partir do Git, não dos ficheiros originais. Um só formato de entrada, histórico de alterações nativo, revisão por PR e reindexação em cada merge.

### Formatos de destino

| Origem | Contém | Destino em Git |
| --- | --- | --- |
| Word (.docx) | Spec funcional, runbook, procedimento | Markdown com front matter (documento funcional) |
| PDF digital | Spec, documentação interna | Markdown com front matter; original arquivado fora do Git |
| PDF digitalizado | Idem | OCR → Markdown, marcado `conversion_quality: low` até revisão humana |
| PDF regulatório externo (ESMA, CFTC) | Texto oficial | Markdown só de leitura em `regulation/`, com link à fonte oficial |
| Excel, folha de referência | Mapeamentos, listas de regras, catálogos | CSV + `*.schema.yaml` (colunas, tipos, chave) |
| Excel, folha de cálculo/pivot | Definição de KPI ou report | YAML de definição de métrica/report (fórmulas, filtros, dimensões extraídos) → candidato à semantic layer |
| Excel, folha de dados | Linhas de negócio | **Rejeitada**: os dados vêm dos marts |
| CSV | Tabela de referência | CSV + `*.schema.yaml` |

Os originais binários **não** entram no Git (nem LFS): ficam arquivados no repositório documental atual, referenciados por `source_original` no front matter.

### Documento funcional (formato Markdown)

```markdown
---
doc_id: SPEC-EMIR-0012            # estável, nunca reutilizado
title:
doc_type: functional_spec         # functional_spec | runbook | procedure | reference | regulation
jurisdiction: EMIR                # EMIR | CFTC | MIFID_TR | ALL
owner:                            # equipa, não pessoa
status: draft                     # draft | in_review | approved | deprecated
version: 1.0
effective_from:
effective_to:
related:
  rules: []                       # rule_id
  marts: []                       # mart_id
  metrics: []                     # metric_id
source_original:                  # caminho do Word/PDF de origem
conversion_quality: high          # high | low (OCR, tabelas complexas)
---

# Título

## Objetivo
## Âmbito
## Regras de negócio
## Dados (fontes, campos, marts)
## Controlos e exceções
## Histórico de alterações relevantes
```

### Estrutura proposta do repositório de conhecimento

```
knowledge/
  specs/<jurisdição>/        documentos funcionais (.md)
  runbooks/                  procedimentos operacionais (.md)
  reference/<jurisdição>/    tabelas de referência (.csv + .schema.yaml)
  kpis/<jurisdição>/         definições extraídas dos Excels (.yaml), estado draft até validação
  regulation/<jurisdição>/   texto regulatório externo (.md, só leitura)
  rules/                     fichas de regra (geradas do PySpark, revistas)
  marts/                     fichas de mart
```

### Conversão (uma vez por documento, depois edita-se o Markdown)

| Origem | Ferramenta candidata | Notas |
| --- | --- | --- |
| Word | pandoc (docx → Markdown GFM) | Preserva títulos, listas e tabelas simples; tabelas com células fundidas exigem revisão |
| PDF digital | extração de texto com estrutura (ex. pdfplumber / marker) | Tabelas e layouts complexos perdem estrutura; revisão humana obrigatória |
| PDF digitalizado | OCR | Último recurso |
| Excel | script Python (openpyxl): classificar folhas, exportar CSV, extrair fórmulas e definições de pivot | O LLM pode propor a classificação e a definição de métrica; humano valida |
| CSV | validação de schema | Já é texto |

O LLM ajuda na conversão (classificar folhas, propor front matter, limpar tabelas), mas cada documento convertido passa por PR e revisão do owner antes de `status: approved`.

### CI do repositório de conhecimento

- Front matter válido e completo (owner, versão, jurisdição obrigatórios).
- CSV conforme o `*.schema.yaml`.
- Deteção de dados sensíveis (identificadores de clientes, LEIs, nomes) bloqueia o merge.
- Links internos (`related`) apontam para ids existentes.
- Lint de Markdown.
- Em cada merge: reindexação no OpenSearch e registo de `change_event` (alimenta "o que mudou na regra X desde junho?").

### Riscos

- **Duas fontes de verdade:** se as pessoas continuarem a editar o Word depois da conversão, o Git fica desatualizado. Após migrar um documento, o Word original é congelado e passa a só leitura.
- **Barreira à edição:** decidido que a edição é feita pelo módulo Admin em React, que abre PRs no Git interno por baixo. Até o Admin existir, a edição fica restrita a quem usa Git, para não reabrir o Word.
- **Qualidade da conversão:** PDFs e tabelas complexas perdem estrutura; `conversion_quality: low` até revisão.
- **Onde vive o repositório:** o repositório de conhecimento vive só no Git interno do banco. No repositório público desenvolvem-se apenas as ferramentas de conversão e o CI, testados com ficheiros fictícios; correm dentro do banco sobre os documentos reais.

## 7. Questões abertas do RAG

Ver `04-questoes-abertas.md` (#12, #13, #15, #16).

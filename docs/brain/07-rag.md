# RAG e Agentic RAG

Desenho do conhecimento que o agente consulta: o que entra no RAG, o que não entra, como é guardado no OpenSearch, como é ingerido (código PySpark e documentação em Word, Excel, CSV e PDF) e como o agente o usa.

Estado: secções 1–5 e 7 vêm do *Architecture Design* (acordado). A secção 6 (ingestão de Word, Excel e CSV) é **proposta**, a confirmar pelo Ordep.

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

## 6. Ingestão de documentação: Word, Excel, CSV e PDF (proposta)

Os formatos não são iguais e não podem ir todos para o RAG da mesma forma. O erro mais comum é indexar Excels e CSVs como texto: o agente passa a "ler" tabelas em pedaços e a responder números errados.

### Primeiro passo: classificar cada ficheiro pelo que contém, não pela extensão

| Conteúdo | Exemplo | Destino |
| --- | --- | --- |
| Texto explicativo | Spec funcional em Word, runbook | RAG |
| Tabela de referência | Mapeamento de campos, lista de validation rules, catálogo de controlos em Excel/CSV | Tabela no registry + ficha descritiva no RAG |
| Definição de KPI / report | Excel dos operacionais com pivots e fórmulas | **Fase de descoberta**: candidatos a métricas da semantic layer, não RAG |
| Dados (linhas de trades, extrações) | Excel/CSV com dados de negócio | **Não entra.** Os dados vêm dos marts |

### Word (.docx) e PDF

- Extração preservando estrutura: títulos, listas, tabelas.
- Chunk por secção (heading); tabelas inteiras num chunk, convertidas para Markdown.
- Metadata do documento: versão, data, owner, jurisdição.
- PDFs digitalizados: OCR só se não houver versão digital; marcar baixa confiança.

### Excel (.xlsx)

- Detetar o tipo de cada folha: tabela de referência, definição de cálculo, ou dados.
- **Tabelas de referência** → carregadas como tabela versionada (com schema), consultada por tool; no RAG entra só uma ficha a descrever o que a tabela contém e quando usar.
- **Folhas com pivots e fórmulas** → extrair fórmulas, campos do pivot, filtros e colunas usadas; o LLM propõe definições de métricas; um humano valida antes de entrarem na semantic layer.
- **Folhas de dados** → rejeitadas na ingestão, com aviso.
- Células com comentários ou notas explicativas → podem ir para o RAG como texto.

### CSV

- Sem estrutura de documento: tratado sempre como tabela.
- Validar schema, tipos e chave; carregar como tabela versionada.
- No RAG, apenas a ficha descritiva da tabela.

### Controlos comuns a todos os formatos

- **Deteção de dados sensíveis antes de indexar** (identificadores de clientes, LEIs, nomes): bloquear ou mascarar.
- **Deduplicação** por `content_hash`; uma versão nova substitui a anterior, a anterior fica com `effective_to`.
- **Owner obrigatório** por documento; sem owner não entra.
- **Origem rastreável** (`source_uri`), para a resposta poder citar e o utilizador abrir o original.

## 7. Questões abertas do RAG

Ver `04-questoes-abertas.md` (#11–#14).

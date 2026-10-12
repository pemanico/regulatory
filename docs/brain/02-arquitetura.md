# Arquitetura acordada

Documento completo: *Regulatory Data Analytics Platform — Architecture Design* (Claude Docs e PDF no Project "Agentic Rag").

## Princípio

LLM interpreta → sistemas determinísticos executam → sistemas de dados calculam → RAG dá conhecimento → agentes orquestram → humanos validam quando necessário.

O LLM nunca é fonte de verdade, nunca calcula números e nunca escreve SQL no caminho principal.

## Camadas

```
React (Ask, Pivot, Reports, Admin)
  → NestJS (API, auth, AI gateway, orquestrador, tools, audit)
    → Semantic layer (Cube): métricas certificadas
      → Trino → data marts S3 Parquet      (ClickHouse opcional, ADR-001)
    → Conhecimento: catálogo de marts, fichas de regra, OpenSearch, lineage
    → Airflow: jobs allowlisted
```

## Agentes

Um orquestrador com agentes especializados; nenhum agente fala diretamente com outro.

| Agente | Faz |
| --- | --- |
| Router | Lê o prompt e escolhe o caminho |
| Metrics | Prompt → spec de vista validada contra a semantic layer |
| Report | Prompt → spec de report, aprovada por humano |
| Knowledge | Responde sobre regras e código, com citação de ficha, versão e commit |
| Explain | Narra a decomposição determinística de um delta |

Fluxo Agentic RAG adaptado: rewrite → fast path para pedidos simples → escolha de fonte (tools internas, nunca internet) → retrieval → LLM redige → verificação determinística (números existem nos resultados, citações presentes) → máximo 2–3 iterações.

**Primeiro caso de uso — EMIR Matching:** Director (orquestrador, sem RAG) e agentes Retriever, Matching, KPI, Análise EMIR e Tabelas; ver [`08-agentes-emir-matching.md`](08-agentes-emir-matching.md). Este desenho substitui, para este caso, a lista genérica de agentes acima.

**Desenho completo do RAG** (o que entra e o que não entra, OpenSearch, fluxo passo a passo, ingestão de código PySpark e de documentação Word/Excel/CSV/PDF): ver [`07-rag.md`](07-rag.md).

## Conhecimento

- **Ficha de mart:** propósito, necessidade de negócio, jurisdição, granularidade, dimensões, medidas (aditivas ou não), localização, DAG e regras, frescura, owner, consumidores.
- **Ficha de regra:** gerada por LLM a partir do código PySpark (parsing AST), revista por humano antes de ser oficial, versionada em Git, ligada às métricas que a usam.

## Módulo Admin (React)

- Edição da documentação funcional (Markdown com front matter), tabelas de referência (CSV) e fichas, sem expor Git ao utilizador.
- Cada gravação abre um PR no Git interno; aprovação 4-eyes (quem escreve não aprova); CI valida antes do merge.
- Mostra diff legível, impacto via ligações (regras, marts, métricas afetados) e histórico de versões.
- Os mesmos fluxos servem para regras, métricas e specs de reports.

## Spec de vista

O contrato central entre agente, pivot e backend (`packages/contracts/src/view-spec.ts`): jurisdição, mart, métricas, linhas, colunas, filtros, período, comparação. Sem campo para SQL; campos extra são rejeitados. Validada no frontend e no backend contra o catálogo visível para o utilizador.

## Segurança

- Agente com as permissões do utilizador, nunca mais.
- Permissões por jurisdição aplicadas no backend e na semantic layer, não no prompt.
- Audit por pedido: prompt, intent, tools, SQL gerado pela semantic layer, resultados, modelo, versão do prompt.
- LLM in-tenant ou em cloud aprovada; aprovação interna (política de IA, DORA, model risk) a iniciar cedo.

# Prompts — multi-regulatory Agentic RAG

Architecture: [`docs/brain/08-agentic-rag-multi-regulatory.md`](../../docs/brain/08-agentic-rag-multi-regulatory.md).

| File | Agent | Type | Phase (proposal) |
| --- | --- | --- | --- |
| `contracts.md` | — | JSON contracts between runtime, Director and agents | 1 |
| `agents/director.md` | Director (includes planning) | Strong LLM | 1 |
| `agents/retriever.md` | Retriever | Deterministic search + small LLM for query rewriting | 1 |
| `agents/kpi.md` | KPI | Light LLM + analytical engine tools (ClickHouse / Parquet) | 1 |
| `agents/tables.md` | Tables / Reporting | Light LLM + deterministic renderer | 1 |
| `agents/enrichment.md` | Enrichment | Offline pipeline + LLM | 1 |
| `agents/matching.md` | Matching | Medium LLM + analytical engine tools (ClickHouse / Parquet) | 2 |
| `agents/regulatory-analysis.md` | Regulatory Analysis | Strong LLM + regulation module | 3 |
| `agents/general.md` | General / Reasoning | LLM, no data | Optional (Director covers it first) |
| `regulations/emir/` | EMIR module and routing hints | Loaded into Director and Regulatory Analysis | 1 |
| `regulations/_template/` | Template for future regulations | — | When the 2nd regulation starts |

## Rules

- Prompts are code: change them by PR and bump the version in the header.
- No prompt change reaches production without passing the golden set (to be created per regulation pack).
- `{{ }}` variables are filled by the runtime: `packs`, `kpi_catalog`, `regulation_module`, `user_language`, `user_regulations`, `today`, `pack_topics`.
- Prompts are written in Portuguese; contracts and architecture in English; source code and code comments in English.
- Examples are **fictitious**. Real ids, rules, thresholds and the rules digest live in the internal knowledge repository.

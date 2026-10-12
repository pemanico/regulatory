# Prompts — sistema multi-agente EMIR Matching

Arquitetura e decisões: [`docs/brain/08-agentes-emir-matching.md`](../../../docs/brain/08-agentes-emir-matching.md).

| Ficheiro | Agente | Tipo |
| --- | --- | --- |
| `00-contratos.md` | — | Contratos JSON entre agentes |
| `01-director.md` | Director (orquestrador; inclui o papel de planeador) | LLM forte |
| `02-retriever.md` | Retriever | Código determinístico + LLM pequeno para reescrita de pesquisas |
| `03-matching.md` | Matching | LLM médio |
| `04-kpi.md` | KPI | LLM leve |
| `05-analise-emir.md` | Análise EMIR | LLM forte |
| `06-tabelas.md` | Tabelas / Reporting | LLM leve + renderer determinístico |

## Regras de manutenção

- Os prompts são código: alteram-se por PR e cada alteração sobe a versão no cabeçalho.
- Nenhuma alteração entra em produção sem passar o golden set de avaliação (a criar).
- Variáveis entre `{{ }}` são preenchidas pelo backend em tempo de execução: `rules_digest`, `rules_digest_version`, `catalog_summary`.
- Os exemplos são **fictícios**. Ids, regras e limiares reais vêm do catálogo e do repositório de conhecimento no Git interno.

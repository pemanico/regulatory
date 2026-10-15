# Memória do projeto

Conhecimento acumulado do projeto, para que qualquer conversa nova (Claude ou pessoa) comece com o contexto completo.

## Ficheiros

1. [Contexto](01-contexto.md): problema, âmbito, utilizadores, objetivo
2. [Arquitetura](02-arquitetura.md): o que foi acordado e porquê
3. [Decisões](03-decisoes.md): registo cronológico
4. [Questões abertas](04-questoes-abertas.md)
5. [Glossário](05-glossario.md)
6. [Roadmap](06-roadmap.md): passos feitos e próximos
7. [RAG e Agentic RAG](07-rag.md): o que entra no RAG, OpenSearch, fluxo, ingestão de código e documentação
8. [Multi-regulatory Agentic RAG](08-agentic-rag-multi-regulatory.md) (EN): Director, agentes, vector DB vs ClickHouse, packs de regulação, KPIs, enrichment, fases
9. [Regras de validação por campo](09-regras-validacao-campos.md): especificação de conversão do Excel de regras EMIR, análise e propostas
10. [Reconciliação EMIR](10-reconciliacao-emir.md): os cinco artefactos (regras, action types, mapping, recon status file, mart de breaks), ligações, problemas da amostra e KPIs candidatos

## Casos práticos dos operacionais

Um ficheiro por caso em [`casos/`](casos/), a partir de [`casos/_template.md`](casos/_template.md).

| Id | Título | Jurisdição | Estado |
| --- | --- | --- | --- |
| [CASO-001](casos/CASO-001-explicar-break.md) | Perceber porque é que um campo está em break (mart de breaks → regras por campo) | EMIR | Recebido |

## Data marts

Uma ficha por mart em [`marts/`](marts/), a partir de [`marts/_template.md`](marts/_template.md).

| Id | Jurisdição | Necessidade de negócio | Estado da ficha |
| --- | --- | --- | --- |
| [emir-recon-breaks](marts/emir-recon-breaks.md) | EMIR | Breaks de reconciliação por trade e campo, com o valor de cada parte | Colunas reais + nomes lógicos; só breaks, sobre posições matched; questão #38 |
| [emir-tr-recon-status](marts/emir-tr-recon-status.md) | EMIR | Recon status file do trade repository (fonte externa): estados e valores TP1/TP2 por campo | Colunas reais (cabeçalho transcrito), pares TP1/TP2 |

## Regras de manutenção

- Factos vindos do Ordep ou de fontes verificadas; nada inventado.
- Cada decisão nova entra em `03-decisoes.md` com data.
- Uma questão respondida sai de `04-questoes-abertas.md` e o resultado vai para o ficheiro certo.
- Quando um caso ou mart é acrescentado, atualizar as tabelas acima.

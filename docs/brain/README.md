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
8. [Agentes EMIR Matching](08-agentes-emir-matching.md): Director, agentes especializados, fluxo, contratos, validação, KPIs de matching

## Casos práticos dos operacionais

Um ficheiro por caso em [`casos/`](casos/), a partir de [`casos/_template.md`](casos/_template.md).

| Id | Título | Jurisdição | Estado |
| --- | --- | --- | --- |
| — | Ainda sem casos | — | — |

## Data marts

Uma ficha por mart em [`marts/`](marts/), a partir de [`marts/_template.md`](marts/_template.md).

| Id | Jurisdição | Necessidade de negócio | Estado da ficha |
| --- | --- | --- | --- |
| — | Ainda sem marts documentados | — | — |

## Regras de manutenção

- Factos vindos do Ordep ou de fontes verificadas; nada inventado.
- Cada decisão nova entra em `03-decisoes.md` com data.
- Uma questão respondida sai de `04-questoes-abertas.md` e o resultado vai para o ficheiro certo.
- Quando um caso ou mart é acrescentado, atualizar as tabelas acima.

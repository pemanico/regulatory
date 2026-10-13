# Roadmap e progresso

## Feito

| Passo | O quê | Onde |
| --- | --- | --- |
| 0 | Architecture Design | Claude Docs + PDF no Project |
| 1 | Monorepo React + NestJS, contratos Zod, spec de vista com validação, auth mock, catálogo fictício | `regdata-platform/`, commit inicial |
| 1.1 | Ficheiros em falta repostos, CI no GitHub Actions (a passar), tema BNP Paribas, memória do projeto | PR #1 (merged) |
| 1.2 | Regra de atualização proativa da memória; desenho completo do RAG (`07-rag.md`) | PR #2 (merged) |
| 1.3 | Decisões: documentação como código em Git; repositório público só com código genérico; edição pelo módulo Admin | PR #3 (merged) e #4 |
| 1.4 | Arquitetura e prompts do Agentic RAG multi-regulatório (v2), a começar por EMIR | PR #5 (merged) |
| 1.5 | Regras de validação por campo: especificação e análise | PR #6 |
| 2c | Página web de upload e revisão das regras por campo; conversor e API; CI com anotações de falhas | PR #7 |

## Próxima sessão

Começar por um **exemplo prático de matching EMIR** apresentado pelo Ordep (caso de operacionais e ficha do mart, anonimizados), para testar a **fase 1** de `08-agentic-rag-multi-regulatory.md` (Director, Retriever, KPI, Tabelas).

1. Ler `CLAUDE.md`, `docs/brain/` (sobretudo `08`, `03`, `04`) e `regdata-platform/prompts/`.
2. Registar o caso em `casos/` e o mart em `marts/` a partir dos templates; atualizar o índice.
3. Fazer no máximo 3 perguntas sobre o que faltar.
4. Simular o pedido de ponta a ponta com o desenho: classificação do Director, plano, chamadas às tools (`metrics.query`), validações, tabela final. Identificar o que falha no desenho.
5. Fechar com o Ordep as definições dos KPIs do caso (#19) e as propostas da v2 (#25).
6. Decidir o passo seguinte: runtime de orquestração (passo 8) ou PoC da semantic layer sobre esse mart (passo 2).

## Próximo

| Passo | O quê | Precisa de |
| --- | --- | --- |
| 2 | PoC do Cube sobre um mart real via Trino; endpoint que executa uma spec e devolve o agregado; resultado no ecrã | Esquema de um mart + 3–5 KPIs |
| 2b | Piloto de conversão: 1 Word, 1 PDF, 1 Excel, 1 CSV reais (ou anonimizados) para o formato de texto, num repositório interno | Ficheiros de exemplo + Git interno |
| 3 | Catálogo real: fichas de mart a partir dos casos e marts apresentados | Casos práticos e lista de marts |
| 4 | Pivot interativo com drill-through | Passo 2 |
| 5 | Metrics agent: linguagem natural → spec de vista | LLM aprovado; passo 2 |
| 6 | Reports recorrentes como código | Inventário de reports |
| 7 | Módulo Admin: edição de documentação com PRs no Git interno | Repositório de conhecimento interno; produto do Git interno (#15) |
| 8 | Runtime de orquestração no NestJS (fase 1): contratos Zod, Director, Retriever, KPI e Tabelas com LLM simulado, validadores determinísticos, testes | Decisões #23 e #25; mart de matching (#20) |
| 2d | Testar a página no banco com o Excel real e rever os problemas reportados | Merge do PR #7; questões #30–#33 |
| 2e | Persistência dos uploads/revisões e publicação dos aprovados (OpenSearch + Git interno) | Questão #34 |
| 8b | Traduzir para inglês os comentários de código existentes (hoje em português) e acrescentar verificação no CI | Regra de língua de 2026-10-13 |
| 9 | Golden set de perguntas de matching com respostas validadas | KPIs certificados (#19) |

## Fases (do Architecture Design)

0. Descoberta: inventário de reports, baseline de horas, análise dos Excels
1. Benchmark: semantic layer sobre dados reais, gate p95 < 2 s no pivot
2. MVP num regime
3. Escala a outros regimes, alertas, comentários automáticos
4. Admin, retirada do APEX

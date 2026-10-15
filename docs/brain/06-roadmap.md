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
| 1.5 | Regras de validação por campo: especificação e análise | PR #6 (merged) |
| 2c | Página web de upload e revisão das regras por campo; conversor e API; CI com anotações de falhas | PR #7 (merged) |
| 2c.1 | POSC opcional; mapping ligado por `Table.Item`; prefixo de parte configurável (TP1/TP2); API lê o `.env`; guia `regdata-platform/docs/arranque-local.md` | PR #8 (merged) |
| 8b/8c | Código, interface, mensagens e template do chunk em inglês; verificação de língua no lint | PR #11 |
| 2d | Aplicação a correr na máquina do banco (Windows, registo npm interno, proxy) e teste de aceitação com o Excel real concluído | PR #10, #11; guia `arranque-local.md` |
| 8d | Prompts dos agentes, contratos e módulos de regulação em inglês | PR #12 |
| 2f | Exemplo de matching EMIR recebido: modelo dos cinco artefactos, fichas anonimizadas do mart de breaks e do recon status file, KPIs candidatos | `10-reconciliacao-emir.md`, `marts/` |

## Próxima sessão

**Exemplo prático de matching EMIR para a fase 1 do Agentic RAG** (`08-agentic-rag-multi-regulatory.md` §3). Objetivo: ter um mart de matching anonimizado e 3–5 KPIs de matching com definição fechada, para construir o runtime da fase 1 (passo 8) com dados fictícios do mesmo formato.

Inputs do Ordep: ficha anonimizada de um mart com estado de pairing/matching (#20) e os KPIs de matching calculados hoje em Excel, com as escolhas de definição (#19).

Estado (2026-10-15): fichas em `marts/` feitas; #39 e parte de #40 respondidas; faltam #38, o resto de #40 e as definições de #19 para fechar os KPIs.

Critério de conclusão: ficha em `marts/`, KPIs em YAML (`draft`) com numerador, denominador e regras de aging decididas, e as questões #19 e #20 respondidas ou reduzidas a pontos concretos.

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
| 2e | Persistência dos uploads/revisões e publicação dos aprovados (OpenSearch + Git interno) | Questão #34 |
| 9 | Golden set de perguntas de matching com respostas validadas | KPIs certificados (#19) |

## Fases (do Architecture Design)

0. Descoberta: inventário de reports, baseline de horas, análise dos Excels
1. Benchmark: semantic layer sobre dados reais, gate p95 < 2 s no pivot
2. MVP num regime
3. Escala a outros regimes, alertas, comentários automáticos
4. Admin, retirada do APEX

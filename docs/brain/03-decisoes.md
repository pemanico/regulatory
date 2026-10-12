# Registo de decisões

Mais recente primeiro. Decisões técnicas da aplicação têm ADR em `regdata-platform/docs/adr/`.

| Data | Decisão | Porquê |
| --- | --- | --- |
| 2026-10-13 | Agentic RAG multi-regulatório (v2), substitui o desenho EMIR Matching v1: começa por EMIR (reporting, matching, clearing, risk mitigation, collateral), depois MiFID II/MiFIR, SEC, CFTC, Canadá | Definido pelo Ordep; `08-agentic-rag-multi-regulatory.md` |
| 2026-10-13 | Duas fontes separadas: vector DB para perceber/contexto; ClickHouse (ou motor sobre Parquet) para calcular. Nunca calcular KPIs na vector DB | Definido pelo Ordep |
| 2026-10-13 | Agentes: Director (sem RAG nem ClickHouse), Retriever (único na vector DB), KPI e Matching (ClickHouse), Análise Regulatória (extensível por regulação), Tabelas, General, Enrichment | Definido pelo Ordep |
| 2026-10-13 | Regras de língua: código e comentários em inglês; documentos funcionais, regras de negócio e prompts podem ser em português; arquitetura e explicações técnicas podem ser em inglês | Definido pelo Ordep |
| 2026-10-13 | RAG enriquecido com dados Parquet, documentos funcionais, código-fonte e comentários | Definido pelo Ordep; proposta: dos Parquet só metadados, nunca linhas |
| 2026-10-12 | A documentação migrada é editada pelo módulo Admin na aplicação React, que abre PRs no Git interno por baixo | Operacionais não precisam de usar Git; evita que o Word volte a ser a fonte |
| 2026-10-12 | Repositório mantém-se público, com as referências atuais ao banco, à equipa e ao stack | Ordep confirma que não há problema |
| 2026-10-12 | Repositório público `pemanico/regulatory` só para código genérico e exemplos fictícios/anonimizados; conhecimento real (documentação convertida, catálogo, casos) só no Git interno do banco | No banco só há acesso ao Git interno; o público serve de transferência e é visível para todos |
| 2026-10-12 | Toda a documentação (Word, Excel, PDF, CSV) é convertida para texto e versionada em Git; o Git passa a fonte de verdade e o RAG indexa a partir dele | Cada alteração visível para agentes e intervenientes; PDF caro e opaco a diffs |
| 2026-10-12 | O Claude atualiza a memória do projeto (`docs/brain/` e cópia no Project) por iniciativa própria sempre que algo importante acontece | Pedido do Ordep; evita perder contexto entre conversas |
| 2026-10-12 | Cores da BNP Paribas no frontend, verde provisório #009464 numa variável CSS | Fontes públicas divergem (#009464 / #008755); confirmar com guia de marca interno |
| 2026-10-12 | Código mantém-se na subpasta `regdata-platform/`; CI com `working-directory` | Preferência do Ordep |
| 2026-10-12 | CI em GitHub Actions: install, lint, test, typecheck, build | Única forma de executar o código a partir do ambiente do Claude, que não alcança o registo npm |
| 2026-10-10 | Auth mock com interface pronta para SSO; mock recusado em produção (ADR-003) | SSO será integrado, mas não bloqueia agora |
| 2026-10-10 | NestJS no backend; npm workspaces, Nx mais tarde se necessário (ADR-002) | Backend vai crescer em módulos |
| 2026-10-10 | Frontend React, backend Node.js, TypeScript de ponta a ponta, contratos Zod partilhados | Escolha do Ordep |
| 2026-10-10 | Data marts em S3 Parquet via Trino, através do Cube; ClickHouse como opção (ADR-001) | Trabalhar sobre o que existe; mudar de motor é configuração da semantic layer |
| 2026-10-10 | Não criar camada intermédia nos pipelines | Os marts já estão ao nível da linha com regras aplicadas |
| 2026-10-10 | Jobs Airflow a pedido só por allowlist, com confirmação, sem alterar dados certificados | Única ação com efeitos colaterais |
| 2026-10-10 | Agente conhece regras e código via fichas revistas + RAG; sem fine-tuning | Atualizável, auditável, com citações |
| 2026-10-10 | Fluxo Agentic RAG adaptado: sem internet, fast path, verificação determinística, loop limitado | Fiabilidade e custo |
| 2026-09-25 | Âmbito começa nos erros já resolvidos e validados | Classificação e validação já existem a montante |
| 2026-09-25 | Destinatários: operacionais e gestão interna | Menos fasquia de controlo, mais de usabilidade |
| 2026-09-25 | Objetivo: zero reports recorrentes em Excel | Medível; exportação pontual permitida e medida |
| 2026-09-25 | Pivot editável gerado por linguagem natural, não resposta estática | Pivot é iterativo; chat sozinho perde para o Excel |

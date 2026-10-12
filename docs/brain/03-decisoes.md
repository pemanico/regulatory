# Registo de decisões

Mais recente primeiro. Decisões técnicas da aplicação têm ADR em `regdata-platform/docs/adr/`.

| Data | Decisão | Porquê |
| --- | --- | --- |
| 2026-10-12 | A ingestão do RAG tem de cobrir documentação em Word, Excel, CSV e PDF, além do código PySpark | Requisito do Ordep; desenho proposto em `07-rag.md` §6, a confirmar |
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

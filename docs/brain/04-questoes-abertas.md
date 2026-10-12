# Questões abertas

| # | Questão | Porque importa | Quem responde |
| --- | --- | --- | --- |
| 1 | Esquema de um data mart real (colunas e tipos) | Necessário para o passo 2 (Cube sobre Trino) | Ordep |
| 2 | 3–5 KPIs que a equipa calcula hoje em Excel sobre esse mart | Primeiras métricas certificadas | Ordep / operacionais |
| 3 | Lista dos data marts existentes por jurisdição | Catálogo real substitui o fictício | Ordep |
| 4 | Quais reports recorrentes consomem mais horas (inventário) | Prioridade do MVP e baseline de ROI | Operacionais |
| 5 | Os 50% de tempo são medidos ou estimados? | Sem baseline não há prova de ROI | Ordep |
| 6 | Qual LLM está aprovado internamente, e onde corre | Bloqueador típico em banco (política de IA, DORA) | Risco / IT |
| 7 | Cor oficial e tipografia do guia de marca interno | Verde atual é provisório | Design / comunicação interna |
| 8 | Versão de Node.js e registo npm internos | O build tem de correr na infraestrutura do banco | IT |
| 9 | Regime do MVP | Critério: mais horas de Excel no inventário | Ordep |
| 10 | Identity provider para o SSO (ex. Entra ID / OIDC) | Integração futura de auth | IT |
| 12 | Que Excels e CSVs são referência (mapeamentos, regras) e quais são dados ou cálculos | Só referência entra no registry/RAG; cálculos vão para a descoberta | Ordep / operacionais |
| 13 | Os documentos têm owner e versão identificáveis? | Sem owner e versão não há citação fiável nem filtro de vigência | Ordep |
| 14 | Validar formatos de destino, estrutura `knowledge/` e template de documento funcional (07-rag.md §6) | Princípio já decidido; detalhe é proposta | Ordep |
| 15 | Que produto é o Git interno (GitLab, Bitbucket, GitHub Enterprise) e se tem CI | Define onde corre o CI do repositório de conhecimento e a reindexação | Ordep / IT |
| 16 | Até o editor do Admin existir, quem edita os documentos já migrados? | Sem regra interina, o Word volta a ser a fonte | Ordep |
| 19 | O Git interno tem API para criar branches, commits e PRs, e é permitida uma conta de serviço? | O Admin depende disso para abrir PRs em nome do utilizador | IT |

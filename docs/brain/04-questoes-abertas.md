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
| 19 | Definições certificadas dos KPIs de matching: denominador da taxa, "volume" (nº ou notional, moeda), aging (dias corridos ou úteis), limiares estritos ou não | Cada escolha muda o número; sem isto não há KPI fiável | Ordep / operacionais |
| 20 | Que mart(s) EMIR têm estado de pairing/matching, motivo de falha, campos em break e data do primeiro unmatched (ficha anonimizada) | Base dos agentes Matching e KPI | Ordep |
| 21 | Regras internas de matching (limiares de escalamento, procedimentos, prazos) | Alimentam o resumo de regras do Director e a Análise EMIR | Ordep |
| 22 | Que fontes regulatórias indexar para matching (RTS/ITS, Q&As ESMA, documentação do trade repository) | Conhecimento do Retriever e da Análise EMIR | Ordep |
| 23 | Orquestração: LangGraph.js ou máquina de estados própria no NestJS | Implementação do runtime do Director | Ordep / Claude |
| 24 | Quem escreve e mantém o resumo de regras (digest) de cada regulação | É o conhecimento do Director; sem owner fica desatualizado | Ordep / negócio |
| 25 | Confirmar as propostas da v2: KPI/Matching só via semantic layer (sem SQL livre); dos Parquet só metadados na vector DB; Enrichment offline; fases de entrada dos agentes | Mudam o desenho pedido | Ordep |
| 26 | Modelo de embeddings multilingue aprovado (PT + EN) | Pesquisa entre documentos em PT e código em EN | Ordep / IT |
| 27 | Quando um mart existe em ClickHouse e em Parquet, qual é a cópia de referência, e com que atraso a outra é atualizada? | Duas cópias divergem; a resposta tem de dizer de onde vem o número | Ordep |
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
| 27 | Com que atraso a cópia ClickHouse de um mart é atualizada a partir do Parquet (referência)? | Define quando a semantic layer pode usar o ClickHouse sem divergir | Ordep |
| 28 | O Excel de regras por campo é o ficheiro público de validation rules da ESMA, ou uma versão interna com regras do banco? | Se for público, pode ser convertido fora do banco a partir da fonte oficial | Ordep |
| 30 | O que é o terceiro campo BNPP em alguns mappings (ex. asset class): derivado, consolidado, ou usado no controlo? | Hoje fica como campo comum (`OUTROS_CAMPOS_BNPP`); ver `09` §1.2 | Ordep |
| 31 | Validar com o Excel real as propostas já implementadas em `09-regras-validacao-campos.md` §2–§5: conversão por código no banco; registo canónico + chunk gerado; join por Table+Item com verificação de Section/Field; vazio = erro; condições preservadas palavra a palavra; metadados de versão | Mudam a especificação | Ordep |
| 35 | A regra "interface em inglês" abrange também o texto gerado para o RAG (rótulos do chunk como `CONTEXTO`, `NOME_CAMPO`, `REGRAS_TP1`) e as mensagens de problemas do conversor mostradas na página? | O template do chunk foi definido em português; mudá-lo altera o que é indexado | Ordep |
| 34 | Persistência dos uploads e revisões (hoje em memória) e destino final: indexação no OpenSearch e gravação no Git interno | A exportação manual é provisória | Ordep / Claude |

## Respondidas

| # | Questão | Resposta (data) | Onde ficou |
| --- | --- | --- | --- |
| 32 | A folha de action types tem coluna `POSC`? | `POSC` não é usado por agora; a ausência não é erro (2026-10-13) | `09` §1.2, `03` |
| 33 | Acrescentar a coluna `Table.Item` ao mapping? | O mapping tem a coluna `Table.Item`, concatenação de Table e Item; é a chave de ligação (2026-10-13) | `09` §4.3a, `03` |
| 30a | Nome dos blocos e prefixo de parte no mapping BNPP | Os campos de parte começam por `TP1` e `TP2`; blocos `REGRAS_TP1` / `REGRAS_TP2` (2026-10-13) | `09` §4.1, `03` |

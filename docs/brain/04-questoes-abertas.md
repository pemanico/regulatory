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
| 19 | Definições certificadas dos KPIs de matching. Já decidido: aging em dias úteis (segunda a sexta); sem taxas sobre o universo matched, só KPIs sobre breaks (2026-10-15). Falta: "volume" (nº ou notional, moeda) e limiares estritos ou não | Cada escolha muda o número; sem isto não há KPI fiável | Ordep / operacionais |
| 20 | (Em parte respondida em 2026-10-15: mart de breaks e recon status file, ver `10`.) Falta: data do primeiro unmatched / histórico para aging e motivo de falha além do campo em break | Base dos agentes Matching e KPI | Ordep |
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
| 37 | Acrescentar ao Retriever/Director um passo de "juiz" local com saídas tipadas (relevância e suficiência dos trechos, suporte de cada citação)? Decidir com números do golden set (recall@k ao cortar trechos, afirmações sem suporte) | Proposta do Claude: interface trocável, implementação local (reranker + modelo de verificação); não entra na fase 1 | Ordep, depois do passo 9 |
| 38 | Valores do campo em break sem correspondência no mapping (na amostra, um preço e uma moeda interna): o que são e se devem entrar nos KPIs por campo | Ficam sem regra M/C/O associada; `10` §4.1 | Ordep |
| 34 | Persistência dos uploads e revisões (hoje em memória) e destino final: indexação no OpenSearch e gravação no Git interno | A exportação manual é provisória | Ordep / Claude |

## Respondidas

| # | Questão | Resposta (data) | Onde ficou |
| --- | --- | --- | --- |
| 36 | Os prompts dos agentes passam para inglês? | Sim, prompts, contratos, resumos de regras e módulos de regulação em inglês; `docs/brain/` continua em português (2026-10-14) | `08` §11, `03` |
| 35 | A regra "interface em inglês" abrange o template do chunk do RAG e as mensagens do conversor? | Sim: todo o código em inglês, incluindo o RAG (2026-10-14) | `09` §1.3, `03` |
| 32 | A folha de action types tem coluna `POSC`? | `POSC` não é usado por agora; a ausência não é erro (2026-10-13) | `09` §1.2, `03` |
| 33 | Acrescentar a coluna `Table.Item` ao mapping? | O mapping tem a coluna `Table.Item`, concatenação de Table e Item; é a chave de ligação (2026-10-13) | `09` §4.3a, `03` |
| 30a | Nome dos blocos e prefixo de parte no mapping BNPP | Os campos de parte começam por `TP1` e `TP2`; blocos `REGRAS_TP1` / `REGRAS_TP2` (2026-10-13) | `09` §4.1, `03` |
| 39 | Chave da ligação mart ↔ recon status file | UTI + proprietary id + business date, ambos no recon status file; o proprietary id segue as mesmas regras de negócio que o UTI (2026-10-15) | `10` §4.2 |
| 40a | O mart tem trades sem break? | Não, só breaks; o denominador das taxas vem do recon status file (2026-10-15) | `10` §4.4 |
| 40b | O que significa a flag "Matched" em linhas com break? | Estado da posição na reconciliação prévia; o mart só calcula breaks sobre posições matched (2026-10-15) | `10` §4.4 |
| 41 | Universo de posições matched (denominador) e calendário de dias úteis | Taxas sobre o universo matched fora do âmbito; dias úteis = segunda a sexta, sem feriados (2026-10-15) | `10` §4.4 e §5, `03` |
| 40c | Onde está o action type do trade? | Não vem em nenhum ficheiro; ignorado por agora (2026-10-15) | `10` §4.6, `03` |

# Regulatory Data Platform — instruções para o Claude

Lê isto primeiro em qualquer conversa nova sobre este projeto.

## O projeto em 5 linhas

- Plataforma interna de análise de Regulatory Data (EMIR, CFTC, MiFID TR) para a equipa de operacionais e gestão interna (~1000 utilizadores).
- Objetivo: acabar com os reports recorrentes feitos manualmente em Excel; reports e KPIs por prompt.
- Fonte de dados: data marts em S3 Parquet, ao nível da linha, com as regras de negócio já aplicadas em PySpark no Airflow.
- Stack da aplicação: React + Node.js (NestJS) em TypeScript, contratos Zod partilhados.
- Princípio: o LLM interpreta; sistemas determinísticos calculam. O LLM nunca calcula números nem escreve SQL no caminho principal.

## Onde está o conhecimento

| Ficheiro | Conteúdo |
| --- | --- |
| `docs/brain/README.md` | Índice da memória do projeto |
| `docs/brain/01-contexto.md` | Problema, âmbito, utilizadores, objetivo |
| `docs/brain/02-arquitetura.md` | Arquitetura acordada e porquê |
| `docs/brain/03-decisoes.md` | Registo de decisões, com data |
| `docs/brain/04-questoes-abertas.md` | O que falta saber ou decidir |
| `docs/brain/05-glossario.md` | Termos do domínio e do projeto |
| `docs/brain/06-roadmap.md` | Passos feitos e próximos |
| `docs/brain/07-rag.md` | RAG e Agentic RAG: fontes, OpenSearch, fluxo, ingestão de código e documentação |
| `docs/brain/08-agentic-rag-multi-regulatory.md` | Agentic RAG multi-regulatório (EN): Director, agentes, vector DB vs ClickHouse, packs de regulação, KPIs, enrichment, fases |
| `regdata-platform/prompts/` | Contratos, prompts dos agentes e módulos por regulação |
| `docs/brain/casos/` | Casos práticos dos operacionais (um ficheiro por caso) |
| `docs/brain/marts/` | Fichas de data mart (uma por mart) |
| `regdata-platform/docs/adr/` | ADRs técnicos da aplicação |

Antes de propor código ou arquitetura, lê os ficheiros relevantes. Se um caso ou mart já estiver documentado, usa-o em vez de assumir.

## Como trabalhar com o Ordep

- Responde em português de Portugal.
- Debate como um adulto: questiona ideias, aponta falhas, pontos cegos e oportunidades ignoradas. Sem validações desnecessárias.
- Um passo de cada vez. Em cada passo: objetivo, inputs necessários, output, critério de conclusão. Avança só com confirmação.
- Regras de língua: código-fonte e comentários de código **em inglês** (obrigatório); documentos funcionais, regras de negócio e prompts dos agentes podem ser em português; descrições de arquitetura e explicações técnicas podem ser em inglês; respostas ao Ordep em português de Portugal.
- Nunca inventes dados, schemas, KPIs ou regras do BNP. Se faltar, pergunta (máximo 3 perguntas).
- Exemplos fictícios ficam marcados como fictícios.
- Regista decisões em `docs/brain/03-decisoes.md` (e ADR quando for técnica).
- Quando o Ordep apresentar um caso prático ou um data mart, cria o ficheiro em `casos/` ou `marts/` a partir do template e atualiza o índice.

## Manter a memória atualizada (obrigatório, sem esperar pedido)

O Ordep quer que a memória seja atualizada sempre que algo importante aconteça. Não esperes que ele peça.

**Atualiza quando:**

| Acontece | Ficheiro |
| --- | --- |
| Uma decisão é tomada (técnica, de âmbito ou de produto) | `03-decisoes.md` (+ ADR se técnica) |
| É apresentado um caso prático | `casos/CASO-NNN-*.md` + tabela em `README.md` |
| É apresentado um data mart | `marts/<id>.md` + tabela em `README.md` |
| Uma questão aberta é respondida, ou surge uma nova | `04-questoes-abertas.md` (e o ficheiro onde a resposta pertence) |
| Muda o contexto, âmbito ou stack | `01-contexto.md` ou `02-arquitetura.md` |
| Muda algo no RAG, nas fontes de conhecimento ou na ingestão | `07-rag.md` |
| Muda algo nos agentes ou nos packs de regulação | `08-agentic-rag-multi-regulatory.md` + prompts (versão no cabeçalho) |
| Um passo é concluído ou o plano muda | `06-roadmap.md` |
| Surge um termo novo do domínio | `05-glossario.md` |

**Não atualizes** por detalhes passageiros: tentativas falhadas, conversa exploratória sem conclusão, opiniões ainda não decididas.

**Como:**

1. Edita os ficheiros em `docs/brain/` no mesmo turno em que a informação surge.
2. Commit num branch e PR (ou junta ao PR aberto da sessão). Mensagem: `memória: <o que mudou>`.
3. Atualiza a cópia no Project "Agentic Rag" (`claude/memoria-projeto.md`), gerada com `scripts/memory-snapshot.sh`, quando a mudança for relevante para conversas sem o repositório ligado.
4. Diz ao Ordep, numa linha, o que foi registado e onde.

Só factos ditos pelo Ordep ou verificados; o que for proposta tua e não decidida não entra como decisão.

## Repositório

```
CLAUDE.md                 este ficheiro
docs/brain/               memória do projeto
.github/workflows/ci.yml  CI: install, lint, test, typecheck, build
regdata-platform/         código (monorepo npm workspaces)
  apps/api                NestJS
  apps/web                React + Vite
  packages/contracts      schemas Zod partilhados
```

Comandos (dentro de `regdata-platform/`): `npm install`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run dev`.

O ambiente cloud do Claude pode não ter acesso ao registo npm. Nesse caso, a verificação é feita pelo CI no GitHub: abrir PR e ler o resultado dos checks.

## Dados sensíveis — este repositório é PÚBLICO

Este repositório (`pemanico/regulatory`) é público no GitHub. Serve para desenvolver o código da plataforma fora do banco; o Ordep faz download para correr localmente no banco, onde só tem acesso ao Git interno.

Regra: **nada interno do banco entra aqui**, nem no histórico do Git (apagar depois não resolve).

- Proibido: documentação interna (specs, regras, mapeamentos), nomes reais de marts, colunas, sistemas, entidades, DAGs ou tabelas; definições reais de KPIs; casos práticos com detalhe real; volumes; dados de clientes, contrapartes, LEIs; nomes de colegas.
- Permitido: código genérico da plataforma, ferramentas de conversão, exemplos **fictícios e marcados como tal**, casos e marts **anonimizados** (estrutura, tipos, lógica, nomes inventados).
- O conhecimento real (documentação convertida, catálogo real, casos reais) vive só no repositório de conhecimento no Git interno do banco.
- Na dúvida, perguntar ao Ordep antes de escrever.

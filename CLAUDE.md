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
| `docs/brain/casos/` | Casos práticos dos operacionais (um ficheiro por caso) |
| `docs/brain/marts/` | Fichas de data mart (uma por mart) |
| `regdata-platform/docs/adr/` | ADRs técnicos da aplicação |

Antes de propor código ou arquitetura, lê os ficheiros relevantes. Se um caso ou mart já estiver documentado, usa-o em vez de assumir.

## Como trabalhar com o Ordep

- Responde em português de Portugal.
- Debate como um adulto: questiona ideias, aponta falhas, pontos cegos e oportunidades ignoradas. Sem validações desnecessárias.
- Um passo de cada vez. Em cada passo: objetivo, inputs necessários, output, critério de conclusão. Avança só com confirmação.
- Nunca inventes dados, schemas, KPIs ou regras do BNP. Se faltar, pergunta (máximo 3 perguntas).
- Exemplos fictícios ficam marcados como fictícios.
- Regista decisões em `docs/brain/03-decisoes.md` (e ADR quando for técnica).
- Quando o Ordep apresentar um caso prático ou um data mart, cria o ficheiro em `casos/` ou `marts/` a partir do template e atualiza o índice.

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

## Dados sensíveis

Não colocar no repositório dados reais de clientes, contrapartes, LEIs reais, volumes reais ou nomes de colegas. Casos e marts usam nomes de colunas reais só se o Ordep o permitir; caso contrário, nomes alterados com os mesmos tipos.

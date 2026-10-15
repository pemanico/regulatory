# Regulatory Data Platform

Monorepo da plataforma de análise de Regulatory Data (CFTC, EMIR, MiFID TR):
frontend React, backend Node.js (NestJS) e contratos partilhados.

Ver o *Regulatory Data Analytics Platform — Architecture Design* para o contexto e as decisões.

## Estrutura

```
apps/
  api/          Backend NestJS: auth, catálogo de marts, validação de specs
  web/          Frontend React + Vite
packages/
  contracts/    Schemas Zod partilhados (view spec, catálogo, validação)
docs/adr/       Registo de decisões
```

## Requisitos

- Node.js 20.12 ou superior (`.nvmrc` aponta para 22)
- npm 10

## Arranque

```bash
npm install
npm test        # testes dos contratos e da API
npm run dev     # API em http://localhost:3000/api, web em http://localhost:5173
```

O `npm run dev` compila os contratos e arranca API e web em paralelo.
O Vite encaminha `/api` para o backend.

## Endpoints (passo 1)

| Método | Caminho | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Health check (público) |
| GET | `/api/catalog/marts` | Marts visíveis para o utilizador |
| POST | `/api/views/validate` | Valida uma spec de vista |
| POST | `/api/views/run` | Valida, compila e executa uma spec no DuckDB; devolve linhas, o SQL gerado e avisos (datas sem dados, métricas em draft) |
| POST | `/api/field-rules/uploads` | Upload de 1–3 `.xlsx` (regras, action types, mapping DTCC ↔ BNPP) e conversão |
| GET | `/api/field-rules/uploads` | Uploads recentes |
| GET | `/api/field-rules/uploads/:id` | Campos convertidos, problemas, chunks e estado de revisão |
| POST | `/api/field-rules/uploads/:id/fields/:fieldId/review` | Aprovar ou rejeitar um campo (4-eyes) |
| POST | `/api/field-rules/uploads/:id/approve-clean` | Aprovar em bloco os campos sem erros nem avisos |
| GET | `/api/field-rules/uploads/:id/export?format=json\|markdown` | Exportar os campos aprovados |

Exemplo:

```bash
curl -s -X POST localhost:3000/api/views/validate \
  -H 'Content-Type: application/json' \
  -d '{"specVersion":1,"jurisdiction":"EMIR","martId":"example_emir_validation","metrics":["error_count"],"rows":["error_category"],"period":{"from":"2026-07-01","to":"2026-09-30"}}'
```

## Regras de validação por campo

Página **Validation rules** na aplicação web: carregar os Excel, ver os problemas de conversão, rever campo a campo e exportar os aprovados (registos JSON e chunks Markdown para o RAG). Especificação: `docs/brain/09-regras-validacao-campos.md`.

- Para testar a revisão em desenvolvimento, carrega com um utilizador e revê com outro (campo "User (dev)" no topo): quem carrega não pode aprovar.
- Os uploads ficam em memória: perdem-se ao reiniciar a API.
- Configuração: copiar `apps/api/.env.example` para `apps/api/.env` (lido no arranque da API) e ajustar `FIELD_RULES_BLOCK_LABELS`, `FIELD_RULES_PARTY_PREFIX` e `FIELD_RULES_FOUR_EYES`.
- Arranque passo a passo e problemas comuns: `docs/arranque-local.md`.

## Autenticação em desenvolvimento

`AUTH_MODE=mock` (default). Headers para simular utilizadores:

| Header | Efeito |
| --- | --- |
| `x-dev-user` | id do utilizador (default `dev.user`) |
| `x-dev-jurisdictions` | ex. `EMIR,CFTC` (default: todas) |
| `x-dev-anonymous: true` | simula pedido sem sessão (401) |

O mock recusa arrancar com `NODE_ENV=production`. O SSO entra em
`apps/api/src/auth/auth-provider.factory.ts`, implementando `AuthProvider`.

## Catálogo

`apps/api/src/catalog/catalog.fixtures.ts` contém um catálogo **fictício**.
Será substituído pelas fichas de mart reais depois da fase de descoberta.

## Consultas aos marts (DuckDB)

O motor da primeira fase é o DuckDB embebido na API (ADR-005). O SQL é gerado pelo compilador em `packages/query` a partir de métricas definidas em código; nunca é escrito pelo LLM.

1. Copiar `apps/api/query-bindings.example.json` para `apps/api/query-bindings.json` (fica fora do Git).
2. Em cada mart, indicar `source` (caminho ou glob dos ficheiros Parquet, ou CSV com `"format": "csv"`) e, em `columns`, o nome real de cada coluna lógica. Datas em texto: `{ "column": "...", "dateFormat": "%d/%m/%Y" }`.
3. Em `apps/api/.env`: `QUERY_BINDINGS_FILE=query-bindings.json`.

Mart com modelo semântico: `emir_recon_breaks` (métricas `breaks_count`, `trades_with_breaks`, `one_sided_breaks`; dimensões `business_date`, `field_in_break`, `primary_asset_class`, `pairing_status`, `reconciliation_status`, `valuation_reconciliation_status`, `reporting_type`, `rec_category`, `reconciliation_flag`, `contract_type`, `activity_l1`…`activity_l4`). O `query-bindings.example.json` já traz os nomes reais das colunas; no banco só é preciso ajustar `source` e confirmar a coluna do UTI. Dias úteis = segunda a sexta.

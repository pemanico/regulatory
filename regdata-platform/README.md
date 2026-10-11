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

- Node.js 20 ou superior (`.nvmrc` aponta para 22)
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

Exemplo:

```bash
curl -s -X POST localhost:3000/api/views/validate \
  -H 'Content-Type: application/json' \
  -d '{"specVersion":1,"jurisdiction":"EMIR","martId":"example_emir_validation","metrics":["error_count"],"rows":["error_category"],"period":{"from":"2026-07-01","to":"2026-09-30"}}'
```

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

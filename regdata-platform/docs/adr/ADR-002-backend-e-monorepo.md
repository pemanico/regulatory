# ADR-002: NestJS no backend e npm workspaces no monorepo

**Estado:** aceite · 2026-10-10

## Contexto

O backend vai crescer em muitos módulos (auth, catálogo, views, reports, agentes,
tools, jobs Airflow, audit). Frontend e backend partilham contratos (specs de vistas,
reports e jobs).

## Decisão

- **Backend:** NestJS. Módulos, injeção de dependências e guards globais dão estrutura
  para crescer sem reinventar convenções.
- **Monorepo:** npm workspaces. Nx fica como evolução possível, acrescentada sobre a
  mesma estrutura quando houver necessidade concreta (cache de builds, grafo de
  dependências, muitos pacotes).
- **Contratos:** pacote `@regdata/contracts` com schemas Zod, compilado em ESM e CJS
  (tsup) para servir o Vite e o NestJS.

## Consequências

- Validação idêntica no frontend (feedback imediato) e no backend (decisão oficial).
- Sem custo de configuração de Nx no arranque; migração para Nx não exige mover pastas.
- Os contratos têm de ser compilados antes de API e web (`npm run build:packages`,
  já incluído em `dev`, `test` e `build`).

# ADR-003: autenticação mock com interface pronta para o SSO

**Estado:** aceite · 2026-10-10

## Contexto

O SSO do banco vai ser integrado, mas não é necessário agora e não deve bloquear o
desenvolvimento. As permissões por jurisdição têm de existir desde o início, porque
o agente nunca pode ter mais acesso do que o utilizador.

## Decisão

- Interface `AuthProvider` com `authenticate(request)`, devolvendo o utilizador ou null.
- Guard global: todos os endpoints exigem autenticação, exceto `@Public()`.
- `MockAuthProvider` para desenvolvimento, controlado por headers (`x-dev-*`).
- `AUTH_MODE=mock` é recusado com `NODE_ENV=production`.
- O utilizador transporta as jurisdições visíveis; o catálogo e a validação filtram por elas.

## Consequências

- Integrar o SSO é implementar `AuthProvider` e ligá-lo em `createAuthProvider`.
- Os testes já cobrem o comportamento por jurisdição, que se mantém com o SSO.

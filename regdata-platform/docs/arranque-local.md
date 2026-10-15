# Arranque local

Guia para pôr a aplicação a correr numa máquina nova, incluindo dentro da rede do banco (registo npm interno, proxy, certificados).

Critério de conclusão: `http://localhost:5173` abre, o separador **Validation rules** carrega um Excel e mostra os campos convertidos.

## 1. Pré-requisitos

| O quê | Versão | Verificar |
| --- | --- | --- |
| Node.js | 20.12 ou superior (recomendado 22, ver `.nvmrc`) | `node -v` |
| npm | 10 | `npm -v` |
| Git (opcional) | qualquer | `git --version` |

Portas livres: `3000` (API) e `5173` (web).

## 2. Obter o código

- Fora do banco: `git clone https://github.com/pemanico/regulatory.git`.
- No banco: a partir do Git interno, ou do ZIP do GitHub descarregado e copiado.

Trabalhar sempre dentro de `regdata-platform/`.

## 3. Configurar o npm (só se houver registo interno ou proxy)

Criar `regdata-platform/.npmrc` (não vai para o Git se tiver credenciais; ver `.gitignore`) ou usar `npm config set`:

```ini
registry=https://<registo-npm-interno>/
; Se o registo exigir autenticação, seguir as instruções da equipa que o gere.
; Proxy corporativo, se necessário:
; proxy=http://<proxy>:<porta>
; https-proxy=http://<proxy>:<porta>
; Certificado da CA interna (preferível a desligar o SSL):
; cafile=C:\caminho\para\ca-interna.pem
```

Não usar `strict-ssl=false` como solução permanente.

Verificar: `npm ping` e `npm view zod version` devolvem resposta.

Notas para uma rede com proxy corporativo (Windows, PowerShell):

- Se `HTTPS_PROXY` estiver definido, o npm manda também os pedidos ao registo **interno** pelo proxy. Tirar o registo interno do proxy:
  ```powershell
  $env:NO_PROXY = "<host-do-registo-interno>,localhost,127.0.0.1"   # janela atual
  setx NO_PROXY "<host-do-registo-interno>,localhost,127.0.0.1"     # janelas novas
  ```
  `localhost` também é necessário para a web chegar à API.
- Criar a credencial do registo com o próprio npm, que a grava no formato certo (`//host/caminho/:_authToken`):
  ```powershell
  npm login --auth-type=legacy --registry=https://<registo-npm-interno>/
  ```
  Uma linha `:_authToken` que não comece por `//` é ignorada e o registo responde `E401`.
- Não pôr utilizador e password dentro de `HTTPS_PROXY` nem colar o output de `npm config list` em canais externos: mostra os tokens.
- Para verificar o `esbuild` antes do install: `npm view "@esbuild/win32-x64" version`.
- Para verificar o DuckDB (motor de consulta, ADR-005): `npm view @duckdb/node-api@1.5.2-r.1 version` e `npm view @duckdb/node-bindings@1.5.2-r.1 optionalDependencies` (lista os pacotes por plataforma; o de Windows x64 tem de existir no registo interno).

## 4. Instalar

```bash
cd regdata-platform
npm install
```

Pacotes que costumam falhar num registo interno: `@nestjs/*`, `vite`, `@vitejs/plugin-react`, `tsup` (usa `esbuild`, que descarrega um binário por plataforma), `exceljs`, `concurrently`. Se o `esbuild` falhar, o registo interno tem de espelhar também `@esbuild/<plataforma>` (ex. `@esbuild/win32-x64`).

O repositório ainda não tem `package-lock.json`, por isso as versões instaladas podem variar entre máquinas. Se uma instalação falhar por versão, guardar o output completo do `npm install` e reportá-lo.

## 5. Configurar a API

```bash
# Linux / macOS
cp apps/api/.env.example apps/api/.env
# Windows (PowerShell)
Copy-Item apps/api/.env.example apps/api/.env
```

O `apps/api/.env` é lido no arranque (Node ≥ 20.12). Valores a rever:

| Variável | Para quê |
| --- | --- |
| `PORT` | Porta da API (por defeito 3000; se mudar, mudar também o proxy em `apps/web/vite.config.ts`) |
| `AUTH_MODE` | `mock` em desenvolvimento |
| `FIELD_RULES_BLOCK_LABELS` | Rótulos dos dois blocos do chunk (um por parte) |
| `FIELD_RULES_PARTY_PREFIX` | Prefixo dos campos de parte no mapping BNPP, sem o número |
| `FIELD_RULES_FOUR_EYES` | `true`: quem carrega não pode aprovar |

Os valores reais dos prefixos ficam só no `.env` local, que não vai para o Git.

## 5.1 Configurar as consultas aos marts (DuckDB)

1. Copiar `apps/api/query-bindings.example.json` para `apps/api/query-bindings.json` (não vai para o Git).
2. Em `source`, o caminho dos ficheiros do mart (glob permitido, ex. `D:/dados/breaks/**/*.parquet`). Enquanto os ficheiros forem CSV: `"format": "csv"`.
3. Em `columns`, o nome real de cada coluna lógica. Datas em texto: `{ "column": "<nome>", "dateFormat": "%d/%m/%Y" }`.
4. No `.env`: `QUERY_BINDINGS_FILE=query-bindings.json`.

Os nomes reais ficam só neste ficheiro local.

## 6. Verificar e arrancar

```bash
npm test          # opcional, confirma que a instalação está completa
npm run dev       # API em http://localhost:3000/api, web em http://localhost:5173
```

Verificar a API: `http://localhost:3000/api/health` devolve `{"status":"ok"}`.

## 7. Teste de aceitação: regras de validação

1. Abrir `http://localhost:5173`, separador **Validation rules**.
2. Carregar os Excel (regras, action types, mapping DTCC ↔ BNPP; 1 a 3 ficheiros, até 10 MB cada).
3. Confirmar: número de campos igual ao do Excel; problemas do ficheiro esperados (ex. linha sem `Table`); `POSC` aparece como "not used" se a coluna não existir.
4. Mudar o "User (dev)" no topo para outro nome e aprovar um campo (4-eyes).
5. Exportar em JSON e Markdown e abrir os ficheiros.

Se a coluna `Table.Item` do mapping estiver formatada como número no Excel, `2.10` é lido como `2.1`: aparecem avisos `DUPLICATE_MAPPING` e `MAPPING_ID_MISMATCH`. Formatar a coluna como texto.

## 8. Problemas comuns

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `npm install` com `E401`/`E403` | Registo interno sem autenticação | Configurar o `.npmrc` com a equipa do registo |
| `403 ... Passwordexpired` no `npm ping` | Password antiga no URL do proxy (`HTTPS_PROXY`) | Tirar o registo interno do proxy (`NO_PROXY`, §3) e mudar a password |
| `InternetBrowsingBlocked` | O pedido ao registo interno está a passar pelo proxy | `NO_PROXY` com o host do registo (§3) |
| `E401 Incorrect or missing password` | Token em falta, expirado ou com a chave mal formada (sem `//`) | Apagar as linhas `_authToken` antigas e correr `npm login --auth-type=legacy` (§3) |
| `The term ... is not recognized` no PowerShell | Comando mal escrito, ou comando de cmd no PowerShell | Confirmar que a linha começa por `PS`; usar os comandos PowerShell do guia |
| `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` / `SELF_SIGNED_CERT_IN_CHAIN` | Proxy com CA interna | `cafile` no `.npmrc` e `NODE_EXTRA_CA_CERTS` para o Node |
| `esbuild` falha a instalar | Binário da plataforma não espelhado | Pedir `@esbuild/<plataforma>` no registo interno |
| `@duckdb/node-bindings*` falha a instalar | Binário do DuckDB para a plataforma não espelhado | Pedir o pacote da plataforma listado em `optionalDependencies` no registo interno |
| `/api/views/run` responde 503 "not configured" | Mart sem entrada no ficheiro de bindings, ou `QUERY_BINDINGS_FILE` em falta | Ver §5.1 |
| `/api/views/run` responde 500 com "Referenced column … not found" | Nome real de coluna errado no ficheiro de bindings | Corrigir o nome em `columns` |
| Aviso `MISSING_BUSINESS_DATES` | Dias úteis do período sem ficheiros no `source` | Confirmar se o mart foi processado nessas datas |
| `EADDRINUSE :3000` ou `:5173` | Porta ocupada | Mudar `PORT` (e o proxy do Vite) ou libertar a porta |
| Web abre mas dá erro de rede em `/api` | API não arrancou | Ver o output com prefixo `api` no terminal |
| Aviso "requer Node.js >= 20.12" | Node antigo | Atualizar o Node; sem isso o `.env` é ignorado |
| Upload responde 403 | Utilizador sem jurisdição EMIR | Em `mock`, o utilizador tem todas por defeito; ver `x-dev-jurisdictions` |

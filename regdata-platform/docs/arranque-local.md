# Arranque local

Guia para pôr a aplicação a correr numa máquina nova, incluindo dentro da rede do banco (registo npm interno, proxy, certificados).

Critério de conclusão: `http://localhost:5173` abre, o separador **Regras de validação** carrega um Excel e mostra os campos convertidos.

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

## 4. Instalar

```bash
cd regdata-platform
npm install
```

Pacotes que costumam falhar num registo interno: `@nestjs/*`, `vite`, `@vitejs/plugin-react`, `tsup` (usa `esbuild`, que descarrega um binário por plataforma), `exceljs`, `concurrently`. Se o `esbuild` falhar, o registo interno tem de espelhar também `@esbuild/<plataforma>` (ex. `@esbuild/win32-x64`).

O repositório ainda não tem `package-lock.json`: a primeira instalação bem-sucedida no banco deve gerar um e guardá-lo no Git interno, para que as instalações seguintes usem as mesmas versões.

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

## 6. Verificar e arrancar

```bash
npm test          # opcional, confirma que a instalação está completa
npm run dev       # API em http://localhost:3000/api, web em http://localhost:5173
```

Verificar a API: `http://localhost:3000/api/health` devolve `{"status":"ok"}`.

## 7. Teste de aceitação: regras de validação

1. Abrir `http://localhost:5173`, separador **Regras de validação**.
2. Carregar os Excel (regras, action types, mapping DTCC ↔ BNPP; 1 a 3 ficheiros, até 10 MB cada).
3. Confirmar: número de campos igual ao do Excel; problemas do ficheiro esperados (ex. linha sem `Table`); `POSC` aparece como "não usado" se a coluna não existir.
4. Mudar o "Utilizador (dev)" no topo para outro nome e aprovar um campo (4-eyes).
5. Exportar em JSON e Markdown e abrir os ficheiros.

Se a coluna `Table.Item` do mapping estiver formatada como número no Excel, `2.10` é lido como `2.1`: aparecem avisos `DUPLICATE_MAPPING` e `MAPPING_ID_MISMATCH`. Formatar a coluna como texto.

## 8. Problemas comuns

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| `npm install` com `E401`/`E403` | Registo interno sem autenticação | Configurar o `.npmrc` com a equipa do registo |
| `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` / `SELF_SIGNED_CERT_IN_CHAIN` | Proxy com CA interna | `cafile` no `.npmrc` e `NODE_EXTRA_CA_CERTS` para o Node |
| `esbuild` falha a instalar | Binário da plataforma não espelhado | Pedir `@esbuild/<plataforma>` no registo interno |
| `EADDRINUSE :3000` ou `:5173` | Porta ocupada | Mudar `PORT` (e o proxy do Vite) ou libertar a porta |
| Web abre mas dá erro de rede em `/api` | API não arrancou | Ver o output com prefixo `api` no terminal |
| Aviso "requer Node.js >= 20.12" | Node antigo | Atualizar o Node; sem isso o `.env` é ignorado |
| Upload responde 403 | Utilizador sem jurisdição EMIR | Em `mock`, o utilizador tem todas por defeito; ver `x-dev-jurisdictions` |

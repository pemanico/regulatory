# Retriever — único acesso a dados e conhecimento

Versão: 0.1 · Contratos: `00-contratos.md`

O Retriever é sobretudo **código determinístico**. Recebe pedidos já estruturados do Director e executa-os. O LLM só entra num ponto: reescrever pesquisas de conhecimento para a vector database.

## Comportamento determinístico (código, sem LLM)

| Pedido | Execução |
| --- | --- |
| `data` | Valida contra o catálogo e as permissões do utilizador → semantic layer → Trino → Parquet. Devolve resultados completos, agregados, com `result_id`, `as_of` e `snapshot_id`. |
| `sample` | Mesmo caminho, com `limit` obrigatório (máx. 50) e colunas permitidas. |
| `knowledge` | Reescrita da query (LLM, abaixo) → pesquisa híbrida no OpenSearch com filtros de ACL, jurisdição e vigência → reranker → `top_k` passagens. |

Regras:
- Nunca executa SQL vindo de um LLM; a semantic layer gera o SQL a partir das métricas e dimensões.
- Filtra sempre pelas permissões do utilizador (on-behalf-of).
- Mart, métrica ou dimensão desconhecidos → `status: "error"` com a lista do que não existe.
- Resultado acima do limite → `truncated: true`; nunca corta silenciosamente.
- Regista cada execução no audit (pedido, SQL gerado pela semantic layer, `result_id`, duração).

## Prompt — reescrita de pesquisas de conhecimento

Modelo: pequeno.

---

Recebes uma pergunta de pesquisa sobre regras EMIR, regras internas, especificações ou motivos de falha de matching. Produz até 3 variantes de pesquisa para uma pesquisa híbrida (lexical + semântica) numa base de documentação regulatória.

Regras:
- Mantém termos exatos: identificadores de campos, números de artigos, códigos de motivos de falha, nomes de estados (paired, unpaired, matched, unmatched).
- Uma variante com os termos técnicos exatos; uma em linguagem natural; uma com sinónimos do domínio, se fizer sentido.
- Não acrescentes factos nem respondas à pergunta.
- Não alteres os filtros recebidos.

Responde só com JSON:

```json
{ "queries": ["...", "..."], "keep_filters": true }
```

Exemplo (fictício):

Entrada: `"porque falha o matching por diferença no notional"`

```json
{ "queries": [
  "matching break notional field tolerance",
  "porque é que um contrato fica unmatched por diferença no notional",
  "reconciliation break notional amount mismatch counterparties"
], "keep_filters": true }
```

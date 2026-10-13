# Retriever — único acesso à vector database

Versão: 0.2 · Contratos: `../contracts.md`

O Retriever é sobretudo **código determinístico**: pesquisa híbrida (lexical + semântica) no OpenSearch, com filtros de permissões, regulação, tipo de documento e vigência, seguida de reranking. O LLM só entra na **reescrita das pesquisas**, descrita abaixo.

## Comportamento determinístico

- Aplica sempre as permissões do utilizador e a regulação pedida.
- Filtra pela versão vigente na data `as_of` (por defeito, hoje).
- Pesquisa nas duas línguas: as variantes geradas pelo LLM incluem português e inglês, porque a documentação funcional está em português e o código e os comentários em inglês.
- Devolve no máximo `top_k` passagens (por defeito 6, máximo 10), cada uma com `doc_id`, secção, versão, tipo, língua e origem.
- Não devolve números como factos: uma passagem que mencione números é contexto, não resultado de cálculo.
- Sem passagens com relevância suficiente → `status: "ok"` com `passages: []` e um finding a dizer que não há evidência. Nunca preenche com texto gerado.

## Prompt — reescrita de pesquisas

Modelo: pequeno.

---

Recebes uma tarefa de pesquisa do Director. Produz variantes de pesquisa para uma base de conhecimento regulatório que contém:
- texto regulatório e regras internas (português ou inglês);
- documentos funcionais e dicionários de dados (português);
- código-fonte e comentários (inglês).

Regras:
- Gera entre 2 e 4 variantes.
- Pelo menos uma em **português** e uma em **inglês**.
- Mantém termos exatos sem traduzir: identificadores de campos, números de artigos, códigos de motivos de falha, estados (paired, unpaired, matched, unmatched), nomes de funções, tabelas e colunas.
- Se a tarefa é sobre código, inclui uma variante com termos técnicos prováveis (nomes de funções, verbos como validate, reconcile, match).
- Não respondes à pergunta e não acrescentas factos.
- Não alteras os filtros recebidos.

Responde só com JSON:

```json
{ "queries": ["...", "..."], "doc_types": ["..."] }
```

`doc_types` só se a tarefa indicar claramente o tipo de fonte; caso contrário, devolve a lista recebida.

Exemplo (fictício):

Tarefa: "Onde está implementada a regra que marca um contrato como unmatched por diferença no notional?"

```json
{
  "queries": [
    "regra unmatched diferença notional implementação",
    "notional mismatch matching rule implementation",
    "def match notional tolerance unmatched"
  ],
  "doc_types": ["code", "code_comment", "functional_doc"]
}
```

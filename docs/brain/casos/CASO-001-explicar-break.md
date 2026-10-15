# CASO-001: perceber porque é que um campo está em break

> Sem dados reais (valores, trades); colunas reais nas fichas dos marts. Modelo de dados em [`../10-reconciliacao-emir.md`](../10-reconciliacao-emir.md).

| Campo | Valor |
| --- | --- |
| Id | CASO-001 |
| Jurisdição | EMIR |
| Quem faz hoje | Operacionais de reconciliação |
| Frequência | Diária (por business date, dias úteis) — volume por confirmar |
| Tempo gasto por execução | Por medir |
| Destinatário | Operacionais |
| Estado | Recebido (2026-10-15) |

## Pergunta de negócio

"Este trade tem o campo X em break. Porquê?"

## Como é feito hoje (Ordep, 2026-10-15)

1. O utilizador abre o mart de breaks ([`emir-recon-breaks`](../marts/emir-recon-breaks.md)) e vê o break: campo, valor da parte 1 (BNPP), valor da parte 2 (contraparte).
2. Vai ao ficheiro de regras de negócio (regras por campo + estado por action type) procurar o campo, para perceber o porquê do erro.
3. (A confirmar) o que faz a seguir: corrigir o próprio report, contactar a contraparte, ou só registar.

## Dados usados

| Fonte | O quê | Ligação |
| --- | --- | --- |
| Mart de breaks | Campo em break, valores das duas partes, chave do trade | — |
| Mapping | Campo em break → nome do campo / Table.Item | Nome do campo ou sufixo `TP1_`/`TP2_` (`10` §4.1) |
| Regras por campo | Formato, condições, códigos de erro | Table.Item |
| Estado por action type | M/C/O/NA do campo | Table.Item; action type do trade ignorado por agora (não vem nos ficheiros) |
| Recon status file | Valores de outros campos do mesmo trade, referidos nas condições ("if field 2.x …") | UTI + proprietary id + business date |

## Dores

- Pesquisa manual, break a break, num ficheiro grande de regras.
- As condições referem outros campos; para as avaliar é preciso ir buscar os valores desses campos ao recon status file.
- A regra diz o que é válido, não porque é que as duas partes divergem.

## Como a plataforma resolve (proposta, não decidida)

1. **Ligação determinística**, sem LLM: break → mapping → registo da regra aprovado na página Validation rules → estado M/C/O para o action type do trade.
2. **Contexto do trade**: valores das duas partes nos campos referidos nas condições (o conversor já extrai estas referências), lidos do recon status file.
3. **Verificações determinísticas** onde a regra o permite: campo obrigatório vazio num dos lados (quando o estado efetivo é M); valor fora da lista de valores permitidos; formato violado quando o formato é verificável.
4. **Explicação** pelo LLM a partir apenas da regra citada (FIELD_ID, condição, códigos de erro) e dos valores; nenhum número escrito pelo LLM.
5. Classificação do break: (a) um dos lados viola a regra → indica qual; (b) os dois lados são válidos → divergência de negócio que a regra não resolve; (c) campo sem regra no mapping.

- Exemplo de prompt: "Porque é que o trade X tem o campo Delivery type em break em 2026-10-12?" (fictício)

## Questões em aberto

- Volume de breaks por dia: decide se as explicações são pré-calculadas em batch ou geradas a pedido.
- O que o utilizador faz depois de perceber o break.
- Sem action type, o estado M/C/O mostra-se para todos os action types; proposta de estado efetivo quando é igual em todos (`10` §4.6).

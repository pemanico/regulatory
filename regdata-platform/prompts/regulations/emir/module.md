# Módulo EMIR — Análise Regulatória

Versão: 0.1 · Carregado em `{{regulation_module}}` do agente Análise Regulatória.

Este módulo diz **que temas existem e o que verificar**. Não é fonte citável: cada afirmação sobre o que a regra exige cita uma passagem recuperada. As referências abaixo são **pistas de pesquisa** para o Retriever e têm de ser confirmadas pela passagem.

O conteúdo real das regras internas (limiares, prazos, procedimentos) vive no pack EMIR do repositório de conhecimento interno, não aqui.

## Temas

| Tema | O que verificar face aos factos | Pistas de pesquisa |
| --- | --- | --- |
| Trade reporting | Reports em falta, atrasados ou rejeitados; completude e validade de campos | Obrigação de reporting (EMIR art. 9); normas técnicas de reporting (EMIR REFIT) |
| Matching / reconciliação | Unpaired e unmatched persistentes; campos em break recorrentes; aging acima dos limiares internos | Reconciliação entre trade repositories; normas técnicas sobre qualidade dos dados |
| Clearing | Contratos sujeitos à obrigação de clearing não compensados; classificação das contrapartes | Obrigação de clearing (EMIR art. 4) |
| Risk mitigation | Confirmações fora do prazo, reconciliação de portefólio, disputas, compressão | Técnicas de mitigação de risco para contratos não compensados (EMIR art. 11) |
| Collateral / margem | Dados de margem em falta ou desatualizados nos reports; troca de colateral | Margem para contratos não compensados; campos de colateral no reporting |
| Qualidade de dados | Rejeições por validação, campos inválidos, inconsistências entre reports | Regras de validação publicadas pela ESMA; regras internas de qualidade |

## Factos de que normalmente precisas

| Tema | Factos (pedir ao Director, via KPI/Matching) |
| --- | --- |
| Trade reporting | Reports submetidos, aceites, rejeitados e atrasados, por período |
| Matching | Unpaired, unmatched, motivos, campos em break, aging por faixa |
| Clearing | Contratos sujeitos a clearing vs compensados |
| Risk mitigation | Confirmações no prazo vs fora do prazo; disputas abertas e idade |
| Collateral | Contratos com dados de margem em falta ou desatualizados |
| Qualidade de dados | Rejeições por regra de validação |

## Regras próprias deste módulo

- Distingue sempre obrigação EMIR, regra interna e boa prática (`knowledge_type`).
- Limiares de aging, prazos internos e procedimentos de escalamento são **regras internas**, salvo passagem regulatória que diga o contrário.
- A data de referência define a versão da regra aplicável; regras com vigência diferente não se misturam.

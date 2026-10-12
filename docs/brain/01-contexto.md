# Contexto

## Equipa e utilizadores

- Equipa de IT de Regulatory Data no BNP Paribas.
- Jurisdições: EMIR, CFTC, MiFID TR.
- ~1000 utilizadores, sobretudo operacionais; também gestão interna.
- Âmbito termina nos reports, controlos, investigação e disponibilização de resultados. Não há resubmissões ao regulador.

## Stack existente

| Componente | Uso |
| --- | --- |
| Airflow | Orquestração |
| Spark / PySpark | ETL, controlos e regras de negócio |
| S3 + Parquet | Data lake e data marts |
| Oracle | Armazenamento por requisitos legais |
| Trino / ClickHouse | Consulta e investigação |
| Metabase | Self-service |
| Oracle APEX | Frontend atual, a substituir por React |

## Dados

- Raw (reguladores e sistemas internos) separado dos data marts.
- Cada data mart responde a uma necessidade de negócio.
- Marts ao nível da linha (um registo por caso), com as regras de negócio já aplicadas em PySpark no Airflow. Nada pré-agregado.
- Particionados por business date, separados por jurisdição.
- Armazenados em S3 Parquet. ClickHouse disponível como opção.
- Volume: milhões de linhas por mês.

## Problema

- Cerca de 50% do tempo da equipa vai para análise de erros e produção de reports (estimativa do Ordep, não medida).
- O que domina são reports operacionais recorrentes, feitos com análise e pivot em Excel.
- O volume ultrapassa o limite prático do Excel, o que obriga a extrações parciais e pré-agregações manuais.
- As definições reais dos KPIs vivem hoje nos Excels da equipa.

## Âmbito

Dentro:
- KPIs e métricas certificadas sobre os data marts.
- Pivot interativo e drill-through.
- Reports recorrentes automatizados; reports e KPIs por prompt.
- Explicação de regras, código e categorias de erro (agente com RAG).
- Jobs no Airflow a pedido, só por allowlist.

Fora:
- Identificação, classificação e validação de erros (já existe, inclui ML).
- Resubmissões.
- Reports para reguladores ou auditoria externa.
- Alteração de dados de origem.

## Objetivo mensurável

Zero reports recorrentes produzidos manualmente em Excel. Exportações pontuais continuam permitidas e são medidas.

# ADR-001: motor do caminho interativo

**Estado:** aceite · 2026-10-10

## Contexto

Os data marts estão em S3 Parquet, ao nível da linha, particionados por business date.
O pivot interativo exige p95 abaixo de 2 s nos pivots típicos.

## Decisão

Começar com S3 Parquet via Trino, através da semantic layer (Cube). Manter o ClickHouse como opção.

## Porque é reversível

Frontend e backend falam só com a semantic layer. Mudar a fonte de um mart de Trino
para ClickHouse é configuração do Cube, não reescrita da aplicação. Fontes mistas são
possíveis: reports em Trino, pivot em ClickHouse.

## Opções intermédias

1. Otimizar os ficheiros Parquet (tamanho, ordenação, estatísticas).
2. Pre-aggregations do Cube.
3. ClickHouse a ler S3 diretamente.
4. Carga em tabelas nativas do ClickHouse.

## Critério para mudar

p95 dos pivots típicos acima de 2 s no benchmark, ou degradação do cluster com a
concorrência do piloto.

## Atualização 2026-10-13

Os dados calculados podem estar em ClickHouse ou em Parquet, consoante o mart (definido pelo Ordep). A semantic layer encaminha cada query para o motor do mart; os agentes e a aplicação não escolhem. Parquet é a cópia de referência; o ClickHouse é cópia derivada. Regras de consistência: `docs/brain/08-agentic-rag-multi-regulatory.md` §2.

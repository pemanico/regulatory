# ADR-005: motor de consulta da primeira fase

**Estado:** proposto · 2026-10-15 (questão #42)

## Contexto

Primeira fase: explicar breaks e KPIs sobre breaks por prompt (opção B: spec validada → compilador determinístico → SQL sobre Parquet). Um único mart de breaks e o recon status file, particionados por business date. O ADR-001 prevê Cube sobre Trino, que exige infraestrutura que ainda não existe para a aplicação.

## Proposta

DuckDB embebido no NestJS, a ler os ficheiros Parquet diretamente (local ou S3). O compilador gera SQL para o DuckDB a partir das métricas definidas em código; nenhum SQL vem do LLM no caminho principal.

## Porque é reversível

A aplicação fala com uma interface `QueryEngine` (spec → linhas). O compilador para DuckDB pode ser trocado por Cube/Trino ou ClickHouse sem mudar a API nem a interface.

## Riscos

- Binário nativo: o pacote npm do DuckDB descarrega um binário por plataforma, que tem de existir no registo npm interno (mesmo problema do esbuild).
- Memória do processo da API com partições grandes; mitigação: ler só as partições da business date pedida e projetar só as colunas usadas.
- Acesso a S3 a partir da máquina onde corre a API (credenciais, proxy).

## Critério para mudar

Volume ou concorrência que o processo da API não aguente, ou necessidade de partilhar métricas com outros consumidores (aí, Cube).

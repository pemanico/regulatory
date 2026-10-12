# Glossário

| Termo | Significado no projeto |
| --- | --- |
| Data mart | Tabela em S3 Parquet, ao nível da linha, com regras de negócio aplicadas, que responde a uma necessidade de negócio |
| Raw | Dados de origem (reguladores e sistemas internos), separados dos marts |
| Business date | Data de negócio; chave de partição dos marts |
| Jurisdição | EMIR, CFTC ou MiFID TR; os marts são separados por jurisdição |
| Semantic layer | Camada (Cube) onde as métricas são definidas uma vez e calculadas para todos os canais |
| Métrica certificada | Métrica com definição aprovada pelo owner de negócio, versionada |
| Métrica aditiva | Pode ser somada entre linhas (contagens). Taxas e percentagens não são aditivas |
| Spec de vista | JSON com mart, métricas, dimensões, filtros e período; produzida pelo agente ou pelo pivot, nunca contém SQL |
| Ficha de mart | Descrição estruturada de um data mart no catálogo |
| Ficha de regra | Descrição estruturada de uma regra de negócio, gerada a partir do PySpark e revista por humano |
| Drill-through | Descer de um número agregado até às linhas que o compõem |
| Fast path | Pedido simples respondido diretamente pela semantic layer, sem loop de agente |
| Allowlist de DAGs | Lista fechada de DAGs Airflow que o agente pode disparar |
| UTI / USI / TRN | Identificadores de transação (EMIR / CFTC / MiFID) |
| DTCC GTR | Repositório de transações usado nas reconciliações |
| Documentação como código | Documentação em ficheiros de texto (Markdown, CSV, YAML) versionada em Git, com revisão por PR |
| Documento funcional | Spec em Markdown com front matter (id, owner, versão, vigência, jurisdição, ligações a regras/marts/métricas) |
| Front matter | Bloco YAML no topo de um Markdown com os metadados do documento |

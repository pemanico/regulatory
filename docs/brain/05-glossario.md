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
| Pairing | Encontrar o mesmo contrato reportado pelas duas contrapartes; unpaired = sem par encontrado |
| Matching | Comparar os campos de um contrato paired; unmatched = paired mas com campos em break |
| Campo em break | Campo cujo valor difere entre as duas contrapartes num contrato paired |
| Aging | Dias desde que o contrato está unmatched (ou unpaired) até à data de referência |
| Director | Agente orquestrador do sistema EMIR Matching; não acede a dados nem faz RAG |
| Resumo de regras (rules digest) | Resumo curado e versionado das regras EMIR e internas, incluído no prompt do Director |
| Placeholder de valor | `{{result_id:row:column}}`: referência a um número nos resultados, substituída pelo backend; os LLMs nunca escrevem números |
| Pack de regulação | Pasta no repositório de conhecimento com manifesto, resumo de regras, módulo de análise, KPIs, marts e golden set de uma regulação |
| Tipo de pedido | Classificação do Director: context, calculation, mixed, regulatory_assessment, general, out_of_scope |
| Runtime de orquestração | Código no NestJS que executa os planos do Director, injeta resultados, aplica limites e corre os validadores |
| Enrichment | Pipeline offline que prepara documentos, código, comentários e metadados dos Parquet para a vector DB |

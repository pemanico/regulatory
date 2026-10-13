# ADR-004: field rules converter in TypeScript inside the application

**Status:** accepted · 2026-10-13

## Context

The EMIR field-level validation rules (rules, action type statuses, DTCC-to-BNPP mapping) live in Excel files that cannot leave the bank. Ordep wants a web page to upload them and let users validate the converted rules before they reach the RAG.

## Decision

- The converter is a TypeScript package (`@regdata/field-rules`) with pure functions over sheets of text cells; the API reads `.xlsx` with `exceljs` and calls it.
- Rules and action types are joined by `Table` + `Item`; `Section` and `Field` are only verified. The mapping is joined by normalised field name (it has no `Table.Item`).
- Empty or unknown status cells are errors, never defaulted to `NA`; `-` means `NA`.
- Review is field by field with four-eyes (the uploader cannot review); fields with errors cannot be approved.
- Uploads are kept in memory for now; approved fields are exported as JSON records and Markdown chunks.

## Consequences

- No separate Python tool to install in the bank: the page runs with the rest of the application.
- Restarting the API loses uploads and reviews until persistence is added (open question #34).
- Indexing in OpenSearch and writing to the internal Git are the next steps.

# Contratos entre agentes — EMIR Matching

Versão: 0.1 (proposta). Todas as mensagens são JSON. Uma resposta que não respeite o contrato é tratada como falha do agente.

Os exemplos usam **nomes fictícios**. Os ids reais de marts, métricas e dimensões vêm do catálogo no Git interno.

## Tipos comuns

```ts
type Jurisdiction = "EMIR";
type IsoDate = string;               // "AAAA-MM-DD"
type ResultStatus = "ok" | "missing_data" | "out_of_scope" | "error";

interface Period { from: IsoDate; to: IsoDate; as_of?: IsoDate }   // as_of: data de referência para aging/estado

interface Filter {
  dimension: string;                 // id do catálogo
  operator: "eq" | "neq" | "in" | "not_in" | "gte" | "lte" | "between";
  values: (string | number)[];
}

interface Assumption { text: string; reason: string }   // o que foi assumido e porquê
interface EvidenceRef { kind: "result" | "doc"; id: string }
```

## Pedido do utilizador → Director

```ts
interface UserRequest {
  request_id: string;
  user: { id: string; jurisdictions: Jurisdiction[] };
  message: string;
  conversation: { role: "user" | "assistant"; content: string }[];   // turnos anteriores
  catalog: CatalogSummary;           // marts, métricas certificadas e dimensões visíveis para o utilizador
  rules_digest_version: string;      // versão do resumo de regras incluído no prompt
}
```

## Decisão do Director

```ts
type DirectorDecision =
  | { action: "clarify"; questions: string[]; reason: string }                   // máx. 3 perguntas
  | { action: "plan"; understanding: Understanding; plan: Plan }
  | { action: "respond"; response: FinalResponse }                               // só após validação
  | { action: "reject"; reason: string };                                        // fora do âmbito

interface Understanding {
  intent: "kpi" | "matching_analysis" | "compliance_check" | "table" | "explain_rule" | "mixed";
  scope: { jurisdiction: Jurisdiction; period: Period; filters: Filter[] };
  requested_outputs: ("kpis" | "table" | "analysis" | "compliance")[];
  assumptions: Assumption[];
}

interface Plan {
  plan_id: string;
  iteration: number;                 // 0 no primeiro plano; máx. 2 replaneamentos
  steps: PlanStep[];
}

interface PlanStep {
  step_id: string;
  agent: "retriever" | "matching" | "kpi" | "emir_analysis" | "tables";
  depends_on: string[];              // step_ids; o backend injeta os resultados destes passos em `inputs`/`results`
  input: RetrieverRequest | SpecialistRequest | TablesRequest;
  purpose: string;
}
```

## Retriever

```ts
type RetrieverRequest = DataRequest | KnowledgeRequest | SampleRequest;

interface DataRequest {              // números completos, nunca via vector DB
  kind: "data";
  mart_id: string;
  metrics: string[];                 // ids de métricas certificadas
  group_by: string[];                // dimensões
  filters: Filter[];
  period: Period;
  order_by?: { field: string; direction: "asc" | "desc" }[];
  limit?: number;                    // para rankings (ex. top 10 contrapartes)
}

interface SampleRequest {            // linhas ilustrativas, sempre limitadas
  kind: "sample";
  mart_id: string;
  columns: string[];
  filters: Filter[];
  period: Period;
  limit: number;                     // máx. 50
}

interface KnowledgeRequest {         // regras, specs, motivos de falha
  kind: "knowledge";
  query: string;
  filters: { jurisdiction?: Jurisdiction | "ALL"; doc_type?: string[]; as_of?: IsoDate };
  top_k: number;                     // máx. 8
}

interface RetrieverResult {
  status: ResultStatus;
  result_id: string;
  kind: "data" | "sample" | "knowledge";
  as_of?: IsoDate;
  snapshot_id?: string;              // identifica a versão dos dados
  columns?: { name: string; type: string }[];
  rows?: (string | number | null)[][];
  row_count?: number;
  truncated?: boolean;
  passages?: { doc_id: string; title: string; section: string; version: string; text: string }[];
  error?: string;
}
```

## Especialistas (Matching, KPI, Análise EMIR)

```ts
interface SpecialistRequest {
  task: string;                      // o que o Director quer, numa frase
  scope: Understanding["scope"];
  inputs: RetrieverResult[];         // dados e passagens já recolhidos
  constraints?: string[];
}

interface SpecialistResult {
  status: ResultStatus;
  findings: Finding[];
  missing_data?: RetrieverRequest[]; // o que faltaria para responder; o Director decide
  assumptions: Assumption[];
}

interface Finding {
  id: string;
  statement: string;                 // sem números novos: números só por referência
  values?: { label: string; result_id: string; row: number; column: string }[];
  evidence: EvidenceRef[];
  severity?: "info" | "attention" | "critical";
  confidence: "high" | "medium" | "low";
}
```

## Tabelas / Reporting

```ts
interface TablesRequest {
  audience: "operacionais" | "gestao";
  findings: Finding[];
  results: RetrieverResult[];
}

interface TableSpec {
  table_id: string;
  title: string;
  source_result_id: string;
  columns: { source_column: string; header: string; format: "integer" | "decimal_2" | "percent_1" | "date" | "text" | "currency" }[];
  sort?: { column: string; direction: "asc" | "desc" }[];
  highlight?: { column: string; rule: "gt" | "lt"; threshold: number; style: "attention" | "critical" }[];
  totals_row: boolean;
  notes: string[];                   // sem números novos
}

interface TablesResult {
  status: ResultStatus;
  tables: TableSpec[];
  kpi_cards: { label: string; result_id: string; row: number; column: string; format: TableSpec["columns"][number]["format"] }[];
}
```

## Resposta final

```ts
interface FinalResponse {
  summary: string;                   // 2–4 frases; números só via placeholders {{result_id:row:column}}
  kpi_cards: TablesResult["kpi_cards"];
  tables: TableSpec[];
  findings: Finding[];
  assumptions: Assumption[];
  evidence: EvidenceRef[];
  limitations: string[];             // o que não foi possível responder
}
```

O backend substitui os placeholders pelos valores dos resultados. Um placeholder que não resolve bloqueia a resposta.

# Agent contracts

Version: 0.2 (proposal). All messages are JSON, validated against these schemas by the orchestration runtime. A response that does not match counts as an agent failure.

Examples use **fictitious** ids. Real metric, mart and dimension ids come from the regulation packs in the internal knowledge repository.

## Common types

```ts
type RegulationId = "EMIR" | "MIFIR" | "SEC" | "CFTC" | "CA";   // only packs with status=active are usable
type RequestType = "context" | "calculation" | "mixed" | "regulatory_assessment" | "general" | "out_of_scope";
type AgentName = "retriever" | "kpi" | "matching" | "regulatory_analysis" | "tables" | "general";
type IsoDate = string;                                        // "YYYY-MM-DD"
type Status = "ok" | "needs" | "out_of_scope" | "error";

interface Period { from: IsoDate; to: IsoDate; as_of?: IsoDate }

interface Filter {
  dimension: string;
  operator: "eq" | "neq" | "in" | "not_in" | "gte" | "lte" | "between";
  values: (string | number)[];
}

interface Assumption { text: string; reason: string }
interface EvidenceRef { kind: "result" | "doc"; id: string }
interface ValueRef { label: string; result_id: string; row: number; column: string }
```

## Runtime → Director

```ts
interface DirectorInput {
  request_id: string;
  user: { id: string; regulations: RegulationId[]; language: "pt" | "en" | string };
  message: string;
  conversation: { role: "user" | "assistant"; content: string }[];
  packs: PackSummary[];                 // active regulation packs visible to the user
  run_state?: RunState;                 // present after a plan was executed
  validator_report?: ValidatorReport;   // present after a plan was executed
}

interface PackSummary {
  regulation: RegulationId;
  version: string;
  topics: string[];
  kpi_catalog: { id: string; label: string; category: string; status: "certified" | "draft"; dimensions: string[] }[];
  digest: string;                       // curated rules digest (Portuguese)
  routing_hints: string;
}
```

## Director → Runtime

```ts
type DirectorDecision =
  | { action: "clarify"; classification: Classification; questions: string[]; reason: string }   // max 3 questions
  | { action: "plan"; classification: Classification; plan: Plan }
  | { action: "respond"; classification: Classification; response: FinalResponse }
  | { action: "reject"; classification: Classification; reason: string };

interface Classification {
  regulation: RegulationId | "CROSS" | "NONE";
  request_type: RequestType;
  scope: { period?: Period; filters: Filter[] };
  requested_outputs: ("answer" | "kpis" | "table" | "analysis" | "assessment")[];
  assumptions: Assumption[];
}

interface Plan {
  plan_id: string;
  iteration: number;                    // 0 first; max 2 re-plans
  steps: PlanStep[];
}

interface PlanStep {
  step_id: string;
  agent: AgentName;
  depends_on: string[];                 // the runtime injects the outputs of these steps into `context`
  task: string;                         // one clear sentence
  params?: Record<string, unknown>;     // agent-specific, see below
}
```

## Runtime → Agent

```ts
interface AgentRequest {
  request_id: string;
  step_id: string;
  regulation: RegulationId | "CROSS" | "NONE";
  task: string;
  params?: Record<string, unknown>;
  scope: Classification["scope"];
  context: AgentResult[];               // outputs of the steps this one depends on
  user_language: string;
}
```

## Agent → Runtime

```ts
interface AgentResult {
  agent: AgentName;
  step_id: string;
  status: Status;
  findings: Finding[];
  results?: DataResult[];               // KPI, Matching: outputs of ClickHouse tools
  passages?: Passage[];                 // Retriever
  table_specs?: TableSpec[];            // Tables
  kpi_cards?: ValueRef[];               // Tables
  needs?: Need[];                       // what is missing; the Director decides
  assumptions: Assumption[];
}

interface Finding {
  id: string;
  statement: string;                    // no numbers in free text; use `values`
  values?: ValueRef[];
  evidence: EvidenceRef[];
  severity?: "info" | "attention" | "critical";
  confidence: "high" | "medium" | "low";
  knowledge_type?: "regulatory" | "internal_rule" | "practice" | "general";
}

interface Need {
  kind: "context" | "data" | "clarification";
  description: string;
  suggested_agent?: AgentName;
  params?: Record<string, unknown>;
}
```

## Tools used by KPI and Matching (ClickHouse through the semantic layer)

```ts
// metrics.query: no SQL; the semantic layer generates it
interface MetricsQuery {
  regulation: RegulationId;
  metrics: string[];                    // certified metric ids
  group_by: string[];
  filters: Filter[];
  period: Period;
  order_by?: { field: string; direction: "asc" | "desc" }[];
  limit?: number;
}

// matching.breakdown: parameterised template
interface MatchingBreakdown {
  regulation: RegulationId;
  by: ("status" | "failure_reason" | "field_in_break" | "aging_bucket" | "counterparty_group" | "product_type")[];
  filters: Filter[];
  period: Period;
}

// records.sample: illustrative rows only
interface RecordsSample {
  regulation: RegulationId;
  mart_id: string;
  columns: string[];
  filters: Filter[];
  period: Period;
  limit: number;                        // max 50
}

interface DataResult {
  result_id: string;
  tool: "metrics.query" | "matching.breakdown" | "records.sample";
  as_of: IsoDate;
  snapshot_id: string;
  columns: { name: string; type: string }[];
  rows: (string | number | null)[][];
  row_count: number;
  truncated: boolean;
  metric_versions: Record<string, string>;
}
```

## Retriever

```ts
interface RetrieverParams {
  query: string;
  regulation?: RegulationId | "ALL";
  doc_types?: ("regulation" | "internal_rule" | "functional_doc" | "data_dictionary" | "code" | "code_comment" | "runbook")[];
  as_of?: IsoDate;                      // effective version on this date
  top_k?: number;                       // default 6, max 10
}

interface Passage {
  doc_id: string;
  title: string;
  section: string;
  version: string;
  doc_type: string;
  language: "pt" | "en";
  source_uri: string;
  text: string;
  score: number;
}
```

## Tables

```ts
interface TableSpec {
  table_id: string;
  title: string;
  source_result_id: string;
  columns: { source_column: string; header: string; format: "integer" | "decimal_2" | "percent_1" | "date" | "text" | "currency" }[];
  sort?: { column: string; direction: "asc" | "desc" }[];
  highlight?: { column: string; rule: "gt" | "lt"; threshold: number; style: "attention" | "critical" }[];
  totals_row: boolean;                  // only for additive metrics
  notes: string[];                      // no numbers
}
```

## Final response

```ts
interface FinalResponse {
  language: string;
  summary: string;                      // numbers only as {{result_id:row:column}}
  kpi_cards: ValueRef[];
  tables: TableSpec[];
  findings: Finding[];
  assumptions: Assumption[];
  evidence: EvidenceRef[];
  limitations: string[];
}
```

The backend replaces placeholders with values from the results. An unresolved placeholder blocks the answer.

## Validator report (runtime → Director)

```ts
interface ValidatorReport {
  passed: boolean;
  checks: { id: string; passed: boolean; detail: string; result_ids: string[] }[];
}
```

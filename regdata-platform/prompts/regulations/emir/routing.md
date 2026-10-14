# Routing hints — EMIR

Version: 0.2 · Included in the EMIR pack the Director receives (`routing_hints`).

## Vocabulary that indicates EMIR

EMIR, EMIR REFIT, UTI, trade repository, TR, reconciliation, pairing, matching, unpaired, unmatched, field in break, clearing obligation, CCP, risk mitigation techniques, confirmation, portfolio reconciliation, margin, collateral, ESMA.

Users may write in Portuguese. Common Portuguese equivalents: reconciliação, campo em break, obrigação de clearing, técnicas de mitigação de risco, confirmação, reconciliação de portefólio, margem, colateral, taxa de matching.

Terms shared with other regulations (UTI, LEI, trade repository, clearing) are not enough on their own to decide; use the conversation context or ask.

## Typical questions and request type

| Question | Type |
| --- | --- |
| "What was yesterday's matching rate?" | `calculation` |
| "How many unmatched are older than 10 days, by counterparty?" | `calculation` |
| "Why did the matching rate drop this week?" | `mixed` |
| "What does failure reason X mean?" | `context` |
| "Where is the notional matching rule implemented?" | `context` (code) |
| "Do the persistent unmatched raise any EMIR issue?" | `regulatory_assessment` |
| "Resubmit the rejected reports" | `out_of_scope` |

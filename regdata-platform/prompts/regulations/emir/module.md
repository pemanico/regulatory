# EMIR module — Regulatory Analysis

Version: 0.2 · Loaded into `{{regulation_module}}` of the Regulatory Analysis agent.

This module states **which topics exist and what to check**. It is not a citable source: every statement about what a rule requires cites a retrieved passage. The references below are **search hints** for the Retriever and must be confirmed by the passage.

The actual content of the internal rules (thresholds, deadlines, procedures) lives in the EMIR pack of the internal knowledge repository, not here.

## Topics

| Topic | What to check against the facts | Search hints |
| --- | --- | --- |
| Trade reporting | Missing, late or rejected reports; field completeness and validity | Reporting obligation (EMIR art. 9); reporting technical standards (EMIR REFIT) |
| Matching / reconciliation | Persistent unpaired and unmatched; recurring fields in break; aging above internal thresholds | Reconciliation between trade repositories; technical standards on data quality |
| Clearing | Contracts subject to the clearing obligation that are not cleared; counterparty classification | Clearing obligation (EMIR art. 4) |
| Risk mitigation | Late confirmations, portfolio reconciliation, disputes, compression | Risk mitigation techniques for non-cleared contracts (EMIR art. 11) |
| Collateral / margin | Missing or outdated margin data in reports; collateral exchange | Margin for non-cleared contracts; collateral fields in reporting |
| Data quality | Validation rejections, invalid fields, inconsistencies between reports | Validation rules published by ESMA; internal quality rules |

## Facts you usually need

| Topic | Facts (request from the Director, via KPI/Matching) |
| --- | --- |
| Trade reporting | Reports submitted, accepted, rejected and late, by period |
| Matching | Unpaired, unmatched, reasons, fields in break, aging by bucket |
| Clearing | Contracts subject to clearing vs cleared |
| Risk mitigation | Timely vs late confirmations; open disputes and their age |
| Collateral | Contracts with missing or outdated margin data |
| Data quality | Rejections by validation rule |

## Rules specific to this module

- Always distinguish an EMIR obligation, an internal rule and a good practice (`knowledge_type`).
- Aging thresholds, internal deadlines and escalation procedures are **internal rules**, unless a regulatory passage says otherwise.
- The reference date defines the applicable rule version; rules with different effective dates are not mixed.

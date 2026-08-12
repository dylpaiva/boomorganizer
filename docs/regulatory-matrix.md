# PyroLedger Regulatory Matrix

**Status:** Baseline structure; rule population pending source verification.  
**Branch:** `docs/chatgpt`

## 1. Purpose

This document defines the structure used to represent regulatory requirements without conflating federal explosives storage/recordkeeping, transportation, state/local requirements, company policy, or best practices.

## 2. Required rule fields

| Field | Requirement |
|---|---|
| Rule ID | Stable identifier for the application rule |
| Authority | Regulatory authority/source owner |
| Citation | Exact citation or source locator |
| Source document | Document or official source |
| Effective date | Date the rule version becomes effective |
| Rule version | Version/edition tracked by the system |
| Applicability | Conditions under which the rule applies |
| Jurisdiction | Federal/state/local/AHJ/company scope |
| Software requirement | Product behavior required by the rule |
| Triggering event | Event that causes evaluation |
| Required data | Data required to evaluate the rule |
| Result | Warning, requirement, exception, evidence requirement, or review state |
| Evidence/report | Artifact produced or linked |
| Human review | Whether human review is required |

## 3. Regulatory domains

### ATF

Scope: federal explosives storage, licensing/permit-related records, and other applicable ATF requirements represented by verified project sources.

### DOT/PHMSA

Scope: transportation and hazardous-material requirements represented by verified project sources.

### State

Scope: state requirements. State rules must be separately identified from federal rules.

### Local/AHJ

Scope: local authority, fire authority, or other applicable authority having jurisdiction.

### Company policy

Operational requirements established by the organization. Company policy must never be presented as law or regulation.

### Best practice

Operational guidance that is not represented as a legal requirement.

## 4. Rule evaluation principles

- Never infer a regulated classification solely from a product name.
- Never synthesize a regulatory requirement without a source.
- Preserve the source domain on every evaluation result.
- Preserve rule version and effective date used for an evaluation.
- A software warning is not itself a legal conclusion.
- When source support is missing, create a `REGULATORY VERIFICATION REQUIRED` item.

## 5. Initial rule inventory status

**SOURCE GAP:** The previously referenced PyroLedger Final Regulatory & Product Report and PyroLedger Regulatory Data Model & Compliance Matrix are not present in the inspected `main` repository tree. No populated legal requirements are being fabricated in this baseline.

## 6. Required implementation behavior

A regulatory rule record should be immutable by version. New legal/regulatory revisions create a new rule version rather than rewriting historical rule meaning. Evaluations must retain the rule version that produced the result.

## 7. Verification queue

1. Import or otherwise make available the project regulatory report.
2. Import or otherwise make available the project regulatory data model/compliance matrix.
3. Validate each rule against its stated authority and citation.
4. Record effective dates and applicability.
5. Map verified rules to software requirements and evidence outputs.
6. Identify rules requiring human review.

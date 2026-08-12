# PyroLedger Roadmap

**Status:** Initial product roadmap baseline  
**Branch:** `docs/chatgpt`

## Phase 0 — Specification foundation

- Establish authoritative documentation structure.
- Establish architecture decisions.
- Establish regulatory source/rule model.
- Establish domain/database/API/security requirements.
- Establish UX architecture.
- Identify unresolved decisions and verification gaps.

## Phase 1 — Core inventory vertical slice

Organization -> User -> Product -> Magazine -> Inventory Lot -> Receive Inventory -> Move Inventory -> Immutable Transaction History -> Physical Count -> Variance Investigation -> Audit Report.

Exit criteria:

- event-derived inventory is reconstructable;
- regulated events are immutable;
- corrections/reversals are attributable;
- organizations are isolated;
- physical variance does not silently mutate ledger state;
- audit report can be generated.

## Phase 2 — Magazine operations

- Magazine daily close.
- Magazine inspections.
- Inspection evidence and review queue.
- Daily summary reporting.

## Phase 3 — Show operations

- Show management.
- Show packages.
- Inventory allocation/loadout.
- Delivery/use tracking.
- Returns and reconciliation.

## Phase 4 — Reporting and compliance evidence

- Report/export center.
- Inspection-ready reports.
- Evidence/document management.
- Compliance exception/review workflows.
- Versioned regulatory rule evaluation.

## Phase 5 — Transportation

- Shipment workflow.
- Transportation document management.
- DOT/PHMSA-specific rules and evidence kept distinct from ATF/storage logic.

## Phase 6 — Offline hardening

- Offline event capture.
- Reliable synchronization.
- Explicit conflict workflow.
- Reconciliation tooling.
- Field resilience and recovery testing.

## Deferred scope

E-commerce, accounting, payroll, POS, generalized CRM, and full site-plan design remain outside the initial production scope.

## Gating rule

No feature implementation should proceed where the required specification is missing. Regulatory behavior is gated by verified source material and versioned rules.

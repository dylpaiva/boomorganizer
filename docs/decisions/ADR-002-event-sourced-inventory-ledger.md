# ADR-002: Event-Sourced Inventory Ledger

**Status:** Accepted  
**Date:** 2026-08-12

## Context

PyroLedger must preserve a reconstructable history of regulated inventory movements, custody changes, corrections, and dispositions.

## Decision

Use an append-only inventory event ledger as the authoritative source of inventory state. Current inventory quantities are projections derived from events and are not authoritative editable fields.

Corrections and reversals create new events referencing the original event. Regulated events are never silently edited or deleted.

## Consequences

Historical inventory state can be reconstructed and audited. Reporting and physical reconciliation can compare observed state against ledger-derived state. Event schemas must be carefully versioned and validated.

## Rejected alternative

An editable `quantity_on_hand` field as the primary source of truth is rejected because it cannot reliably reconstruct custody history or explain historical corrections.

## Implementation gate

**DECISION REQUIRED:** Finalize quantity/unit semantics and event-state projection rules before implementation.

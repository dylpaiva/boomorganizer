# ADR-006: Regulatory Rule Versioning

**Status:** Accepted  
**Date:** 2026-08-12

## Context

Regulatory requirements can change over time. Historical reviews and generated reports must remain explainable using the rule version that was applicable to the evaluation.

## Decision

Represent Regulatory Source, Regulatory Rule, and Regulatory Rule Version as separate concepts. A new effective rule revision creates a new version rather than mutating the meaning of a historical version.

Evaluation results retain the exact rule version used. Rule records include authority, citation, source, effective date, applicability, jurisdiction, software requirement, and evidence/report mapping.

## Consequences

Historical evaluations remain reproducible and auditable. Regulatory administration requires source/version lifecycle management.

## Implementation gate

**REGULATORY VERIFICATION REQUIRED:** Define the authoritative source ingestion/update process from the approved project regulatory materials.

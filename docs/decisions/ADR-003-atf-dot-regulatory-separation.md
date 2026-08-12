# ADR-003: ATF/DOT Regulatory Separation

**Status:** Accepted  
**Date:** 2026-08-12

## Context

PyroLedger covers both storage/recordkeeping workflows and transportation workflows. Treating these authorities as one compliance dataset would obscure the source and applicability of requirements.

## Decision

ATF requirements and DOT/PHMSA requirements are modeled as distinct regulatory domains. State/local/AHJ requirements are also separately modeled. Company policy and best practices are not presented as law.

Rule evaluations retain authority, citation, source, effective date, version, applicability, jurisdiction, and the resulting software requirement/evidence.

## Consequences

Users can identify why a warning exists and which source domain produced it. Regulatory rule changes can be versioned independently.

## Implementation gate

**REGULATORY VERIFICATION REQUIRED:** Populate actual ATF and DOT rule records only from approved source materials.

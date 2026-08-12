# ADR-005: Multi-Tenant Isolation

**Status:** Accepted  
**Date:** 2026-08-12

## Context

PyroLedger may contain sensitive inventory, magazine, personnel, license, shipment, and compliance evidence data for multiple organizations.

## Decision

Organization is the primary tenant boundary. Every tenant-owned record must be attributable to an organization, and every protected operation must perform server-side authorization against both organization scope and role/permission.

Client-provided organization identifiers are never trusted as authorization evidence.

## Consequences

Tenant isolation becomes a core domain invariant rather than an optional application filter. Database constraints, query patterns, API authorization, tests, and audit records must all preserve tenant scope.

## Implementation gate

**DECISION REQUIRED:** Define organization membership model, cross-organization administrative roles if any, and database enforcement strategy.

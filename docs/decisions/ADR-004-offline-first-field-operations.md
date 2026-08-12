# ADR-004: Offline-First Field Operations

**Status:** Accepted  
**Date:** 2026-08-12

## Context

PyroLedger must support field operations where connectivity may be intermittent or unavailable.

## Decision

Use IndexedDB/Dexie for an offline command/event queue. Each queued operation receives a unique client identifier and retains actor, client timestamp, synchronization state, and the payload required for server revalidation.

The server remains authoritative. Synchronization is idempotent. Conflicts are explicit and require reconciliation; a client cannot silently overwrite an authoritative server event.

## Consequences

Field users can continue capturing operational events while offline. The product requires durable queue state, retry semantics, reconciliation UX, and server-side revalidation.

## Implementation gate

**DECISION REQUIRED:** Define exact sync protocol, conflict taxonomy, retry/backoff policy, and user reconciliation workflow.

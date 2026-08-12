# Inventory Core Implementation Notes

**Branch:** `feature/inventory-core`
**Scope:** Organization-scoped inventory core only.
**Status:** Implemented and locally validated.

## Implemented Slice

The implementation follows the approved monorepo structure. The web application is located in `apps/web`, the FastAPI service is in `apps/api`, PostgreSQL/Alembic material is in `database`, and shared package boundaries are reserved under `packages`. The synchronized authoritative documentation remains unchanged in `docs`.

| Area | Implemented behavior |
| --- | --- |
| Identity and authorization | Supabase JWT verification boundary, application `users`, organizations, memberships, roles, permissions, and server-side permission checks. |
| Inventory authority | An append-only `inventory_events` ledger with UUID identifiers, `NUMERIC(18,4)` quantities, one operational unit per lot, organization-scoped idempotency, and PostgreSQL triggers that reject event update and delete operations. |
| Field commands | Receipt, movement, adjustment, correction, reversal, and physical-count commands. Each requires an `Idempotency-Key`; the server generates event identity and recorded time. |
| Derived state | Location balances are projected from inventory events. No authoritative mutable on-hand quantity is stored. |
| Reconciliation | Physical counts preserve observed quantity separately. A difference creates an open variance rather than altering ledger custody. |
| Evidence | Audit events are written for accepted inventory commands, physical counts, created variances, and variance resolutions. |
| Web workflow | A mobile-responsive inventory console submits authenticated API commands and explains server-authoritative, tenant-scoped, append-only behavior. |

## Migration

The initial migration is `database/migrations/versions/20260812_0001_inventory_core.py`. It creates organization, membership/RBAC, operational inventory, audit, and deferred regulatory-source tables. It also seeds the approved initial application roles and permissions. The migration includes database uniqueness for inventory-event and physical-count idempotency and PostgreSQL triggers that block inventory-event mutation.

## API Surface

| Endpoint | Permission | Purpose |
| --- | --- | --- |
| `POST /v1/inventory/receipts` | `inventory.receive` | Append a receipt event. |
| `POST /v1/inventory/movements` | `inventory.move` | Append a custody movement after an overdraw check against the ledger projection. |
| `POST /v1/inventory/adjustments` | `inventory.adjust` | Append an adjustment and optionally resolve an open variance. |
| `POST /v1/inventory/corrections` | `inventory.correct` | Append a linked correction record without altering the original event. |
| `POST /v1/inventory/reversals` | `inventory.reverse` | Append a linked reversal record without altering the original event. |
| `POST /v1/inventory/physical-counts` | `inventory.count` | Store observed counts and create variances when they differ from projected balances. |
| `GET /v1/inventory/lots`, `/balances`, `/events`, `/events/{id}` | `inventory.read` | Tenant-scoped inventory reads. |
| `GET /v1/inventory/audit-events` | `audit.read` | Tenant-scoped audit history. |

> The API intentionally provides **no generic event-create endpoint**, and it provides **no event update or delete endpoint**. That is the explicit enforcement boundary for the append-only model.

## Validation Completed

The local validation suite completed successfully. It includes API linting, 13 FastAPI/domain tests, web linting, a production Next.js build, and Alembic PostgreSQL SQL rendering. The tests cover tenant isolation, permission denial, receipt, valid movement, overdraw rejection, idempotent repeat submission, correction linkage, reversal linkage, physical count, variance creation, event-history reconstruction, and server response behavior.

## Known Limitations and Deferred Work

The database migration was rendered to PostgreSQL SQL but was not applied against a provisioned PostgreSQL environment in this repository workspace. A deployment environment must configure `PYROLEDGER_DATABASE_URL`, `PYROLEDGER_SUPABASE_JWT_ISSUER`, `PYROLEDGER_SUPABASE_JWKS_URL`, and permitted CORS origins through managed secrets before use.

Supabase authentication establishes identity; application membership/RBAC establishes authorization. This slice intentionally does not expose administrative bootstrap, role-management, or user-provisioning endpoints. Those require a separate administration workflow and review.

Full offline synchronization, Dexie queues, retry policy, conflict taxonomy, and reconciliation UX remain deferred because their protocol is not finalized. The web console does not create local inventory records when authentication or API configuration is absent.

Regulatory source, rule, rule-version, and product-profile tables exist as future interfaces only. There are no populated rules, automated regulatory evaluations, legal classifications, compliance conclusions, inspection criteria, DOT dispatch workflows, Stripe, CRM, e-commerce, or show-management workflows. Product regulatory status must remain `REGULATORY VERIFICATION REQUIRED` until verified source material is ingested.

The approved API contract lists return and disposition commands, while the authorized first production slice is limited to receipt, movement, ledger, physical count, variance, and audit. Return and disposition endpoints are intentionally not exposed in this slice rather than being implemented without their approved workflow/authorization semantics.

The GitHub Actions workflow was prepared locally but could not be pushed because the connected GitHub credential lacks permission to create or update `.github/workflows/*`. CI commands are documented in the root `package.json`; a maintainer with `workflows` permission should add the workflow after review.

## Security Considerations

The service never trusts client-supplied organization ID, user ID, role, or permission as authorization evidence. The optional `X-Organization-ID` header is only a requested context; membership is resolved server-side from the verified subject. Each protected command is permission-gated, scoped resources are checked against the resolved organization, idempotency is unique per organization, and movements/negative adjustments are rejected when they would overdraw the ledger-derived source balance.

## References

[1]: [Architecture](./architecture.md)
[2]: [Database model](./database-model.md)
[3]: [API contract](./api-contract.md)
[4]: [Security baseline](./security.md)
[5]: [Event-sourced ledger decision](./decisions/ADR-002-event-sourced-inventory-ledger.md)
[6]: [Tenant isolation decision](./decisions/ADR-005-multi-tenant-isolation.md)

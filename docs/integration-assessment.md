# PyroLedger Integration Assessment

**Branch:** `feature/integration-demo`  
**Assessment basis:** repository branches inspected on September 1, 2026  
**Integration posture:** retain the Inventory Core branch as the production baseline; adapt visual workflow patterns only when they do not create an alternate authority path.

## Executive Finding

The strongest compatible foundation is the existing `feature/inventory-core` monorepo. It already implements the authoritative technology boundary—Next.js web application, FastAPI API, Alembic migrations, and a PostgreSQL-oriented append-only ledger—and it provides the only server-authoritative inventory command path. The integration demo should therefore enhance this application in place on `feature/integration-demo`; it must not promote the Manus Vite prototype into a second production frontend. The source materials document a current hardening gap around correction semantics, payload-safe idempotency, variance resolution, and downstream reversal safety. Those commands are deliberately not presented as a connected workflow in this integration demo until their stated acceptance criteria are independently proven. [1] [2]

## Branches and Applications Inspected

| Source | What was inspected | Technology | Available value | Integration decision |
| --- | --- | --- | --- | --- |
| `develop` | Baseline repository structure and project history | Monorepo/documentation baseline | Establishes project provenance, but does not contain the strongest runnable slice | Do not merge wholesale; Inventory Core is the selected baseline. |
| `feature/inventory-core` | `docs/`, `apps/web`, `apps/api`, `database/migrations`, tests | Next.js 15, React 19, TypeScript, Tailwind 4; FastAPI, Pydantic, SQLAlchemy, Alembic; PostgreSQL | The production Inventory Core, including authenticated command endpoints, ledger reads, physical counts, audit reads, and RBAC | **Authoritative implementation.** This branch is the parent of the integration demo. |
| `prototype/manus-magazine-ledger` | `prototypes/manus/field-ledger` and prototype notes | Vite, React, TypeScript, Tailwind, client-side demo data/ledger concepts | Strong interaction and field-workflow presentation ideas | Preserve under `prototypes/manus/`; use only as a UI reference. |
| `V0` | App shell, sidebar navigation, dashboard and inventory-table components | Next.js, React, TypeScript, Tailwind, generated component set | Clear navigation and dense inventory-table composition | Adapt layout patterns only; do not import mock records or a generated framework wholesale. |
| `Figma` | Exported React presentation source and shared UI primitives | React, TypeScript, Tailwind-oriented export | Visual hierarchy and component reference material | Reference only; no backend contract or authoritative domain behavior is present. |

## Existing Production Slice

The selected Inventory Core provides server-authoritative receipt, movement, adjustment, correction, reversal, and physical-count command routes. It also exposes tenant-scoped lots, ledger-derived balances, inventory events, event detail, and audit-event reads. The inventory event table is designed as append-only through PostgreSQL triggers that reject update and delete operations; balances are derived rather than stored as mutable on-hand quantities. [1] [3]

| Major area | Selected source | Status for the integration demo | Reason |
| --- | --- | --- | --- |
| Product, architecture, data model, security, and API policy | `docs/` and ADRs on `feature/inventory-core` | **Authoritative** | These documents outrank visual and prototype sources. |
| Web framework and application entry point | `apps/web` on `feature/inventory-core` | **Connected** | It is the only repository frontend using the required Next.js stack. |
| Inventory commands and inventory reads | `apps/api` on `feature/inventory-core` | **Connected where validated** | API access remains the only path to create or read inventory records. |
| Locations view | Existing balances endpoint | **Connected, derived view** | The API exposes balances but no standalone location-list route; the UI may group returned balance records without calculating inventory. |
| Magazine, inspection, show, DOT, and regulatory workflows | Manus/V0/Figma examples and deferred schema surfaces | **Not connected** | These workflows lack an approved, server-authoritative implementation. |
| Correction, reversal, and variance resolution actions | Current Inventory Core API | **Held back from the interactive demo** | The present tests prove correction linkage without a balance effect, a simple reversal only, and no exact variance-resolution guard. [2] |

## Component and Workflow Assessment

| Component or workflow | Source | Classification | Decision and rationale |
| --- | --- | --- | --- |
| Receipt form | Inventory Core console | **A. Connected to real backend logic** | Retain and improve. It posts an authenticated, idempotent command to the FastAPI receipt endpoint. |
| Movement form | Inventory Core console | **A. Connected to real backend logic** | Retain and improve. The API validates tenant scope, unit, and a derived source balance before appending a movement. |
| Physical-count form | Inventory Core console | **A. Connected to real backend logic** | Retain and improve. It records observation data and surfaces variances without setting an on-hand value in the browser. |
| Lots, balances, event history, and audit activity | Inventory Core API | **A. Connected to real backend logic** | Add read panels powered directly by the existing GET endpoints. |
| App shell, sidebar, information hierarchy, table density | V0 and Figma source | **C. UI reference only** | Adapt presentation patterns into `apps/web`; no V0/Figma data or runtime dependencies are carried across. |
| Field workflow labels and explicit operational states | Manus prototype | **C. UI reference only** | Adopt clarity patterns such as `CONNECTED`, `NOT CONNECTED`, and `DEMO DATA`; do not copy the prototype's client-side ledger. |
| Magazine inventory, inspections, shows, transport/DOT screens, compliance alerts | Manus prototype and V0 sample data | **D. Incompatible and excluded** | They present fictional records and unimplemented regulated workflows. The integrated app exposes no false operational capability. |
| Client-side event projection or locally authoritative inventory state | Manus prototype | **D. Incompatible and excluded** | This conflicts with the append-only, server-authoritative inventory model. |
| Correction command UI | Current API | **D. Excluded pending hardening evidence** | Existing test coverage explicitly asserts a linked correction leaves projected balance unchanged. [2] |
| Reversal command UI | Current API | **D. Excluded pending hardening evidence** | A simple reversal is tested, but downstream balance safety and concurrency are not proven by the available material. [2] |
| Variance-resolution adjustment UI | Current API | **D. Excluded pending hardening evidence** | The current domain function can mark an open variance resolved after an adjustment without proving exact lot, location, unit, direction, or quantity resolution. [2] |

## Duplicates and Conflict Resolution

The repository contains several visual implementations of an application shell. `apps/web` is the canonical runtime because it already calls the real API from the specified Next.js stack. V0 contains valuable sidebar and table patterns but cannot be used as an application source because its records are sample data. The Manus prototype includes a richer workflow vocabulary but has a Vite runtime, demo data, client-side ledger concepts, and magazine-facing scope that directly conflict with the integration constraints. These duplicates are retained as references rather than merged.

> **Source-priority decision:** documented product and architecture rules, ADRs, API policy, and the production Inventory Core backend override any visual or prototype preference. The interface may clarify the server boundary, but it may never substitute a browser-derived inventory record for an API response. [1] [3]

## Proposed Integration Plan

The demo will keep `apps/web` as the single frontend URL and introduce a navigable application shell. Its Dashboard, Inventory, Locations, Physical Counts, and Activity sections will be clearly marked as **CONNECTED** only after the user has configured Supabase and the API. Lots, balances, inventory events, and audit events will be loaded directly from the API; receipt, movement, and count submissions will continue using a generated idempotency key and show the server response. The server remains responsible for authorization, tenant resolution, validation, and all inventory effects.

Magazines, reports, and the safety-sensitive correction/reversal/variance-resolution workflows will be visible only as explicit **NOT CONNECTED** or **COMING LATER** states. No mock inventory, regulatory results, compliance scores, or browser-side ledger effects will be seeded into the UI. A development-only seed command will create clearly labelled non-regulatory operational fixtures only when it is intentionally enabled and tied to a local authenticated subject. The root README will document the three-process local run path, the migration command, environment variables, test commands, and its current PostgreSQL validation limitation.

## Current Constraints and Acceptance Boundaries

The current implementation notes report local unit/API testing and PostgreSQL SQL rendering, but not a migration applied against a live PostgreSQL instance. The integration demo must not present SQL rendering as database validation. Likewise, the present API testing uses SQLite fixtures, so the acceptance packet remains incomplete for PostgreSQL trigger, unique-constraint race, transaction, and downstream-reversal verification. [1] [2]

During integration validation, the initial branch could not run its existing tests because its last commit declared non-null `request_fingerprint` ORM fields without a matching Alembic migration or a command-side write path. The integration branch removes those unused declarations rather than silently adding a partial schema feature. This restores the previously supported organization-plus-key idempotency behavior, but it does **not** implement payload-safe idempotency; that hardening work remains explicitly deferred until it includes canonical fingerprints, database migrations, conflict handling, and PostgreSQL-backed race coverage.

## Local Render Verification

The Next.js application was started locally and opened through its single frontend entry point without browser environment variables. The Dashboard rendered a clear `NOT CONNECTED` configuration state, displayed no inventory data, and explained the required trusted boundary. The Magazines navigation route rendered an explicit `NOT CONNECTED` scope boundary and stated that no demo records are shown. No authenticated API request, live database connection, or inventory command submission was attempted because this workspace has no configured Supabase project or live PostgreSQL service. The supplied build and test evidence therefore remains distinct from an end-to-end connected workflow check.

## References

[1]: [Inventory Core Implementation Notes](./inventory-core-implementation-notes.md)  
[2]: [Inventory Core Domain Tests](../apps/api/tests/test_inventory_domain.py)  
[3]: [Initial Inventory Core Migration](../database/migrations/versions/20260812_0001_inventory_core.py)

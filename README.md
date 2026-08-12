# PyroLedger

PyroLedger is a professional pyrotechnics inventory, chain-of-custody, magazine management, and compliance-workflow platform.

## Repository layout

The repository follows the approved monorepo boundary. `apps/web` contains the Next.js application, `apps/api` contains the FastAPI service, `packages` reserves shared UI and non-authoritative cross-application contracts, `database` contains migrations and schema documentation, and `tests` contains integration and end-to-end boundaries.

Authoritative product, security, database, API, UX, roadmap, and architecture material is located in [`docs/`](./docs). The first production slice is implemented on `feature/inventory-core` and is intentionally limited to organization-scoped inventory, ledger, physical-count, variance, and audit workflows.

# PyroLedger

PyroLedger is a **server-authoritative, multi-tenant inventory ledger** for field operations. The runnable integration demo lives on `feature/integration-demo`; its single web entry point connects to the FastAPI Inventory Core only after the developer configures PostgreSQL, Supabase authentication, and an authorized organization membership.

> **Honest integration boundary:** receipt, movement, physical count, lots, ledger-derived balances, event history, and audit activity are the intended connected slice. Magazine management, inspections, shows, DOT workflows, regulatory evaluation, offline synchronization, and reports are intentionally not implemented. Correction, reversal, and variance-resolution command interfaces remain held back pending the hardening evidence described in [`docs/integration-assessment.md`](./docs/integration-assessment.md).

| Runtime | Path | Purpose |
| --- | --- | --- |
| Next.js web app | `apps/web` | Single browser entry point for authenticated field operations and API-backed reads. |
| FastAPI service | `apps/api` | Server-authoritative inventory command and read boundary. |
| Alembic migrations | `database/migrations` | PostgreSQL schema, RBAC seeds, append-only protections, and inventory tables. |
| Manus reference prototype | `prototypes/manus/` | Preserved visual/workflow reference; not a production runtime. |

## Prerequisites

Install **Node.js 22+**, **pnpm 10+**, **Python 3.11+**, and **PostgreSQL 15+**. You also need a Supabase project configured to issue user JWTs. The API verifies the JWT issuer and JWKS server-side; it does not accept a browser-created inventory identity.

No Docker configuration is supplied in this branch. PostgreSQL is documented as a native/local service to avoid adding a container layer that is not already part of the project architecture.

## 1. Clone and Install

```bash
git clone https://github.com/dylpaiva/boomorganizer.git
cd boomorganizer
git switch feature/integration-demo

pnpm install

cd apps/api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cd ../..
```

## 2. Configure PostgreSQL and Environment Files

Create a local database and copy both environment templates. Change the database user, password, host, and port if your PostgreSQL installation differs from the documented local default.

```bash
createdb -U postgres -h localhost pyroledger

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Configure `apps/api/.env` with values from the Supabase project that will issue the JWTs used for local development.

```dotenv
PYROLEDGER_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/pyroledger
PYROLEDGER_SUPABASE_JWT_ISSUER=https://YOUR-PROJECT.supabase.co/auth/v1
PYROLEDGER_SUPABASE_JWKS_URL=https://YOUR-PROJECT.supabase.co/auth/v1/.well-known/jwks.json
PYROLEDGER_CORS_ORIGINS=http://localhost:3000
```

Configure `apps/web/.env.local` using the same Supabase project and the default local API address.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

The web client sends the selected organization ID only as a requested context. The API resolves organization membership, role, and permission server-side; it does not trust a browser-provided user, role, or organization identity.

## 3. Apply the Database Migration

Run Alembic from `apps/api` after activating the virtual environment. The migration creates the inventory schema, initial RBAC roles and permissions, database idempotency constraints, and PostgreSQL append-only triggers.

```bash
cd apps/api
source .venv/bin/activate
alembic upgrade head
```

To inspect PostgreSQL SQL without applying it, use the following separate command. SQL rendering is useful for review but does **not** prove a live PostgreSQL migration or trigger test passed.

```bash
alembic upgrade head --sql
```

## 4. Create Explicit Development Fixtures

Migrations do not add inventory records. Once the development seed script is available on this branch, run it only for a disposable local database and only with the same Supabase JWT subject as the test user. The script is guarded by `PYROLEDGER_DEMO_SEED=true`, labels its data as development-only, and never creates regulatory records or automatic compliance results.

```bash
cd apps/api
source .venv/bin/activate
PYROLEDGER_DEMO_SEED=true \
PYROLEDGER_DEMO_AUTH_SUBJECT=YOUR_SUPABASE_USER_UUID \
python scripts/seed_development.py
```

The command prints the authorized organization, location, product, and lot UUIDs needed by the form. It is safe to rerun: it finds or creates the same development fixture records. To reset the local environment, drop and recreate the `pyroledger` database, then repeat the migration and optional seed steps.

## 5. Run the Three Local Processes

Use three terminals. The API must have a reachable PostgreSQL database and valid Supabase issuer/JWKS configuration before authenticated inventory calls can succeed.

| Terminal | Command | Verify |
| --- | --- | --- |
| PostgreSQL | Start your local PostgreSQL service | `pg_isready -h localhost -U postgres` |
| API | `cd apps/api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000` | Open `http://localhost:8000/healthz` |
| Web | `pnpm web:dev` | Open `http://localhost:3000` |

Sign in using a Supabase user whose JWT subject has an active PyroLedger user and organization membership. Select that authorized organization in the app. Then use the inventory form to receive, move, or physically count the clearly marked development fixture records. The API response—not a local browser calculation—is the operation record.

## Validation Commands

Run these commands from the repository root after installing Node dependencies and the API development extras.

```bash
pnpm api:lint
pnpm api:test
pnpm web:lint
pnpm web:build
```

The current automated API tests use SQLite fixtures for fast local verification. The Inventory Core implementation notes explicitly state that its migration was rendered to PostgreSQL SQL but was not applied or tested against a provisioned PostgreSQL instance. Do not represent this branch as having live PostgreSQL validation until that environment, migration application, trigger behavior, uniqueness races, transactions, and reversal safety tests have been executed and recorded.

## Important Limits

The integration demo intentionally shows a clear unavailable state for workflows that do not yet have a connected, server-authoritative implementation. It does not supply fake magazine data, compliance scores, regulatory evaluations, transport/DOT records, or local client-side inventory records. See the [integration assessment](./docs/integration-assessment.md) for the source-by-source decision record and the exact hardening gaps that currently keep correction, reversal, and variance-resolution interactions out of the demo.

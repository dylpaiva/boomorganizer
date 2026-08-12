# PyroLedger Field Ledger Prototype

This is a **client-only experimental workflow prototype** for the PyroLedger team. It uses synthetic demo data and demonstrates event-led inventory, chain-of-custody, magazine workflows, show loadout/reconciliation, audit history, offline queue states, and a portable JSON export.

## Run locally

```bash
pnpm install
pnpm check
pnpm dev
```

The app is intentionally standalone. The source contains no API credentials, customer data, real magazine coordinates, or real regulatory data.

## Handoff documents

- [`../../../docs/workflow-prototype-spec.md`](../../../docs/workflow-prototype-spec.md) — all fifteen workflow definitions, state transitions, failures, assumptions, and open questions.
- [`../../../docs/manus-prototype-notes.md`](../../../docs/manus-prototype-notes.md) — limitations, Manus-specific dependencies, and migration steps.

## Prototype boundary

The event stream is in `client/src/types.ts`; the derived inventory projector is `client/src/lib/eventLedger.ts`; synthetic fixtures are `client/src/lib/demoData.ts`; and the interactive workflows are in `client/src/components/WorkflowApp.tsx`.

The image URLs under `/manus-storage/` are the only Manus-hosted visual assets. They are identified in the migration notes and can be replaced with production-owned asset URLs or local files. No server functionality depends on Manus.

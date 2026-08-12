# PyroLedger Manus Prototype Notes

## Prototype Description

The **Field Ledger** prototype is a client-only React/Vite demonstrator for PyroLedger’s difficult inventory, custody, magazine, show, audit, and export workflows. It implements all fifteen requested screens as a command-rail application that favors scanning, clear state transitions, concise warnings, and persistent evidence visibility.

Inventory is represented by `InventoryEvent` records. The UI never holds a mutable on-hand quantity field. Instead, `client/src/lib/eventLedger.ts` calculates a read-only inventory projection from event deltas. Receiving, movement, allocation, load, return, adjustment, correction, and other modeled event names append new evidence records. Physical counts, inspections, daily close, shipment review, and export are operation records; they remain separately visible from the inventory event stream.

| Area | Included prototype behavior | Explicitly excluded behavior |
| --- | --- | --- |
| Chain of custody | Source and destination custody IDs are retained in inventory events. | Real identities, coordinates, device telemetry, signatures, or policy enforcement. |
| Correction history | Corrections retain `correctionOf`; audit history renders related evidence. | Production correction semantics, approval routing, and server-side integrity controls. |
| Offline | A control marks locally created demo records `queued`; a second control marks them synchronized. | Durable offline database, encrypted device storage, real transport, conflict resolution, and background sync. |
| Export | Browser download of a documented synthetic JSON package. | Official regulatory report formats, delivery, encryption, signing, or archival. |
| Data | Synthetic products, lots, people, locations, references, and vehicle data only. | Real customer, inventory, magazine, location, or regulatory data. |

## Assumptions

The prototype assumes that PyroLedger production engineering will own the authoritative event store and will decide validation and authorization rules from the existing specifications and regulatory matrix. For interaction testing, the browser keeps records in local React state. That assumption is intentional: it allows the flows to be evaluated without exposing credentials, requiring a database, or creating any real business record.

The static demo treats custody locations as stable synthetic identifiers, uses positive quantities for transport-like events, and blocks movement above the browser-derived projection. These are prototype interaction guardrails, **not** an attempt to define inventory law, material handling policy, or a final domain model. The production team should replace the sample `eventDeltas` implementation only with the approved semantics.

## Known Limitations

The prototype has no login, permissions, encryption, persistent storage, access logging, server-side validation, attachments, device camera, actual barcode SDK, real offline synchronization, or real regulatory report generator. Its synchronization control is an intentionally transparent simulation: it changes `queued` markers to `synced` locally and explicitly states that no server exchange has occurred.

The visible inspection, daily-close, and shipment-review rows are interaction placeholders. They are not regulatory checklists. The shipment flow does not approve, reject, classify, or authorize a shipment. The physical count flow does not change inventory; the variance screen provides only an experimental append-only adjustment path and does not model approvals. Export contains synthetic data only and must not be submitted as an official report.

## Manus-Specific Dependencies

The source code itself is ordinary TypeScript, React, Vite, Tailwind CSS, and shadcn/ui-compatible components. The only dependencies that require replacement outside the Manus workspace are listed below.

| Dependency | Where it appears | Replacement for migration |
| --- | --- | --- |
| Managed development preview | Local development workspace only. | Run the included Vite project with a standard Node.js environment. |
| `/manus-storage/...` generated image URLs | Logo, dashboard hero, inspection texture, and custody-receipt texture in `client/src/components/WorkflowApp.tsx`, `client/src/index.css`, and `client/index.html`. | Download or re-create approved assets, host them through the production asset pipeline, and replace each URL. |
| Static project template | Build layout and package manifest. | Keep or adapt the Vite/React structure according to the target repository conventions. |
| Browser-only export | `Blob` download in the export screen. | Retain for local JSON export or replace with an approved server-side export flow. |

No secret, external API key, service credential, connector, or Manus-only database is used. Generated image URLs are visual assets, not data-service dependencies. They should nevertheless be replaced so the production repository does not depend on a hosted prototype asset path.

## Migration Instructions

1. Copy `prototypes/manus/field-ledger/` into the target repository or extract the files under its `client/` directory into the production frontend. The prototype subdirectory has a standalone `package.json`, lockfile, client, server placeholder, and shared placeholder so it can run independently.
2. Replace every `/manus-storage/` URL with a checked-in or approved hosted asset. The brand mark should become a production-owned favicon and header icon.
3. Preserve the separation between `InventoryEvent`, `PhysicalCount`, and `OperationReceipt` in `client/src/types.ts`. Replace synthetic fixture exports in `client/src/lib/demoData.ts` with approved reads from the production system.
4. Keep `client/src/lib/eventLedger.ts` as a readable reference for derived projections, but move authoritative projection and event-validation logic behind production APIs. Do not accept client-side availability checks as authority.
5. Replace the React `AppState` mutators in `WorkflowApp.tsx` with authenticated append-only event commands, durable physical-count records, operation records, and an approved synchronization implementation. Do not add mutation-in-place endpoints for regulated events.
6. Map production workflows to the established regulatory matrix. The prototype intentionally has no opinion on required fields, approvals, report schema, signatures, retention, or inspection criteria. Those must be supplied by the authorized production design.
7. Replace the client-only JSON download with approved report/export services after the required delivery and signing format is known. Keep the package separation between raw events and derived inventory projection.
8. Run `pnpm install`, `pnpm check`, `pnpm test`, and `pnpm build` from the `field-ledger` directory. The regression suite demonstrates receipt/movement projection and zero-quantity correction behavior; it does not replace production domain testing.

## Handoff Checklist

Production engineering can use this prototype to evaluate behavior rather than architecture. The key manual checks are to scan a synthetic code (`DEMO-0815-0001`), create a receipt, move inventory, record an intentionally different physical count, create an adjustment, inspect the audit relationship, toggle offline simulation, and create a JSON export. Any accepted workflow findings should be folded into the canonical specifications and regulatory matrix—not treated as a rule contained in this experimental branch.

# PyroLedger Database Model

**Status:** Initial logical model baseline  
**Branch:** `docs/chatgpt`

## 1. Persistence principles

PostgreSQL is the authoritative transactional store. Regulated inventory history is represented as append-only events. Current-state projections may be materialized for query performance but must be reconstructable from source events.

## 2. Core entities

### Organization
Tenant boundary for all operational and regulatory data.

Key concepts: `id`, name, status, timestamps.

### User / Role / Permission
Identity and authorization model. Permissions are explicit and evaluated server-side.

### Personnel
Operational personnel records, distinct from authentication identities where needed.

### License / Permit
Organization or personnel authorizations and their supporting documents. Exact regulatory fields require verified source requirements.

### Location
Logical physical location owned or managed by an organization.

### Magazine
Storage location with organization ownership, location relationship, status, and inspection-related records.

### Vehicle
Transport asset associated with applicable shipment or operational workflows.

### Product
Internal product identity. Product naming alone must never establish legal classification.

### Product Regulatory Profile
Document-backed regulatory attributes, source references, applicability, and versioning.

### Inventory Lot
A traceable quantity grouping for a product. Lot-level fields should support custody and source traceability where applicable.

### Inventory Event
Immutable ledger event. Required concepts: organization, actor, occurred-at timestamp, event type, product/lot, source, destination, quantity, reason/reference, idempotency key, and correction/reversal linkage where applicable.

### Physical Inventory / Physical Inventory Line
A captured count event and its constituent counted inventory lines. A count never silently changes ledger history; differences produce variance records/workflows.

### Magazine Daily Summary
Operational end-of-day summary derived from event history and documented physical observations.

### Magazine Inspection
Inspection record with inspector, timestamp, scope, observations, findings, evidence, and resulting review state.

### Compliance Exception
An explicit exception/review object connected to a source rule/evaluation and supporting evidence.

### Show / Show Package
Operational show and package/loadout planning records, linked to inventory allocations and movements without bypassing the ledger.

### Shipment / Shipping Document
Transportation workflow objects and evidence. DOT/PHMSA rules remain distinct from ATF/storage rules.

### Training Record
Personnel qualification/training evidence with source documentation and review status.

### Document
Metadata and controlled references to S3-compatible object storage. Access must be authorization-controlled.

### Regulatory Source / Regulatory Rule / Regulatory Rule Version
Versioned source-backed regulatory data. Historical evaluations retain the rule version used.

### Audit Event
Append-oriented security and compliance audit record.

## 3. Key relationships

- Organization owns operational entities and defines tenant scope.
- Location contains or groups physical assets such as magazines and vehicles as appropriate.
- Magazine belongs to an organization and location.
- Product has one or more versioned regulatory profiles.
- Inventory lot references a product and organization and is affected by inventory events.
- Inventory event references source/destination locations when applicable.
- Physical inventory references the scope counted and records observed quantities without mutating historical events.
- Compliance exception references one or more regulatory rule versions and evidence.
- Show packages allocate inventory through events rather than direct quantity mutation.
- Shipment records transportation workflow and associated documents.

## 4. Event ledger constraints

The database must enforce:

- organization ownership/tenant scope;
- immutable event identity;
- valid event type;
- positive or explicitly signed quantity semantics defined by event type;
- source/destination consistency for movement-like events;
- idempotency keys for externally submitted events;
- references for corrections, reversals, and voids;
- no hard deletion of regulated event history.

## 5. Projection strategy

Current inventory availability, magazine balances, allocation views, and reporting summaries may be projections. Projections must be rebuildable from the authoritative ledger and must carry enough metadata to detect stale or incomplete rebuilds.

## 6. Retention and historical integrity

Retention requirements require regulatory verification. Until verified, the system should be designed so regulated event history is append-only and exportable without destructive cleanup.

## 7. Open decisions

**DECISION REQUIRED:** Define exact UUID strategy, timestamp standard, quantity/unit model, and database partition/index strategy.

**DECISION REQUIRED:** Define whether regulatory source documents are stored only in object storage or also indexed by extracted metadata/text.

**REGULATORY VERIFICATION REQUIRED:** Determine retention requirements from the approved regulatory source set before implementing archival/deletion behavior.

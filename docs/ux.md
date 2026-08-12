# PyroLedger UX Architecture

**Status:** Initial UX architecture baseline  
**Branch:** `docs/chatgpt`

## 1. UX goals

PyroLedger must be mobile-first for field use while remaining effective on desktop for administration, review, reporting, and document management.

The interface should optimize for accurate operational data capture, clear custody state, explicit review states, and recovery from offline conditions.

## 2. Primary navigation model

Primary areas should map to operational responsibilities rather than generic software categories:

- Dashboard / Work Queue
- Inventory
- Magazines
- Shows
- Shipments
- Compliance Review
- Documents
- Reports / Exports
- Administration

The exact navigation hierarchy is subject to validation against detailed workflows.

## 3. Core field workflows

### Receive inventory

Capture source/reference, product, lot information, quantity/unit, destination magazine/location, actor, timestamp, and required evidence. Present warnings or review requirements before final submission.

### Move inventory

Show source and destination explicitly. Require authorized custody movement and preserve an immutable event record.

### Physical count

Prioritize fast, low-error counting. The user records observed quantity separately from system-derived quantity. Variances create a review workflow; they do not overwrite the ledger.

### Magazine inspection

Provide structured checklist/observation capture, evidence attachment, reviewer assignment, and explicit unresolved findings.

### Offline capture

Make offline status persistent and obvious. Clearly distinguish locally queued events from server-accepted events. Never imply synchronization when the event remains pending.

## 4. Status language

Use explicit operational states:

- Review Required
- Potential Conflict
- Missing Documentation
- Variance Detected
- Human Review Required
- Sync Pending
- Offline
- Awaiting Approval

Do not use a generic compliance score as the primary UX.

## 5. Inventory UX principles

- Show source and destination for custody-changing operations.
- Show event timestamp and actor on transaction history.
- Preserve access to the immutable event trail from current-state views.
- Make corrections/reversals visibly distinct from original events.
- Make physical-vs-system variance explicit.

## 6. Regulatory UX principles

A regulation-derived warning must identify its source domain and provide access to supporting documentation or rule metadata where the user has permission.

A software warning is not presented as a legal conclusion.

## 7. Document UX

Documents should show type, status, source, associated record, version/effective metadata where applicable, and access state. Sensitive files must be protected by authorization.

## 8. Desktop administration

Desktop views should support dense tables, filters, audit history, review queues, document management, exports, and administrative controls. Mobile views should prioritize one-handed workflows and reduce unnecessary data entry.

## 9. Accessibility and resilience

The product should support keyboard navigation, semantic controls, clear focus states, readable contrast, touch-friendly targets, and recovery from interrupted/offline workflows.

## 10. Open decisions

**DECISION REQUIRED:** Establish visual design tokens and component conventions with the design branch.

**DECISION REQUIRED:** Finalize role-specific navigation and home/work-queue behavior.

**DECISION REQUIRED:** Finalize offline conflict-resolution screens after synchronization semantics are defined.

# PyroLedger Field Ledger: Workflow Prototype Specification

> **Scope boundary:** This document specifies an experimental interaction prototype built with synthetic data. It preserves the inventory event model provided by PyroLedger. It does **not** create, interpret, or certify regulatory requirements, acceptance criteria, permissions, retention periods, reporting formats, or approval policies.

The prototype treats stock as a **derived projection** from append-only events. A movement changes the projection by recording a new event with a source and destination; a correction, adjustment, and reversal preserve the original record and point to it through related evidence. Physical counts and operational attestations are separate records and do not edit any event.

| Cross-cutting behavior | Prototype treatment | Production decision intentionally deferred |
| --- | --- | --- |
| Data | All people, product identifiers, lots, locations, vehicle names, and references are synthetic. | Real master-data ownership and validation. |
| Inventory | Quantities shown in the UI are derived from event deltas. | Authorized event policy and conflict resolution. |
| History | There is no UI edit or delete path for inventory events. | Server-side immutability, signatures, retention, and access rules. |
| Offline | A local simulation marks new records `queued`; a manual control marks them synced. | Durable local store, sync protocol, conflict handling, and audit proofs. |
| Export | A browser JSON file contains synthetic events, count records, receipts, and a derived projection. | Required schema, transport, signing, storage, and regulator-specific format. |

## 1. Receive Inventory

This flow tests whether a receiver can record a rapid intake without entering a mutable on-hand value. The actor selects a product, lot, quantity, custody destination, reference, and note after resolving the product through a scan or select field. Submission appends a `receipt` event from synthetic external custody to the selected internal custody location and immediately shows a receipt.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Prove an event-led receiving handoff with a receipt. |
| Actors | Demo Receiver or another authenticated production role, to be defined outside this prototype. |
| Inputs | Synthetic product, lot reference, positive quantity, destination custody, external-reference string, and operator note. |
| Outputs | A `receipt` inventory event, a related operational receipt, and an updated derived projection. |
| State transitions | Pending receipt → received event appended → destination projection increases. |
| Failure cases | Blank required fields, invalid quantity, unreachable destination, scanner mismatch before intake, or offline queue state. |
| Open questions | Which references are mandatory; whether any review occurs before a receipt; and how receiving conflicts are adjudicated. |
| Assumptions | The sender is represented as synthetic external custody; no regulatory validation is implied. |

## 2. Scan Product

The scan-first entry point accepts a synthetic keyboard-wedge scanner value or manually typed code. A matched scan resolves a product and routes the operator to the relevant explicit action; an unknown code stops the custody action and names the need for review rather than guessing a product or lot.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test product-resolution speed and the unknown-code failure state. |
| Actors | Field Operator, Receiver, Loader, or Custodian. |
| Inputs | Scanner string or synthetic SKU. |
| Outputs | Matched product context or an understandable no-match warning. |
| State transitions | Unresolved → matched; or unresolved → needs review. No inventory event is created. |
| Failure cases | Empty input, unknown code, duplicate scan policy, scanner hardware failure, or offline catalog availability. |
| Open questions | Canonical identifier formats, duplicate-scan ergonomics, camera support, and device integration. |
| Assumptions | Product resolution itself is not a custody event and cannot create inventory. |

## 3. Assign Lot

Lot assignment demonstrates a late-attribution workflow that never mutates the original event. The operator selects an original event, enters a lot reference and rationale, and produces a zero-quantity `correction` event whose `correctionOf` link identifies the original evidence.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Prove that later lot attribution can remain historically visible. |
| Actors | Custodian, data-review role, or another role determined by the production system. |
| Inputs | Original event ID, synthetic lot reference, and correction rationale. |
| Outputs | New `correction` event, linked correction receipt, and visible relationship in audit history. |
| State transitions | Unattributed or disputed attribution → correction appended → linked attribution evidence. |
| Failure cases | Missing original event, blank lot reference, unsupported original-event type, duplicate correction, or offline queue. |
| Open questions | Whether lot corrections change the projection key, required approval, and lot formatting rules. |
| Assumptions | This particular prototype uses a zero-quantity correction; production semantics must be set by the authorized model owner. |

## 4. Move Inventory Between Locations

The movement screen makes custody explicit: product, lot, quantity, source, destination, reference, and note appear together before confirmation. The derived source availability is read-only. The prototype blocks a requested quantity that is greater than that projection and creates an append-only `movement` event when it is valid.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test a fast, legible source-to-destination custody transfer. |
| Actors | Custodian or Field Operator. |
| Inputs | Product, lot, positive quantity, source custody, destination custody, reference, and note. |
| Outputs | `movement` event, receipt, lower source projection, and higher destination projection. |
| State transitions | In source custody → movement event appended → in destination custody. |
| Failure cases | Same source and destination, amount over derived availability, empty field, queued event, or conflicting concurrent move. |
| Open questions | Reservation strategy, concurrent scanner behavior, permissions, and transfer confirmation requirements. |
| Assumptions | The in-browser projection is a usability guard, not an authoritative availability decision. |

## 5. Magazine Daily Close

Daily close is an operational attestation rather than an inventory write. The operator completes the synthetic checklist framing, captures an exception note, and creates a receipt. The screen intentionally avoids claiming which criteria are required or which state makes a close acceptable.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test a clear daily-close action and understandable exception note. |
| Actors | Magazine Custodian or designated closing role. |
| Inputs | Synthetic location context, checklist acknowledgement, and operator note. |
| Outputs | `Magazine Daily Close` operation receipt. |
| State transitions | Open operational day → documented close receipt. |
| Failure cases | Incomplete checklist, unresolved exception, offline queue, or duplicate close. |
| Open questions | Checklist source, cutoff time, reopening behavior, and required countersignature. |
| Assumptions | This UI is a shell for an authorized regulatory matrix; it does not encode that matrix. |

## 6. Physical Inventory

Physical inventory compares a read-only derived expectation against an observed count. Saving creates a count record, not an adjustment. A matched count creates a completion receipt; a different observed count creates an attention receipt and routes the user to variance investigation.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Prove count capture without silently replacing the ledger projection. |
| Actors | Counter, Magazine Custodian, or Reviewer. |
| Inputs | Location, product, lot, observed quantity, and count note. |
| Outputs | Physical count record and a matched or variance-open receipt. |
| State transitions | Expected quantity → count observed → matched or variance open. |
| Failure cases | Invalid count, no item at location, duplicate count process, offline queue, or stale derived projection. |
| Open questions | Blind-count protocol, recount procedure, count session ownership, and variance thresholds. |
| Assumptions | A physical count does not make an inventory event by itself. |

## 7. Variance Investigation

Variance investigation begins only with an open physical count variance. It displays expected and observed values, captures an investigation note, and demonstrates a separate `adjustment` event. The screen says clearly that policy, approval, classification, and escalation are outside the prototype.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test evidence-first discrepancy handling and append-only resolution. |
| Actors | Investigator, Custodian, or authorized production approver. |
| Inputs | Open physical count record and investigation note. |
| Outputs | `adjustment` event and linked operational receipt. |
| State transitions | Variance open → investigating → adjustment appended or retained for further review. |
| Failure cases | No open variance, missing rationale, adjustment that would violate production policy, or queued sync. |
| Open questions | Authorizations, approval sequencing, causal taxonomy, recount requirements, and adjustment direction semantics. |
| Assumptions | The prototype uses one signed action button for interaction testing only; it does not model approval requirements. |

## 8. Magazine Inspection

The magazine inspection card records a synthetic operational observation, not a predefined regulatory checklist. A note summarizes the result and creates an inspection receipt. The visual layout reserves room for a production-owned inspection matrix without suggesting that the current three rows are compliance criteria.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test a mobile-friendly inspection record with visible attention states. |
| Actors | Inspector or Magazine Custodian. |
| Inputs | Synthetic inspection context and operator note. |
| Outputs | Magazine Inspection operation receipt. |
| State transitions | Not recorded → documented inspection receipt. |
| Failure cases | Missing note, unresolved attention, offline queue, or duplicate inspection session. |
| Open questions | Criteria source, evidence attachments, corrective-action workflow, and inspector credentials. |
| Assumptions | The template rows are interface placeholders and do not represent regulatory inspection requirements. |

## 9. Show Package

Show Package allocates material from a magazine to the synthetic Demo Night package. It uses the same event capture as a custody move but identifies the event type as `allocation`, yielding a source and destination retained in the receipt.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test show-specific allocation and package accountability. |
| Actors | Show Lead, Custodian, or Loader. |
| Inputs | Product, lot, quantity, source magazine, show package, reference, and note. |
| Outputs | `allocation` event, operation receipt, and derived show-package projection. |
| State transitions | Magazine custody → allocation appended → show package custody. |
| Failure cases | Quantity over projection, invalid package, source equals destination, scan mismatch, or offline queue. |
| Open questions | Package composition, manifest linkage, hold/release state, and show cancellation handling. |
| Assumptions | The Demo Night package is a synthetic custody location only. |

## 10. Show Loadout

Show Loadout loads allocated material from the synthetic show package to Vehicle Bravo. The workflow uses a `load` event, retaining both locations in the record and applying the same available-quantity guard before its explicit receipt.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test a scan-capable mobile transfer from package to vehicle custody. |
| Actors | Loader, Driver, Show Lead, or Custodian. |
| Inputs | Product, lot, quantity, package source, vehicle destination, reference, and note. |
| Outputs | `load` event, loadout receipt, and updated derived projection. |
| State transitions | Show package custody → load appended → vehicle custody. |
| Failure cases | Quantity over projection, unavailable vehicle, mismatched package, offline queue, or interrupted handoff. |
| Open questions | Vehicle identity source, driver acknowledgment, manifest relationship, and partial-load behavior. |
| Assumptions | Vehicle Bravo is fictional and includes no real coordinates or transport data. |

## 11. Vehicle / Temporary Custody

The Vehicle / Temporary Custody screen uses a `movement` event and lets the operator select the synthetic vehicle or holding location as a destination. Its value is in making temporary custody visible as a first-class location, rather than keeping it in an unstructured note.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test temporary custody as traceable source-to-destination evidence. |
| Actors | Custodian, Driver, Field Operator, or temporary holder. |
| Inputs | Product, lot, quantity, source, temporary destination, reference, and note. |
| Outputs | `movement` event, receipt, and derived temporary-custody projection. |
| State transitions | Source custody → movement appended → temporary or vehicle custody. |
| Failure cases | Same location selection, unsupported temporary location, quantity over projection, or offline queue. |
| Open questions | Custody expiration, acknowledgements, handoff timing, and vehicle eligibility. |
| Assumptions | The static prototype does not acquire real location, GPS, or vehicle data. |

## 12. Return / Reconciliation

Return / Reconciliation records the material that returns from vehicle custody into Magazine Alpha using a `return` event. The event retains the route and provides a separate receipt; the screen deliberately does not infer use, disposition, damage, or destruction from an unreturned amount.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test a post-show return without modifying prior loadout evidence. |
| Actors | Driver, Loader, Show Lead, or Magazine Custodian. |
| Inputs | Product, lot, returned quantity, vehicle source, magazine destination, reference, and note. |
| Outputs | `return` event, reconciliation receipt, and derived magazine projection. |
| State transitions | Vehicle custody → return appended → magazine custody. |
| Failure cases | Quantity over vehicle projection, destination mismatch, missing note, and offline queue. |
| Open questions | How use, disposition, destruction, or damaged material are separately recorded; and reconciliation approval. |
| Assumptions | A return is not an implicit undo; the previous load event remains intact. |

## 13. Shipment Review

Shipment Review captures a plain-language operational review receipt. It does not claim to validate a shipment against a legal checklist. The note is intentionally the primary evidence surface so an authorized rules engine or human reviewer can define the review content later.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test an understandable review conclusion and attention state. |
| Actors | Shipment Reviewer or designated operations role. |
| Inputs | Synthetic shipment reference, review scope, and attention summary. |
| Outputs | Shipment Review operation receipt. |
| State transitions | Draft review → documented review receipt. |
| Failure cases | Missing review reference, unresolved attention, unavailable documents, or offline queue. |
| Open questions | Required source documents, policy checks, review authority, and remediation path. |
| Assumptions | The card is not a regulatory validator and does not synthesize a shipping decision. |

## 14. Audit History

Audit History exposes inventory events and operation receipts as separate evidence rows. A selected event displays event ID, actor, time, route, reference, note, and any related correction or reversal linkage. There is no edit or delete control; a correction affordance routes the operator to a new linked event workflow.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test whether a reviewer can understand state provenance without reconstructing it manually. |
| Actors | Auditor, Reviewer, Investigator, or operations user. |
| Inputs | Filter state and selected evidence record. |
| Outputs | Filterable trace, detailed receipt surface, and correction route. |
| State transitions | Any evidence record → filterable trace → selected detail → linked correction initiation. |
| Failure cases | Missing relationship target, long event history, queued records, incomplete export, or unavailable actor information. |
| Open questions | Pagination, integrity verification, data retention, permission filtering, signatures, and reversal UX. |
| Assumptions | Client-side history is an interaction proof only; authoritative history must be server-backed. |

## 15. Regulatory Report Export

The export screen creates a portable JSON package in the browser. The package identifies itself as synthetic demo data and includes the append-only event collection, optional count and operation-record collections, and a derived inventory projection. This proves a migration boundary without asserting a regulator’s required format.

| Required field | Prototype definition |
| --- | --- |
| Purpose | Test an exportable boundary that another engineering team can replace. |
| Actors | Compliance user, Auditor, or Reviewer. |
| Inputs | Include-counts option and include-operation-receipts option. |
| Outputs | Downloaded synthetic JSON package and an export receipt. |
| State transitions | Evidence selected → browser export created → export receipt appended. |
| Failure cases | Browser download block, queued unsynced evidence, unsupported storage policy, or schema mismatch. |
| Open questions | Required report schemas, signing, encryption, transmission, data minimization, and retention. |
| Assumptions | JSON is an engineering interchange format only and is not represented as a final regulatory report. |

## Prototype Evaluation Notes

The intended evaluation is a short role-play: scan a synthetic product, receive it, move it, take a physical count that differs from the projection, document an investigation, inspect the audit trace, and create the JSON export. The test should be run at mobile width and desktop width, with and without the explicit offline simulation. Evaluation should focus on action speed, clarity of warnings, ability to identify the next state, and visibility of evidence relationships—not on policy compliance.

The behavior deliberately leaves substantial decisions open. In particular, the prototype does not implement authorization, signatures, durable offline storage, conflict resolution, regulatory reporting formats, official inspection criteria, real device access, real location data, or real customer data. These limitations are recorded separately in [Manus Prototype Notes](./manus-prototype-notes.md).

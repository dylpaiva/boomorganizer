# PyroLedger Product Specification

**Status:** Initial authoritative specification baseline  
**Owner:** Product Architecture / Regulatory Systems  
**Branch:** `docs/chatgpt`

## 1. Product purpose

PyroLedger is a mobile-first, compliance-aware inventory, chain-of-custody, magazine-management, show-management, and hazardous-material workflow platform for professional pyrotechnics and fireworks businesses.

This is not a generic inventory application. The product is designed around immutable inventory events, chain of custody, magazine-first inventory, physical reconciliation, inspection workflows, show package/loadout management, returns and reconciliation, regulated transportation workflows, inspection-ready exports, regulatory document management, offline field operation, and strong auditability.

## 2. Regulatory product position

PyroLedger does not independently determine that a business is ATF compliant, DOT compliant, legally authorized, legally safe to ship, or legally safe to store material.

The software provides compliance-aware workflows, warnings, records, evidence, review queues, reports, document management, and auditability.

Regulatory sources must remain distinct:

1. ATF storage and recordkeeping requirements.
2. DOT/PHMSA transportation requirements.
3. State requirements.
4. Local authority/AHJ/fire-authority requirements.
5. Company policy.
6. Operational best practices.

The product must never infer regulatory classification solely from a product name and must never silently invent regulatory rules.

## 3. Regulatory rule representation

Every regulatory rule represented by the product must carry, where applicable:

- authority
- citation
- source document
- effective date
- rule version
- applicability
- jurisdiction
- software requirement
- triggering condition
- required data
- warning or requirement produced
- evidence/report produced
- human review requirement

When source support is missing, explicitly label the gap rather than inventing a requirement.

## 4. Authoritative inventory model

Authoritative inventory state is derived from an append-only event ledger. An editable quantity field is not the primary source of truth.

Supported inventory event types include:

- acquisition
- receipt
- movement
- allocation
- load
- delivery
- consumption/use
- sale/disposition
- return
- destruction
- adjustment
- correction
- reversal/void

A regulated transaction cannot be silently edited or deleted. Corrections create a new attributable event referencing the original event.

Every regulated event must retain, as applicable:

- organization
- user/actor
- timestamp
- event type
- item/product/lot
- source
- destination
- quantity
- reason/reference

## 5. Core domain objects

Organization, User, Role, Permission, License, Permit, Personnel, Location, Magazine, Vehicle, Product, Product Regulatory Profile, Inventory Lot, Inventory Event, Physical Inventory, Physical Inventory Line, Magazine Daily Summary, Magazine Inspection, Compliance Exception, Show, Show Package, Shipment, Shipping Document, Training Record, Document, Regulatory Source, Regulatory Rule, Regulatory Rule Version, Audit Event.

## 6. MVP production vertical slice

The first production vertical slice is:

Organization -> User -> Product -> Magazine -> Inventory Lot -> Receive Inventory -> Move Inventory -> View Immutable Transaction History -> Physical Count -> Variance Investigation -> Audit Report.

## 7. Product priorities after MVP

After the core vertical slice is stable, prioritize:

1. Magazine daily close.
2. Magazine inspections.
3. Show package/loadout.
4. Return and reconciliation workflows.
5. Report/export center.
6. DOT shipment workflow.
7. Offline synchronization hardening.

## 8. Feature specification standard

Every feature specification must define:

- purpose
- actor
- preconditions
- inputs
- database entities
- business logic
- security requirements
- regulatory considerations
- permissions
- trigger
- inventory/event impact
- audit event
- output
- reports/exports
- failure states
- offline behavior where applicable
- acceptance criteria
- test cases
- open questions

## 9. Required state language

Prefer explicit states such as:

- Review Required
- Potential Conflict
- Missing Documentation
- Variance Detected
- Human Review Required
- Sync Pending
- Offline
- Awaiting Approval

Do not represent compliance with an undifferentiated green "COMPLIANT" badge.

## 10. Out of scope until core stability

Do not expand into e-commerce, accounting, payroll, POS, generalized CRM, or full site-plan design before the regulatory inventory workflow is stable.

## 11. Acceptance criteria

The product architecture is acceptable only when:

- inventory can be reconstructed from events;
- historical regulated events cannot be silently changed;
- corrections remain attributable;
- organizations are isolated;
- regulatory rule versions are representable;
- ATF and DOT logic are distinct;
- offline conflicts are explicit;
- inspection-ready exports can be generated;
- supporting documents can be linked to records;
- security controls are enforced server-side; and
- the product does not falsely claim legal compliance.

## 12. Source discipline

The previously created **PyroLedger Final Regulatory & Product Report** and **PyroLedger Regulatory Data Model & Compliance Matrix** are the project specification baseline.

**REGULATORY VERIFICATION REQUIRED:** Those source documents are not currently present in the live `main` tree inspected during this initialization. Until they are added or otherwise made available as project artifacts, rules must not be invented or treated as verified.

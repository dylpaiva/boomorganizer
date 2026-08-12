/** Field Ledger design reminder: keep every fixture clearly synthetic; never encode production regulation or real site data. */
import type { CustodyLocation, InventoryEvent, Product, WorkflowDefinition } from "@/types";

export const products: Product[] = [
  {
    id: "product-comet-24",
    scanCode: "DEMO-0815-0001",
    sku: "PL-DEMO-COMET-24",
    displayName: "Comet Lift Module · 24 ct",
    description: "Synthetic product fixture for scan and receipt flow testing.",
    unit: "each",
  },
  {
    id: "product-crown-12",
    scanCode: "DEMO-0815-0002",
    sku: "PL-DEMO-CROWN-12",
    displayName: "Crown Effect Module · 12 ct",
    description: "Synthetic product fixture for custody and count flow testing.",
    unit: "each",
  },
  {
    id: "product-fountain-6",
    scanCode: "DEMO-0815-0003",
    sku: "PL-DEMO-FOUNTAIN-06",
    displayName: "Fountain Module · 6 ct",
    description: "Synthetic product fixture for show return testing.",
    unit: "each",
  },
];

export const custodyLocations: CustodyLocation[] = [
  { id: "mag-alpha", label: "Magazine Alpha · Synthetic", kind: "magazine", synthetic: true },
  { id: "mag-bravo", label: "Magazine Bravo · Synthetic", kind: "magazine", synthetic: true },
  { id: "show-demo", label: "Show Package · Demo Night", kind: "show-package", synthetic: true },
  { id: "vehicle-bravo", label: "Vehicle Bravo · Synthetic", kind: "vehicle", synthetic: true },
  { id: "hold-variance", label: "Variance Holding · Synthetic", kind: "temporary", synthetic: true },
  { id: "supplier-demo", label: "Demo Sender · Synthetic", kind: "external", synthetic: true },
];

export const workflowDefinitions: WorkflowDefinition[] = [
  { id: "receive-inventory", group: "Inventory", title: "Receive Inventory", shortTitle: "Receive", description: "Record a signed receipt into the selected synthetic custody location.", primaryAction: "Record receipt", purpose: "Prove a scan-first receiving handoff with immutable receipt evidence.", eventType: "receipt", expectedState: "Pending receipt → received" },
  { id: "scan-product", group: "Inventory", title: "Scan Product", shortTitle: "Scan", description: "Resolve a synthetic product by scanner input before starting a custody action.", primaryAction: "Resolve scan", purpose: "Test quick scan resolution, unknown-code handling, and the handoff to a next action.", expectedState: "Unresolved → matched / needs review" },
  { id: "assign-lot", group: "Inventory", title: "Assign Lot", shortTitle: "Assign lot", description: "Attach a lot through a corrective evidence event rather than editing prior history.", primaryAction: "Issue correction", purpose: "Prove late lot attribution without modifying a regulated event.", eventType: "correction", expectedState: "Unattributed → corrected attribution" },
  { id: "move-inventory", group: "Inventory", title: "Move Inventory", shortTitle: "Move", description: "Move a selected quantity between synthetic custody locations.", primaryAction: "Confirm move", purpose: "Test explicit source, destination, quantity, and receipt confirmation.", eventType: "movement", expectedState: "In source custody → in destination custody" },
  { id: "magazine-daily-close", group: "Magazine", title: "Magazine Daily Close", shortTitle: "Daily close", description: "Capture a synthetic close attestation with count and exception state.", primaryAction: "Close day", purpose: "Test the daily close checklist and exception visibility.", expectedState: "Open operational day → close receipt" },
  { id: "physical-inventory", group: "Magazine", title: "Physical Inventory", shortTitle: "Physical count", description: "Record an observed count without altering the ledger projection.", primaryAction: "Record count", purpose: "Prove physical count capture and variance routing without an automatic quantity edit.", expectedState: "Expected quantity → matched / variance open" },
  { id: "variance-investigation", group: "Magazine", title: "Variance Investigation", shortTitle: "Variance", description: "Document investigation and, if required, create a new signed adjustment event.", primaryAction: "Create adjustment", purpose: "Test investigation evidence and append-only resolution paths.", eventType: "adjustment", expectedState: "Variance open → investigating → adjusted / retained" },
  { id: "magazine-inspection", group: "Magazine", title: "Magazine Inspection", shortTitle: "Inspection", description: "Record a synthetic inspection result and any attention item.", primaryAction: "Record inspection", purpose: "Test a clear inspector handoff without encoding regulatory acceptance criteria.", expectedState: "Not recorded → documented" },
  { id: "show-package", group: "Shows", title: "Show Package", shortTitle: "Package", description: "Allocate material from a magazine into the synthetic demo show package.", primaryAction: "Allocate package", purpose: "Prove a show-specific custody allocation event.", eventType: "allocation", expectedState: "Magazine custody → show package custody" },
  { id: "show-loadout", group: "Shows", title: "Show Loadout", shortTitle: "Loadout", description: "Load allocated material from the package onto a synthetic vehicle.", primaryAction: "Confirm loadout", purpose: "Test location, vehicle, and receipt linkage during a mobile handoff.", eventType: "load", expectedState: "Show package custody → vehicle custody" },
  { id: "vehicle-custody", group: "Shows", title: "Vehicle / Temporary Custody", shortTitle: "Vehicle", description: "Record temporary custody transfer to a synthetic vehicle or holding location.", primaryAction: "Transfer custody", purpose: "Prove a custody handoff where the vehicle is a ledger location.", eventType: "movement", expectedState: "Magazine custody → vehicle / temporary custody" },
  { id: "return-reconciliation", group: "Shows", title: "Return / Reconciliation", shortTitle: "Return", description: "Return material into a magazine and document a separate use or disposition event if needed.", primaryAction: "Record return", purpose: "Test post-show reconciliation without overwriting any load event.", eventType: "return", expectedState: "Vehicle custody → magazine custody" },
  { id: "shipment-review", group: "Compliance", title: "Shipment Review", shortTitle: "Shipment", description: "Create a synthetic review receipt with human-readable attention states.", primaryAction: "Complete review", purpose: "Test a configurable review surface without inventing regulatory requirements.", expectedState: "Draft review → review receipt" },
  { id: "audit-history", group: "Compliance", title: "Audit History", shortTitle: "Audit", description: "Inspect append-only events, related corrections, operational receipts, and sync state.", primaryAction: "Open history", purpose: "Prove an inspector-friendly historical trace with no edit or delete path.", expectedState: "Any evidence → filterable trace" },
  { id: "regulatory-export", group: "Compliance", title: "Regulatory Report Export", shortTitle: "Export", description: "Export a portable synthetic event and operation-record package.", primaryAction: "Create export", purpose: "Test a documented export boundary that production engineering can replace.", expectedState: "Evidence selected → exported package receipt" },
];

export const initialEvents: InventoryEvent[] = [
  {
    id: "evt-demo-0001",
    sequence: 1,
    type: "receipt",
    occurredAt: "2026-08-12T14:05:00.000Z",
    recordedAt: "2026-08-12T14:05:14.000Z",
    actor: "Demo Receiver",
    productId: "product-comet-24",
    lotId: "LOT-DEMO-A17",
    quantity: 24,
    unit: "each",
    toCustodyId: "mag-alpha",
    reference: "DEMO-RECEIPT-104",
    note: "Synthetic seed receipt for workflow demonstration.",
    syncState: "synced",
    receiptId: "RCP-DEMO-0001",
    demoOnly: true,
  },
  {
    id: "evt-demo-0002",
    sequence: 2,
    type: "receipt",
    occurredAt: "2026-08-12T14:10:00.000Z",
    recordedAt: "2026-08-12T14:10:16.000Z",
    actor: "Demo Receiver",
    productId: "product-crown-12",
    lotId: "LOT-DEMO-C04",
    quantity: 12,
    unit: "each",
    toCustodyId: "mag-alpha",
    reference: "DEMO-RECEIPT-105",
    note: "Synthetic seed receipt for count and variance demonstration.",
    syncState: "synced",
    receiptId: "RCP-DEMO-0002",
    demoOnly: true,
  },
  {
    id: "evt-demo-0003",
    sequence: 3,
    type: "movement",
    occurredAt: "2026-08-12T15:10:00.000Z",
    recordedAt: "2026-08-12T15:10:10.000Z",
    actor: "Demo Custodian",
    productId: "product-fountain-6",
    lotId: "LOT-DEMO-F09",
    quantity: 6,
    unit: "each",
    fromCustodyId: "supplier-demo",
    toCustodyId: "vehicle-bravo",
    reference: "DEMO-CUSTODY-019",
    note: "Synthetic temporary custody fixture.",
    syncState: "synced",
    receiptId: "RCP-DEMO-0003",
    demoOnly: true,
  },
];

export const productById = (id?: string) => products.find((product) => product.id === id);
export const locationById = (id?: string) => custodyLocations.find((location) => location.id === id);

export const workflowById = (id: string) => workflowDefinitions.find((workflow) => workflow.id === id);

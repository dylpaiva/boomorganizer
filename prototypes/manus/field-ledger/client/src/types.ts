/** Field Ledger design reminder: immutable operational evidence uses compact labels, clear provenance, and synthetic data only. */
export type InventoryEventType =
  | "acquisition"
  | "receipt"
  | "movement"
  | "allocation"
  | "load"
  | "use"
  | "return"
  | "disposition"
  | "destruction"
  | "adjustment"
  | "correction"
  | "reversal";

export type SyncState = "synced" | "queued";

export type WorkflowId =
  | "receive-inventory"
  | "scan-product"
  | "assign-lot"
  | "move-inventory"
  | "magazine-daily-close"
  | "physical-inventory"
  | "variance-investigation"
  | "magazine-inspection"
  | "show-package"
  | "show-loadout"
  | "vehicle-custody"
  | "return-reconciliation"
  | "shipment-review"
  | "audit-history"
  | "regulatory-export";

export type WorkflowGroup = "Inventory" | "Magazine" | "Shows" | "Compliance";

export interface Product {
  id: string;
  scanCode: string;
  sku: string;
  displayName: string;
  description: string;
  unit: "each";
}

export interface CustodyLocation {
  id: string;
  label: string;
  kind: "magazine" | "show-package" | "vehicle" | "temporary" | "external";
  synthetic: true;
}

export interface InventoryEvent {
  id: string;
  sequence: number;
  type: InventoryEventType;
  occurredAt: string;
  recordedAt: string;
  actor: string;
  productId: string;
  lotId?: string;
  quantity: number;
  unit: "each";
  fromCustodyId?: string;
  toCustodyId?: string;
  reference: string;
  note: string;
  correctionOf?: string;
  reversalOf?: string;
  syncState: SyncState;
  receiptId: string;
  demoOnly: true;
}

export interface OperationReceipt {
  id: string;
  workflow: WorkflowId;
  occurredAt: string;
  actor: string;
  outcome: "completed" | "attention" | "exported";
  title: string;
  summary: string;
  reference: string;
  syncState: SyncState;
  demoOnly: true;
}

export interface PhysicalCount {
  id: string;
  locationId: string;
  productId: string;
  lotId: string;
  expectedQuantity: number;
  countedQuantity: number;
  actor: string;
  occurredAt: string;
  status: "matched" | "variance-open" | "investigating" | "adjusted";
  note: string;
  demoOnly: true;
}

export interface AppState {
  events: InventoryEvent[];
  operationReceipts: OperationReceipt[];
  counts: PhysicalCount[];
  simulateOffline: boolean;
  lastReceiptId?: string;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  group: WorkflowGroup;
  title: string;
  shortTitle: string;
  description: string;
  primaryAction: string;
  purpose: string;
  eventType?: InventoryEventType;
  expectedState: string;
}

export interface InventoryProjectionRow {
  productId: string;
  lotId: string;
  custodyId: string;
  quantity: number;
}

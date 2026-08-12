// PyroLedger domain models.
// These are UI-layer types only. They intentionally contain NO business rules,
// regulatory logic, or compliance determinations. The production API/database
// will own all of that. These shapes describe what the UI renders.

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type ID = string
export type ISODate = string // e.g. "2026-02-14T09:30:00Z"

/**
 * Operational status flags surfaced in the UI. These are display signals only.
 * The software NEVER certifies legal compliance — these communicate that a
 * human review or action may be required.
 */
export type ReviewFlag =
  | 'review-required'
  | 'potential-conflict'
  | 'missing-documentation'
  | 'variance-detected'
  | 'human-review-required'

export type SyncState = 'synced' | 'pending' | 'offline' | 'error'

export type UnitOfMeasure = 'each' | 'case' | 'lb' | 'kg' | 'ft'

// ---------------------------------------------------------------------------
// Product master
// ---------------------------------------------------------------------------

/** UN hazard division as a plain label — not validated or enforced by the UI. */
export type HazardDivision =
  | '1.1D'
  | '1.1G'
  | '1.3G'
  | '1.4G'
  | '1.4S'
  | '1.5D'

export interface Product {
  id: ID
  sku: string
  name: string
  manufacturer: string
  category: 'display-shell' | 'cake' | 'lift-charge' | 'igniter' | 'accessory' | 'binary'
  hazardDivision: HazardDivision
  unHazardId: string // e.g. "UN0335"
  netExplosiveWeightG: number // per unit, grams — data field only
  unitOfMeasure: UnitOfMeasure
  storageGroup: string
  active: boolean
  notes?: string
}

// ---------------------------------------------------------------------------
// Inventory & lots
// ---------------------------------------------------------------------------

export interface InventoryLot {
  id: ID
  lotNumber: string
  productId: ID
  productName: string
  sku: string
  quantity: number
  unitOfMeasure: UnitOfMeasure
  magazineId: ID
  magazineName: string
  receivedDate: ISODate
  manufactureDate?: ISODate
  supplierLotRef?: string
  netExplosiveWeightG: number // aggregate for the lot
  flags: ReviewFlag[]
  sync: SyncState
}

export interface InventorySummaryRow {
  productId: ID
  sku: string
  productName: string
  category: Product['category']
  hazardDivision: HazardDivision
  totalQuantity: number
  unitOfMeasure: UnitOfMeasure
  lotCount: number
  magazineCount: number
  totalNewG: number
  flags: ReviewFlag[]
}

// ---------------------------------------------------------------------------
// Magazines (storage)
// ---------------------------------------------------------------------------

export type MagazineType = 'type-1' | 'type-2' | 'type-3' | 'type-4'
export type MagazineStatus = 'operational' | 'inspection-due' | 'closed' | 'maintenance'

export interface Magazine {
  id: ID
  name: string
  code: string
  type: MagazineType
  status: MagazineStatus
  location: string // fictional label, e.g. "West Yard — Bay 3"
  capacityNewG: number
  currentNewG: number
  lotCount: number
  lastInspection?: ISODate
  nextInspectionDue?: ISODate
  lastDailyClose?: ISODate
  flags: ReviewFlag[]
}

// ---------------------------------------------------------------------------
// Transactions / ledger
// ---------------------------------------------------------------------------

export type TransactionType =
  | 'receive'
  | 'transfer'
  | 'issue'
  | 'return'
  | 'adjustment'
  | 'disposal'
  | 'count-adjustment'

export interface LedgerEntry {
  id: ID
  timestamp: ISODate
  type: TransactionType
  productName: string
  sku: string
  lotNumber: string
  quantity: number // signed: negative = out
  unitOfMeasure: UnitOfMeasure
  fromLocation?: string
  toLocation?: string
  operator: string
  reference: string // e.g. shipment/show/count reference
  flags: ReviewFlag[]
  sync: SyncState
}

// ---------------------------------------------------------------------------
// Physical count & variance
// ---------------------------------------------------------------------------

export type CountStatus = 'draft' | 'in-progress' | 'pending-review' | 'reconciled' | 'closed'

export interface CountSession {
  id: ID
  reference: string
  magazineId: ID
  magazineName: string
  status: CountStatus
  startedAt: ISODate
  completedAt?: ISODate
  countedBy: string
  linesTotal: number
  linesCounted: number
  variancesFound: number
}

export interface CountLine {
  id: ID
  lotNumber: string
  productName: string
  sku: string
  systemQty: number
  countedQty: number | null
  unitOfMeasure: UnitOfMeasure
  variance: number // countedQty - systemQty; 0 when matched
}

export interface VarianceCase {
  id: ID
  reference: string
  countReference: string
  magazineName: string
  productName: string
  lotNumber: string
  systemQty: number
  countedQty: number
  variance: number
  status: 'open' | 'investigating' | 'pending-review' | 'resolved'
  openedAt: ISODate
  assignedTo?: string
  flags: ReviewFlag[]
}

// ---------------------------------------------------------------------------
// Magazine inspection & daily close
// ---------------------------------------------------------------------------

export type InspectionResult = 'pass' | 'attention' | 'fail'

export interface InspectionChecklistItem {
  id: ID
  label: string
  result: InspectionResult | null
  note?: string
}

export interface MagazineInspection {
  id: ID
  reference: string
  magazineId: ID
  magazineName: string
  inspectedBy: string
  performedAt: ISODate
  overallResult: InspectionResult
  itemsPassed: number
  itemsTotal: number
  flags: ReviewFlag[]
}

export interface DailyCloseRecord {
  id: ID
  date: ISODate
  magazineName: string
  openingNewG: number
  closingNewG: number
  expectedNewG: number
  status: 'balanced' | 'variance-detected' | 'pending'
  closedBy?: string
  flags: ReviewFlag[]
}

// ---------------------------------------------------------------------------
// Shows, packages, loadouts, returns
// ---------------------------------------------------------------------------

export type ShowStatus =
  | 'planned'
  | 'packaging'
  | 'loaded'
  | 'in-field'
  | 'returned'
  | 'reconciled'
  | 'closed'

export interface Show {
  id: ID
  reference: string
  name: string
  client: string // fictional
  venue: string // fictional
  date: ISODate
  status: ShowStatus
  leadOperator: string
  itemCount: number
  totalNewG: number
  flags: ReviewFlag[]
}

export interface ShowPackageLine {
  id: ID
  productName: string
  sku: string
  lotNumber: string
  quantityPlanned: number
  quantityPackaged: number
  unitOfMeasure: UnitOfMeasure
}

export interface LoadoutLine {
  id: ID
  productName: string
  lotNumber: string
  quantity: number
  scanned: boolean
  containerRef: string
}

export interface ReturnLine {
  id: ID
  productName: string
  lotNumber: string
  quantityLoaded: number
  quantityFired: number
  quantityReturned: number
  quantityUnaccounted: number
  flags: ReviewFlag[]
}

// ---------------------------------------------------------------------------
// Shipments
// ---------------------------------------------------------------------------

export type ShipmentDirection = 'inbound' | 'outbound'
export type ShipmentStatus = 'expected' | 'in-transit' | 'received' | 'dispatched' | 'exception'

export interface Shipment {
  id: ID
  reference: string
  direction: ShipmentDirection
  status: ShipmentStatus
  counterparty: string // fictional supplier/carrier
  carrier: string
  expectedDate: ISODate
  lineCount: number
  totalNewG: number
  flags: ReviewFlag[]
}

// ---------------------------------------------------------------------------
// Compliance review, documents, audit
// ---------------------------------------------------------------------------

export interface ComplianceItem {
  id: ID
  reference: string
  subject: string
  relatedTo: string // e.g. "Magazine M-03", "Show SH-2041"
  flag: ReviewFlag
  raisedAt: ISODate
  assignedTo?: string
  status: 'open' | 'in-review' | 'cleared' | 'escalated'
  detail: string
}

export type DocumentKind =
  | 'license'
  | 'inspection-report'
  | 'shipping-paper'
  | 'daily-log'
  | 'training-record'
  | 'sds'

export interface DocumentRecord {
  id: ID
  title: string
  kind: DocumentKind
  relatedTo: string
  uploadedBy: string
  uploadedAt: ISODate
  expiresAt?: ISODate
  status: 'valid' | 'expiring' | 'expired' | 'missing'
  sizeKb: number
}

export interface AuditEvent {
  id: ID
  timestamp: ISODate
  actor: string
  action: string
  entity: string
  entityRef: string
  detail: string
  channel: 'web' | 'mobile' | 'system'
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export type UserRole = 'admin' | 'magazine-keeper' | 'operator' | 'compliance-officer' | 'viewer'

export interface UserAccount {
  id: ID
  name: string
  email: string
  role: UserRole
  active: boolean
  lastActive: ISODate
  assignedSites: string[]
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportDefinition {
  id: ID
  name: string
  description: string
  category: 'inventory' | 'compliance' | 'operations' | 'audit'
  lastRun?: ISODate
  format: 'pdf' | 'csv' | 'xlsx'
}

// PyroLedger service layer.
//
// This module is the single seam between the UI and the (future) backend.
// Today it returns mock data; tomorrow each function can be reimplemented to
// call FastAPI endpoints WITHOUT changing any component. Components must only
// import from here — never from `mock-data` directly.
//
// The signatures are intentionally async and Promise-based to match a real
// network layer. No business rules, validation, or compliance logic lives
// here — this layer only transports data.

import * as mock from './mock-data'
import type {
  Product,
  InventoryLot,
  InventorySummaryRow,
  Magazine,
  LedgerEntry,
  CountSession,
  CountLine,
  VarianceCase,
  InspectionChecklistItem,
  MagazineInspection,
  DailyCloseRecord,
  Show,
  ShowPackageLine,
  LoadoutLine,
  ReturnLine,
  Shipment,
  ComplianceItem,
  DocumentRecord,
  AuditEvent,
  UserAccount,
  ReportDefinition,
} from './types'

// Simulated latency helper. Kept tiny so the prototype feels responsive.
async function resolve<T>(data: T, ms = 0): Promise<T> {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms))
  // Return a structural copy so callers can't mutate the mock store.
  return structuredClone(data)
}

export const api = {
  // Products
  listProducts: (): Promise<Product[]> => resolve(mock.products),
  getProduct: (id: string): Promise<Product | undefined> =>
    resolve(mock.products.find((p) => p.id === id)),

  // Inventory
  listInventorySummary: (): Promise<InventorySummaryRow[]> => resolve(mock.inventorySummary),
  listLots: (): Promise<InventoryLot[]> => resolve(mock.inventoryLots),
  getLot: (id: string): Promise<InventoryLot | undefined> =>
    resolve(mock.inventoryLots.find((l) => l.id === id)),
  listLotsByProduct: (productId: string): Promise<InventoryLot[]> =>
    resolve(mock.inventoryLots.filter((l) => l.productId === productId)),

  // Magazines
  listMagazines: (): Promise<Magazine[]> => resolve(mock.magazines),
  getMagazine: (id: string): Promise<Magazine | undefined> =>
    resolve(mock.magazines.find((m) => m.id === id)),
  listLotsByMagazine: (magazineId: string): Promise<InventoryLot[]> =>
    resolve(mock.inventoryLots.filter((l) => l.magazineId === magazineId)),

  // Ledger
  listLedger: (): Promise<LedgerEntry[]> => resolve(mock.ledgerEntries),

  // Counts & variance
  listCountSessions: (): Promise<CountSession[]> => resolve(mock.countSessions),
  getCountLines: (): Promise<CountLine[]> => resolve(mock.countLines),
  listVarianceCases: (): Promise<VarianceCase[]> => resolve(mock.varianceCases),
  getVarianceCase: (id: string): Promise<VarianceCase | undefined> =>
    resolve(mock.varianceCases.find((v) => v.id === id)),

  // Inspection & daily close
  getInspectionChecklist: (): Promise<InspectionChecklistItem[]> =>
    resolve(mock.inspectionChecklist),
  listInspections: (): Promise<MagazineInspection[]> => resolve(mock.magazineInspections),
  listDailyClose: (): Promise<DailyCloseRecord[]> => resolve(mock.dailyCloseRecords),

  // Shows & logistics
  listShows: (): Promise<Show[]> => resolve(mock.shows),
  getShow: (id: string): Promise<Show | undefined> =>
    resolve(mock.shows.find((s) => s.id === id)),
  getShowPackage: (): Promise<ShowPackageLine[]> => resolve(mock.showPackageLines),
  getLoadout: (): Promise<LoadoutLine[]> => resolve(mock.loadoutLines),
  getReturnLines: (): Promise<ReturnLine[]> => resolve(mock.returnLines),
  listShipments: (): Promise<Shipment[]> => resolve(mock.shipments),

  // Governance
  listComplianceItems: (): Promise<ComplianceItem[]> => resolve(mock.complianceItems),
  listDocuments: (): Promise<DocumentRecord[]> => resolve(mock.documents),
  listAuditEvents: (): Promise<AuditEvent[]> => resolve(mock.auditEvents),
  listUsers: (): Promise<UserAccount[]> => resolve(mock.users),
  listReports: (): Promise<ReportDefinition[]> => resolve(mock.reportDefinitions),

  // Dashboard
  getDashboardStats: () => resolve(mock.dashboardStats),
  getNewTrend: () => resolve(mock.newTrend),
}

export type PyroApi = typeof api

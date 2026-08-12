import { useState, useCallback } from "react";
import {
  Package, Archive, Truck, Shield, FileText, ChartBar, Settings,
  AlertTriangle, CircleCheck, Clock, CircleX, Search, Bell,
  X, ListFilter, Download, Plus, ChevronLeft,
  Scan, WifiOff, RefreshCw, EllipsisVertical, Box, Clipboard,
  Activity, Layers, Zap, Tag, BookOpen, List, Building,
  Check, MapPin, Eye, Hash, OctagonAlert, TrendingDown,
  ArrowRight, ArrowLeft, RotateCcw, Lock, Move, Camera,
  Smartphone, Monitor, Info, Inbox,
  Users, KeyRound, Gauge
} from "lucide-react";

// ─── TYPES ──────────────────────────────────────────────────────────────────

type ViewId =
  | "dashboard" | "inventory" | "products" | "lots"
  | "magazines" | "magazine-detail" | "shipments"
  | "ledger" | "inspections" | "physical" | "variance"
  | "compliance" | "shows" | "packages" | "loadout"
  | "documents" | "reports" | "audit" | "admin"
  | "mobile";

type StatusKey =
  | "review-required" | "potential-conflict" | "missing-documentation"
  | "variance-detected" | "human-review-required" | "pending-sync"
  | "offline" | "draft" | "awaiting-approval" | "archived"
  | "confirmed" | "active";

interface NavItem { id: string; label: string; icon: React.ElementType; count?: number; alert?: boolean; }
interface NavGroup { label: string; items: NavItem[]; }
interface InventoryItem {
  id: string; sku: string; name: string; cat: string; mag: string;
  lot: string; qty: number; new_wt: number; status: StatusKey;
}
interface Magazine {
  id: string; name: string; location: string; capacity: number; current: number;
  license: string; expires: string; last_inspection: string; next_inspection: string;
  status: StatusKey; keeper: string; type: string; items: number;
}
interface Transaction {
  id: string; type: string; ts: string; user: string; from: string; to: string;
  item: string; name: string; qty: number; ref: string; status: StatusKey;
}
interface ComplianceAlert {
  id: string; severity: "critical" | "high" | "medium" | "low";
  type: StatusKey; title: string; desc: string;
  created: string; due: string; assigned: string;
}
interface Show {
  id: string; name: string; date: string; location: string;
  pyro: string; status: StatusKey; packages: number; items: number; new_wt: number;
}

// ─── STATUS CONFIG ───────────────────────────────────────────────────────────

const STATUS: Record<StatusKey, { label: string; fg: string; bg: string; bd: string }> = {
  "review-required":       { label: "Review Required",       fg: "#92400E", bg: "#FFFBEB", bd: "#F59E0B" },
  "potential-conflict":    { label: "Potential Conflict",     fg: "#991B1B", bg: "#FEF2F2", bd: "#F87171" },
  "missing-documentation": { label: "Missing Documentation",  fg: "#5B21B6", bg: "#F5F3FF", bd: "#A78BFA" },
  "variance-detected":     { label: "Variance Detected",      fg: "#9A3412", bg: "#FFF7ED", bd: "#FB923C" },
  "human-review-required": { label: "Human Review Required",  fg: "#7F1D1D", bg: "#FEE2E2", bd: "#EF4444" },
  "pending-sync":          { label: "Pending Sync",           fg: "#1E3A8A", bg: "#EFF6FF", bd: "#93C5FD" },
  "offline":               { label: "Offline",                fg: "#374151", bg: "#F3F4F6", bd: "#9CA3AF" },
  "draft":                 { label: "Draft",                  fg: "#6B7280", bg: "#F9FAFB", bd: "#D1D5DB" },
  "awaiting-approval":     { label: "Awaiting Approval",      fg: "#78350F", bg: "#FFFBEB", bd: "#FCD34D" },
  "archived":              { label: "Archived",               fg: "#475569", bg: "#F8FAFC", bd: "#CBD5E1" },
  "confirmed":             { label: "Confirmed",              fg: "#14532D", bg: "#F0FDF4", bd: "#86EFAC" },
  "active":                { label: "Active",                 fg: "#14532D", bg: "#F0FDF4", bd: "#86EFAC" },
};

const SEVERITY_BAR: Record<string, string> = {
  critical: "#B91C1C",
  high: "#EA580C",
  medium: "#D97706",
  low: "#6B7280",
};

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

const NAV: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { id: "dashboard",  label: "Dashboard",        icon: Activity },
      { id: "inventory",  label: "Inventory",         icon: Package },
      { id: "products",   label: "Products",          icon: Tag },
      { id: "lots",       label: "Inventory Lots",    icon: Layers },
    ],
  },
  {
    label: "Storage",
    items: [
      { id: "magazines",  label: "Magazines",         icon: Archive,  count: 1, alert: true },
      { id: "shipments",  label: "Shipments",         icon: Truck },
    ],
  },
  {
    label: "Compliance",
    items: [
      { id: "ledger",     label: "Transaction Ledger",icon: BookOpen },
      { id: "inspections",label: "Inspections",       icon: Clipboard, count: 2, alert: false },
      { id: "physical",   label: "Physical Inventory",icon: Box },
      { id: "variance",   label: "Variance Review",   icon: AlertTriangle, count: 1, alert: true },
      { id: "compliance", label: "Compliance Review", icon: Shield },
    ],
  },
  {
    label: "Events",
    items: [
      { id: "shows",      label: "Shows",             icon: Zap },
      { id: "packages",   label: "Show Packages",     icon: Package },
      { id: "loadout",    label: "Loadout",           icon: List },
    ],
  },
  {
    label: "Records",
    items: [
      { id: "documents",  label: "Documents",         icon: FileText },
      { id: "reports",    label: "Reports",           icon: ChartBar },
      { id: "audit",      label: "Audit History",     icon: Clock },
    ],
  },
  {
    label: "System",
    items: [
      { id: "admin",      label: "Administration",    icon: Settings },
    ],
  },
];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const INVENTORY: InventoryItem[] = [
  { id: "ITM-0081", sku: "SH-100R-1G",   name: "100mm Red Star Shell",          cat: "1.3G Display",   mag: "MAG-001", lot: "LOT-2025-041", qty: 144, new_wt: 1.2,  status: "active" },
  { id: "ITM-0082", sku: "SH-100TC-1G",  name: "100mm Titanium Crossette",      cat: "1.3G Display",   mag: "MAG-001", lot: "LOT-2025-041", qty: 72,  new_wt: 1.1,  status: "active" },
  { id: "ITM-0083", sku: "CK-200-4F",    name: "200-Shot Cake",                 cat: "1.4G Consumer",  mag: "MAG-003", lot: "LOT-2025-038", qty: 48,  new_wt: 4.5,  status: "review-required" },
  { id: "ITM-0084", sku: "SH-150GP-1G",  name: '6" Golden Peony Shell',         cat: "1.3G Display",   mag: "MAG-001", lot: "LOT-2025-042", qty: 60,  new_wt: 2.8,  status: "active" },
  { id: "ITM-0085", sku: "SH-150SC-1G",  name: '6" Silver Chrysanthemum',       cat: "1.3G Display",   mag: "MAG-002", lot: "LOT-2025-042", qty: 36,  new_wt: 2.8,  status: "awaiting-approval" },
  { id: "ITM-0086", sku: "EM-NM-6A",     name: "Electric Match (6A NEMA)",      cat: "Ignition",       mag: "MAG-001", lot: "LOT-2025-039", qty: 500, new_wt: 0.0,  status: "active" },
  { id: "ITM-0087", sku: "FU-SF-100",    name: "Safety Fuse 100ft",             cat: "Accessory",      mag: "MAG-001", lot: "LOT-2025-039", qty: 80,  new_wt: 0.0,  status: "active" },
  { id: "ITM-0088", sku: "SH-125BP-1G",  name: '5" Brocade Peony Shell',        cat: "1.3G Display",   mag: "MAG-002", lot: "LOT-2025-043", qty: 24,  new_wt: 1.9,  status: "variance-detected" },
  { id: "ITM-0089", sku: "MO-60BL-1G",   name: "60mm Blue Titanium Mortar",     cat: "1.3G Display",   mag: "MAG-001", lot: "LOT-2025-041", qty: 200, new_wt: 0.6,  status: "active" },
  { id: "ITM-0090", sku: "SH-203GP-1G",  name: '8" Grand Finale Shell',         cat: "1.3G Display",   mag: "MAG-004", lot: "LOT-2025-044", qty: 12,  new_wt: 8.2,  status: "missing-documentation" },
];

const MAGAZINES: Magazine[] = [
  {
    id: "MAG-001", name: "Primary Storage", location: "Anderson Creek Site",
    capacity: 2000, current: 1247,
    license: "FED-ATF-2025-0441", expires: "2026-03-15",
    last_inspection: "2025-06-02", next_inspection: "2025-09-02",
    status: "active", keeper: "J. Vasquez", type: "Type 1 — Above Ground", items: 7,
  },
  {
    id: "MAG-002", name: "Day-of Show Magazine", location: "Riverside Fairgrounds",
    capacity: 500, current: 289,
    license: "FED-ATF-2025-0442", expires: "2026-03-15",
    last_inspection: "2025-05-29", next_inspection: "2025-08-29",
    status: "review-required", keeper: "M. Okonkwo", type: "Type 2 — Indoor", items: 3,
  },
  {
    id: "MAG-003", name: "Quarantine Hold", location: "Anderson Creek Site",
    capacity: 500, current: 48,
    license: "FED-ATF-2025-0441", expires: "2026-03-15",
    last_inspection: "2025-06-02", next_inspection: "2025-09-02",
    status: "variance-detected", keeper: "J. Vasquez", type: "Type 1 — Above Ground", items: 1,
  },
  {
    id: "MAG-004", name: "Consumer Grade Storage", location: "Anderson Creek Site",
    capacity: 1000, current: 12,
    license: "FED-ATF-2025-0443", expires: "2025-09-01",
    last_inspection: "2025-05-15", next_inspection: "2025-08-15",
    status: "missing-documentation", keeper: "T. Chen", type: "Type 4 — Consumer", items: 1,
  },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: "TXN-20250611-0041", type: "Transfer", ts: "2025-06-11 14:23:07",
    user: "J. Vasquez", from: "MAG-001", to: "MAG-002",
    item: "ITM-0084", name: '6" Golden Peony Shell', qty: 24, ref: "SHW-2025-019",
    status: "confirmed",
  },
  {
    id: "TXN-20250610-0038", type: "Receive", ts: "2025-06-10 09:47:22",
    user: "T. Chen", from: "PyroArts Inc.", to: "MAG-001",
    item: "ITM-0089", name: "60mm Blue Titanium Mortar", qty: 200, ref: "PO-2025-0188",
    status: "awaiting-approval",
  },
  {
    id: "TXN-20250609-0035", type: "Return", ts: "2025-06-09 18:04:51",
    user: "M. Okonkwo", from: "MAG-002", to: "MAG-001",
    item: "ITM-0082", name: "100mm Titanium Crossette", qty: 18, ref: "SHW-2025-018",
    status: "confirmed",
  },
  {
    id: "TXN-20250608-0031", type: "Count", ts: "2025-06-08 11:13:44",
    user: "J. Vasquez", from: "MAG-001", to: "MAG-001",
    item: "ITM-0088", name: '5" Brocade Peony Shell', qty: 24, ref: "PHY-2025-006",
    status: "variance-detected",
  },
  {
    id: "TXN-20250607-0028", type: "Transfer", ts: "2025-06-07 08:31:19",
    user: "T. Chen", from: "MAG-001", to: "MAG-003",
    item: "ITM-0083", name: "200-Shot Cake", qty: 48, ref: "QRN-2025-003",
    status: "review-required",
  },
  {
    id: "TXN-20250605-0024", type: "Inspect", ts: "2025-06-05 07:58:02",
    user: "J. Vasquez", from: "MAG-001", to: "MAG-001",
    item: "ALL", name: "Full magazine inspection", qty: 0, ref: "INS-2025-012",
    status: "confirmed",
  },
];

const COMPLIANCE_ALERTS: ComplianceAlert[] = [
  {
    id: "CA-001", severity: "critical",
    type: "human-review-required",
    title: "Variance Detected — MAG-002",
    desc: "Physical count shows 22 units of Brocade Peony (ITM-0088). System records 24. Discrepancy: −2 units.",
    created: "2025-06-08", due: "2025-06-15", assigned: "J. Vasquez",
  },
  {
    id: "CA-002", severity: "high",
    type: "missing-documentation",
    title: "Transport Manifest Missing — TXN-20250607-0028",
    desc: "Transfer to Quarantine Hold (MAG-003) has no ATF Form 5400.27 attached.",
    created: "2025-06-07", due: "2025-06-14", assigned: "T. Chen",
  },
  {
    id: "CA-003", severity: "high",
    type: "review-required",
    title: "License Expiring — MAG-004",
    desc: "Consumer Grade Storage license FED-ATF-2025-0443 expires 2025-09-01. Renewal not initiated.",
    created: "2025-06-05", due: "2025-08-01", assigned: "T. Chen",
  },
  {
    id: "CA-004", severity: "medium",
    type: "awaiting-approval",
    title: "Receive Pending Approval — TXN-20250610-0038",
    desc: "Incoming shipment (200 mortars) from PyroArts Inc. awaiting senior operator approval before release.",
    created: "2025-06-10", due: "2025-06-13", assigned: "J. Vasquez",
  },
];

const SHOWS: Show[] = [
  {
    id: "SHW-2025-019", name: "Riverside Independence Day",
    date: "2025-07-04", location: "Riverside Park, Healdsburg",
    pyro: "J. Vasquez", status: "awaiting-approval",
    packages: 3, items: 287, new_wt: 341.2,
  },
  {
    id: "SHW-2025-020", name: "Skyline Corporate Gala",
    date: "2025-07-18", location: "Rooftop, 555 Market St, SF",
    pyro: "M. Okonkwo", status: "draft",
    packages: 1, items: 64, new_wt: 78.4,
  },
  {
    id: "SHW-2025-021", name: "State Fair — Annual",
    date: "2025-08-02", location: "Sonoma County Fairgrounds",
    pyro: "J. Vasquez", status: "draft",
    packages: 5, items: 512, new_wt: 624.8,
  },
  {
    id: "SHW-2025-018", name: "Marina Night Show",
    date: "2025-06-01", location: "Petaluma Marina",
    pyro: "M. Okonkwo", status: "confirmed",
    packages: 2, items: 193, new_wt: 228.6,
  },
];

const INSPECTION_ITEMS = [
  { id: 1, label: "Exterior structure — no visible damage", required: true, status: "pass" as const },
  { id: 2, label: "Ventilation openings clear and unobstructed", required: true, status: "pass" as const },
  { id: 3, label: "Locking mechanism functional", required: true, status: "pass" as const },
  { id: 4, label: "Fire extinguisher present and in-date", required: true, status: "fail" as const },
  { id: 5, label: "Grounding rod installed and connected", required: true, status: "pass" as const },
  { id: 6, label: "Inventory manifest matches physical contents", required: true, status: "review" as const },
  { id: 7, label: "No smoking / open flame signs posted", required: true, status: "pass" as const },
  { id: 8, label: "Temperature log current (within 24h)", required: false, status: "pass" as const },
];

const AUDIT_LOG = [
  { id: "AUD-20250611-088", ts: "2025-06-11 14:23:11", user: "J. Vasquez", action: "Transfer created", entity: "TXN-20250611-0041", detail: "24 × ITM-0084 from MAG-001 to MAG-002" },
  { id: "AUD-20250611-087", ts: "2025-06-11 14:22:48", user: "J. Vasquez", action: "Loadout modified", entity: "SHW-2025-019", detail: "Added Package PKG-041 to show" },
  { id: "AUD-20250610-086", ts: "2025-06-10 09:52:17", user: "T. Chen",    action: "Receive submitted", entity: "TXN-20250610-0038", detail: "200 × ITM-0089 from PyroArts Inc." },
  { id: "AUD-20250610-085", ts: "2025-06-10 09:47:22", user: "T. Chen",    action: "PO matched", entity: "PO-2025-0188", detail: "Purchase order matched to incoming shipment" },
  { id: "AUD-20250609-084", ts: "2025-06-09 18:10:04", user: "System",     action: "Variance flagged", entity: "PHY-2025-006", detail: "Auto-detected variance on ITM-0088 in MAG-002" },
  { id: "AUD-20250608-083", ts: "2025-06-08 11:13:44", user: "J. Vasquez", action: "Physical count submitted", entity: "PHY-2025-006", detail: "MAG-001 full count — 1 variance detected" },
];

// ─── UTILITY ─────────────────────────────────────────────────────────────────

const F = { condensed: { fontFamily: "'Barlow Semi Condensed', system-ui, sans-serif" } as const };
const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────

function StatusBadge({ status, small }: { status: StatusKey; small?: boolean }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center border font-semibold tracking-wide whitespace-nowrap ${small ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
      style={{ color: s.fg, background: s.bg, borderColor: s.bd, ...F.condensed, borderRadius: "2px" }}
    >
      {s.label.toUpperCase()}
    </span>
  );
}

function Pill({ label, color = "#5C6278", bg = "#E8EBF3" }: { label: string; color?: string; bg?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium"
      style={{ color, background: bg, borderRadius: "2px", ...F.condensed }}>
      {label}
    </span>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase px-3 py-2"
      style={F.condensed}>{children}</div>
  );
}

function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-[18px] font-semibold text-foreground" style={F.condensed}>{title}</h1>
        {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function Btn({
  children, variant = "primary", size = "sm", onClick, icon: Icon, disabled
}: {
  children?: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "xs" | "sm" | "md"; onClick?: () => void; icon?: React.ElementType; disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 font-medium border transition-colors cursor-pointer select-none";
  const sizes = { xs: "px-2 py-1 text-[11px]", sm: "px-3 py-1.5 text-[12px]", md: "px-4 py-2 text-[13px]" };
  const variants = {
    primary: "bg-primary text-primary-foreground border-primary hover:opacity-90",
    secondary: "bg-card text-foreground border-border hover:bg-muted",
    ghost: "bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
    destructive: "bg-destructive text-destructive-foreground border-destructive hover:opacity-90",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      onClick={onClick} disabled={disabled} style={{ borderRadius: "3px" }}>
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );
}

function SearchBar({ placeholder = "Search…", compact }: { placeholder?: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 bg-card border border-border ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
      style={{ borderRadius: "3px" }}>
      <Search size={13} className="text-muted-foreground flex-shrink-0" />
      <input
        className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none w-full"
        placeholder={placeholder}
      />
    </div>
  );
}

function FilterBar({ filters }: { filters: string[] }) {
  const [active, setActive] = useState<string>("All");
  return (
    <div className="flex items-center gap-1">
      {["All", ...filters].map(f => (
        <button
          key={f}
          onClick={() => setActive(f)}
          className={`px-2.5 py-1 text-[11px] font-medium border transition-colors ${active === f
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"}`}
          style={{ borderRadius: "3px", ...F.condensed }}>
          {f}
        </button>
      ))}
    </div>
  );
}

function KPICard({ label, value, sub, alert, trend }: {
  label: string; value: string; sub?: string; alert?: boolean; trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className={`bg-card border border-border p-4 flex flex-col gap-1 ${alert ? "border-l-2" : ""}`}
      style={alert ? { borderLeftColor: "#C2410C" } : {}}>
      <div className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase" style={F.condensed}>
        {label}
      </div>
      <div className={`text-[26px] font-bold leading-none ${alert ? "text-[#C2410C]" : "text-foreground"}`}
        style={{ ...MONO, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sub && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {trend === "down" && <TrendingDown size={11} className="text-[#B91C1C]" />}
          {sub}
        </div>
      )}
    </div>
  );
}

function CapacityBar({ current, capacity }: { current: number; capacity: number }) {
  const p = pct(current, capacity);
  const color = p > 85 ? "#B91C1C" : p > 65 ? "#D97706" : "#16A34A";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground" style={MONO}>{p}%</span>
    </div>
  );
}

function AlertRow({ alert, compact }: { alert: ComplianceAlert; compact?: boolean }) {
  return (
    <div className="flex gap-0 bg-card border border-border overflow-hidden" style={{ borderRadius: "3px" }}>
      <div className="w-1 flex-shrink-0" style={{ background: SEVERITY_BAR[alert.severity] }} />
      <div className="flex-1 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" style={{ color: SEVERITY_BAR[alert.severity] }} />
            <div>
              <div className="text-[12px] font-semibold text-foreground leading-snug">{alert.title}</div>
              {!compact && <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alert.desc}</div>}
            </div>
          </div>
          <StatusBadge status={alert.type} small />
        </div>
        {!compact && (
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground" style={MONO}>
            <span>ASSIGNED: {alert.assigned}</span>
            <span>DUE: {alert.due}</span>
            <span>REF: {alert.id}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TxnTypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Transfer: { bg: "#EFF6FF", color: "#1E3A8A" },
    Receive:  { bg: "#F0FDF4", color: "#14532D" },
    Return:   { bg: "#F5F3FF", color: "#5B21B6" },
    Count:    { bg: "#F3F4F6", color: "#374151" },
    Inspect:  { bg: "#FFFBEB", color: "#92400E" },
    Disposal: { bg: "#FEF2F2", color: "#991B1B" },
  };
  const c = colors[type] ?? { bg: "#F3F4F6", color: "#374151" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wide"
      style={{ background: c.bg, color: c.color, borderRadius: "2px", ...F.condensed }}>
      {type.toUpperCase()}
    </span>
  );
}

function DataTable<T extends Record<string, unknown>>({
  cols, rows, onRow
}: {
  cols: { key: string; label: string; mono?: boolean; right?: boolean; render?: (row: T) => React.ReactNode }[];
  rows: T[];
  onRow?: (row: T) => void;
}) {
  return (
    <div className="bg-card border border-border overflow-hidden" style={{ borderRadius: "3px" }}>
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-muted border-b border-border">
            {cols.map(c => (
              <th key={c.key}
                className={`px-3 py-2 text-left text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase whitespace-nowrap ${c.right ? "text-right" : ""}`}
                style={F.condensed}>
                {c.label}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-border last:border-0 transition-colors ${onRow ? "cursor-pointer hover:bg-muted/60" : ""} ${i % 2 === 1 ? "bg-[#FAFBFD]" : ""}`}
              onClick={() => onRow?.(row)}
            >
              {cols.map(c => (
                <td key={c.key}
                  className={`px-3 py-2.5 text-foreground ${c.right ? "text-right" : ""}`}
                  style={c.mono ? MONO : undefined}>
                  {c.render ? c.render(row) : String(row[c.key] ?? "")}
                </td>
              ))}
              <td className="px-2 py-2.5 text-right">
                <button className="text-muted-foreground hover:text-foreground p-0.5">
                  <EllipsisVertical size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MagazineCard({ mag, onClick }: { mag: Magazine; onClick: () => void }) {
  const pctLoad = pct(mag.current, mag.capacity);
  const barColor = pctLoad > 85 ? "#B91C1C" : pctLoad > 65 ? "#D97706" : "#16A34A";
  return (
    <div
      className="bg-card border border-border overflow-hidden cursor-pointer hover:border-muted-foreground/30 transition-colors"
      style={{ borderRadius: "3px" }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between p-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground" style={{ ...MONO }}>{mag.id}</span>
          </div>
          <div className="text-[14px] font-semibold text-foreground mt-0.5" style={F.condensed}>{mag.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
            <MapPin size={10} /> {mag.location}
          </div>
        </div>
        <StatusBadge status={mag.status} small />
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span>Load</span>
          <span style={MONO}>{mag.current.toLocaleString()} / {mag.capacity.toLocaleString()} lbs NEW</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pctLoad}%`, background: barColor }} />
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-border bg-muted/40 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="text-muted-foreground uppercase tracking-wide" style={F.condensed}>Keeper</div>
          <div className="text-foreground font-medium mt-0.5">{mag.keeper}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wide" style={F.condensed}>Last Insp.</div>
          <div className="text-foreground font-medium mt-0.5" style={MONO}>{mag.last_inspection}</div>
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wide" style={F.condensed}>Items</div>
          <div className="text-foreground font-medium mt-0.5" style={MONO}>{mag.items}</div>
        </div>
      </div>
    </div>
  );
}

function TransactionTimeline({ txns }: { txns: Transaction[] }) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
      <div className="space-y-0">
        {txns.map((t, i) => (
          <div key={t.id} className="flex gap-3 relative">
            <div className="flex-shrink-0 mt-3">
              <div className={`w-[10px] h-[10px] rounded-full border-2 z-10 relative ${t.status === "confirmed" ? "bg-[#16A34A] border-[#16A34A]" : t.status === "variance-detected" ? "bg-[#EA580C] border-[#EA580C]" : "bg-card border-border"}`} />
            </div>
            <div className={`flex-1 pb-4 ${i === txns.length - 1 ? "" : ""}`}>
              <div className="bg-card border border-border p-3" style={{ borderRadius: "3px" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TxnTypeBadge type={t.type} />
                    <span className="text-[12px] font-medium text-foreground">{t.name}</span>
                    {t.qty > 0 && (
                      <span className="text-[11px] text-muted-foreground" style={MONO}>×{t.qty}</span>
                    )}
                  </div>
                  <StatusBadge status={t.status} small />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-muted-foreground" style={MONO}>
                  {t.from !== t.to ? (
                    <span>{t.from} → {t.to}</span>
                  ) : (
                    <span>{t.from}</span>
                  )}
                  <span>{t.user}</span>
                  <span>{t.ts}</span>
                  <span>REF: {t.ref}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InspectionChecklist() {
  const [checks, setChecks] = useState(INSPECTION_ITEMS);
  const toggle = (id: number) => {
    setChecks(prev => prev.map(c =>
      c.id === id
        ? { ...c, status: c.status === "pass" ? "fail" : c.status === "fail" ? "review" : "pass" }
        : c
    ));
  };
  const passCount = checks.filter(c => c.status === "pass").length;

  return (
    <div className="bg-card border border-border" style={{ borderRadius: "3px" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="text-[13px] font-semibold" style={F.condensed}>Inspection Checklist</div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground" style={MONO}>{passCount}/{checks.length} pass</span>
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-[#16A34A] rounded-full" style={{ width: `${pct(passCount, checks.length)}%` }} />
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {checks.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => toggle(c.id)}
              className="w-5 h-5 flex-shrink-0 border flex items-center justify-center transition-colors"
              style={{
                borderRadius: "3px",
                background: c.status === "pass" ? "#F0FDF4" : c.status === "fail" ? "#FEF2F2" : "#FFFBEB",
                borderColor: c.status === "pass" ? "#86EFAC" : c.status === "fail" ? "#F87171" : "#FCD34D",
              }}>
              {c.status === "pass" && <Check size={11} className="text-[#16A34A]" />}
              {c.status === "fail" && <X size={11} className="text-[#B91C1C]" />}
              {c.status === "review" && <AlertTriangle size={9} className="text-[#D97706]" />}
            </button>
            <span className={`text-[12px] flex-1 ${c.status === "fail" ? "text-[#B91C1C]" : "text-foreground"}`}>
              {c.label}
            </span>
            {c.required && (
              <span className="text-[9px] font-bold tracking-wide text-muted-foreground uppercase" style={F.condensed}>
                REQ
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmDialog({ title, desc, action, onConfirm, onCancel, destructive }: {
  title: string; desc: string; action: string;
  onConfirm: () => void; onCancel: () => void; destructive?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
      <div className="bg-card border border-border w-full max-w-sm mx-4 shadow-xl" style={{ borderRadius: "4px" }}>
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <OctagonAlert size={16} className={destructive ? "text-[#B91C1C]" : "text-[#D97706]"} />
          <span className="text-[14px] font-semibold" style={F.condensed}>{title}</span>
        </div>
        <div className="p-4">
          <p className="text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
        </div>
        <div className="flex gap-2 justify-end p-3 border-t border-border bg-muted/40">
          <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
          <Btn variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>{action}</Btn>
        </div>
      </div>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted border-b border-border text-[11px] text-muted-foreground">
      <WifiOff size={12} />
      <span>You are offline. Changes will sync when connection is restored.</span>
      <span className="ml-auto px-2 py-0.5 text-[10px] font-bold tracking-wide"
        style={{ background: "#F3F4F6", color: "#374151", borderRadius: "2px", ...F.condensed }}>
        OFFLINE
      </span>
    </div>
  );
}

function SyncStatus({ synced = true }: { synced?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-medium ${synced ? "text-[#16A34A]" : "text-[#D97706]"}`}
      style={MONO}>
      {synced
        ? <><div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" /><span>SYNCED 14:23</span></>
        : <><RefreshCw size={10} className="animate-spin" style={{ animationDuration: "2s" }} /><span>SYNCING…</span></>
      }
    </div>
  );
}

// ─── VIEWS ───────────────────────────────────────────────────────────────────

function DashboardView({ onNav }: { onNav: (v: ViewId) => void }) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Operations Dashboard"
        sub="Anderson Creek Site · 14:23 PDT · Jun 11, 2025"
        actions={<>
          <SyncStatus />
          <Btn variant="secondary" icon={Download} size="sm">Export</Btn>
        </>}
      />

      {/* Compliance alert bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 border border-[#F59E0B] bg-[#FFFBEB]"
        style={{ borderRadius: "3px" }}>
        <AlertTriangle size={14} className="text-[#D97706] flex-shrink-0" />
        <span className="text-[12px] font-medium text-[#78350F]">
          4 compliance items require attention — 1 critical variance detected in MAG-002
        </span>
        <button className="ml-auto text-[11px] font-semibold text-[#92400E] flex items-center gap-1"
          onClick={() => onNav("compliance")}>
          Review <ArrowRight size={11} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total NEW (lbs)" value="1,596" sub="Across 4 magazines" />
        <KPICard label="Active Magazines" value="4" sub="1 with open alert" alert />
        <KPICard label="Open Inspections" value="2" sub="Next due Aug 15" />
        <KPICard label="Pending Actions" value="4" sub="1 critical, 2 high" alert />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance alerts */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-bold tracking-wide text-foreground uppercase" style={F.condensed}>
              Compliance Alerts
            </h3>
            <button className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => onNav("compliance")}>
              All <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-2">
            {COMPLIANCE_ALERTS.map(a => <AlertRow key={a.id} alert={a} compact />)}
          </div>
        </div>

        {/* Magazine status */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-bold tracking-wide text-foreground uppercase" style={F.condensed}>
              Magazine Status
            </h3>
            <button className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => onNav("magazines")}>
              All <ArrowRight size={10} />
            </button>
          </div>
          <div className="bg-card border border-border divide-y divide-border" style={{ borderRadius: "3px" }}>
            {MAGAZINES.map(m => (
              <div key={m.id} className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-mono">{m.id}</span>
                    <span className="mx-1.5 text-muted-foreground/40">·</span>
                    <span className="text-[12px] font-medium">{m.name}</span>
                  </div>
                  <StatusBadge status={m.status} small />
                </div>
                <CapacityBar current={m.current} capacity={m.capacity} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-bold tracking-wide text-foreground uppercase" style={F.condensed}>
              Recent Transactions
            </h3>
            <button className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => onNav("ledger")}>
              Ledger <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-1.5">
            {TRANSACTIONS.slice(0, 5).map(t => (
              <div key={t.id} className="bg-card border border-border p-2.5 flex items-start gap-2.5"
                style={{ borderRadius: "3px" }}>
                <TxnTypeBadge type={t.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground truncate">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5" style={MONO}>
                    {t.user} · {t.ts.split(" ")[0]}
                  </div>
                </div>
                <StatusBadge status={t.status} small />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryView() {
  const [catFilter, setCatFilter] = useState("All");
  const cats = [...new Set(INVENTORY.map(i => i.cat))];
  const filtered = catFilter === "All" ? INVENTORY : INVENTORY.filter(i => i.cat === catFilter);

  const cols = [
    { key: "id",      label: "Item ID",    mono: true, render: (r: InventoryItem) => <span className="text-muted-foreground" style={MONO}>{r.id}</span> },
    { key: "sku",     label: "SKU",        mono: true, render: (r: InventoryItem) => <span style={MONO}>{r.sku}</span> },
    { key: "name",    label: "Description" },
    { key: "cat",     label: "Category",   render: (r: InventoryItem) => <Pill label={r.cat} /> },
    { key: "mag",     label: "Magazine",   mono: true, render: (r: InventoryItem) => <span className="text-[#1E3A8A] font-medium" style={MONO}>{r.mag}</span> },
    { key: "lot",     label: "Lot",        mono: true },
    { key: "qty",     label: "Qty",        mono: true, right: true },
    { key: "new_wt",  label: "NEW (lbs)",  mono: true, right: true, render: (r: InventoryItem) => <span style={MONO}>{r.new_wt.toFixed(1)}</span> },
    { key: "status",  label: "Status",     render: (r: InventoryItem) => <StatusBadge status={r.status} small /> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        sub={`${INVENTORY.length} items · ${INVENTORY.reduce((a, i) => a + i.qty, 0).toLocaleString()} units total`}
        actions={<>
          <Btn variant="secondary" icon={Download} size="sm">Export</Btn>
          <Btn variant="primary" icon={Plus} size="sm">Add Item</Btn>
        </>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar placeholder="Search by SKU, name, or lot…" />
        <FilterBar filters={cats} />
        <Btn variant="ghost" icon={ListFilter} size="sm">Filters</Btn>
      </div>
      <DataTable cols={cols as never} rows={filtered as never} />
    </div>
  );
}

function MagazinesView({ onDetail }: { onDetail: () => void }) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Magazines"
        sub="Licensed storage facilities — 4 registered"
        actions={<>
          <Btn variant="secondary" icon={Download} size="sm">Export</Btn>
          <Btn variant="primary" icon={Plus} size="sm">Add Magazine</Btn>
        </>}
      />
      <div className="flex items-center gap-3">
        <SearchBar placeholder="Search magazines…" />
        <FilterBar filters={["Active", "Review Required", "Variance Detected"]} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MAGAZINES.map(m => <MagazineCard key={m.id} mag={m} onClick={onDetail} />)}
      </div>
    </div>
  );
}

function MagazineDetailView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"overview" | "contents" | "inspections" | "transactions" | "documents">("overview");
  const mag = MAGAZINES[0];
  const TABS = ["overview", "contents", "inspections", "transactions", "documents"] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mt-0.5">
          <ArrowLeft size={13} /> Magazines
        </button>
      </div>
      <div className="bg-card border border-border p-4" style={{ borderRadius: "3px" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-bold text-muted-foreground" style={MONO}>{mag.id}</span>
              <StatusBadge status={mag.status} />
            </div>
            <h1 className="text-[20px] font-bold text-foreground mt-1" style={F.condensed}>{mag.name}</h1>
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground mt-0.5">
              <MapPin size={11} /> {mag.location}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{mag.type}</div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground" style={F.condensed}>Load</div>
              <div className="text-[18px] font-bold mt-0.5" style={MONO}>{pct(mag.current, mag.capacity)}%</div>
              <div className="text-[10px] text-muted-foreground">{mag.current.toLocaleString()} / {mag.capacity.toLocaleString()} lbs</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground" style={F.condensed}>Keeper</div>
              <div className="text-[14px] font-semibold mt-0.5">{mag.keeper}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground" style={F.condensed}>License</div>
              <div className="text-[11px] font-mono font-medium mt-0.5">{mag.license}</div>
              <div className="text-[10px] text-muted-foreground">Exp: {mag.expires}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[12px] font-semibold border-b-2 transition-colors capitalize ${tab === t
              ? "border-[#C2410C] text-[#C2410C]"
              : "border-transparent text-muted-foreground hover:text-foreground"}`}
            style={F.condensed}>
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="bg-card border border-border p-4" style={{ borderRadius: "3px" }}>
              <div className="text-[12px] font-bold uppercase tracking-wide mb-3" style={F.condensed}>Storage Load</div>
              <CapacityBar current={mag.current} capacity={mag.capacity} />
              <div className="grid grid-cols-2 gap-4 mt-4 text-[11px]">
                <div className="space-y-1">
                  <div className="text-muted-foreground">Current NET Weight</div>
                  <div className="font-bold text-[18px]" style={MONO}>{mag.current.toLocaleString()} lbs</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground">Capacity Remaining</div>
                  <div className="font-bold text-[18px]" style={MONO}>{(mag.capacity - mag.current).toLocaleString()} lbs</div>
                </div>
              </div>
            </div>
            <InspectionChecklist />
          </div>
          <div className="space-y-3">
            <div className="bg-card border border-border p-4 space-y-3" style={{ borderRadius: "3px" }}>
              <div className="text-[12px] font-bold uppercase tracking-wide" style={F.condensed}>License & Compliance</div>
              {[
                { label: "License No.", value: mag.license },
                { label: "Expires", value: mag.expires },
                { label: "Facility Type", value: mag.type },
                { label: "Next Inspection", value: mag.next_inspection },
                { label: "Last Inspection", value: mag.last_inspection },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-[11px] border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium text-right" style={MONO}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border p-4 space-y-2" style={{ borderRadius: "3px" }}>
              <div className="text-[12px] font-bold uppercase tracking-wide mb-2" style={F.condensed}>Quick Actions</div>
              <Btn variant="secondary" size="sm" icon={Clipboard} onClick={() => {}}>Start Inspection</Btn>
              <Btn variant="secondary" size="sm" icon={Box} onClick={() => {}}>Physical Count</Btn>
              <Btn variant="secondary" size="sm" icon={Move} onClick={() => {}}>Transfer Items</Btn>
              <Btn variant="ghost" size="sm" icon={FileText} onClick={() => {}}>View Documents</Btn>
            </div>
          </div>
        </div>
      )}

      {tab === "contents" && (
        <DataTable
          cols={[
            { key: "id", label: "Item ID", mono: true, render: (r: InventoryItem) => <span style={MONO} className="text-muted-foreground">{r.id}</span> },
            { key: "name", label: "Description" },
            { key: "cat", label: "Category", render: (r: InventoryItem) => <Pill label={r.cat} /> },
            { key: "lot", label: "Lot", mono: true },
            { key: "qty", label: "Qty", mono: true, right: true },
            { key: "new_wt", label: "NEW (lbs)", mono: true, right: true, render: (r: InventoryItem) => <span style={MONO}>{r.new_wt.toFixed(1)}</span> },
            { key: "status", label: "Status", render: (r: InventoryItem) => <StatusBadge status={r.status} small /> },
          ] as never}
          rows={INVENTORY.filter(i => i.mag === "MAG-001") as never}
        />
      )}

      {tab === "transactions" && <TransactionTimeline txns={TRANSACTIONS} />}
      {tab === "inspections" && <InspectionChecklist />}
      {tab === "documents" && (
        <div className="bg-card border border-border p-8 text-center" style={{ borderRadius: "3px" }}>
          <FileText size={32} className="text-muted-foreground mx-auto mb-3" />
          <div className="text-[13px] font-medium text-muted-foreground">No documents attached</div>
          <Btn variant="secondary" size="sm" icon={Plus} onClick={() => {}} >Attach Document</Btn>
        </div>
      )}
    </div>
  );
}

function TransactionLedgerView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Transaction Ledger"
        sub="Full chain-of-custody record — 6 entries shown"
        actions={<>
          <Btn variant="secondary" icon={Download} size="sm">Export ATF</Btn>
          <Btn variant="primary" icon={Plus} size="sm">New Transaction</Btn>
        </>}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar placeholder="Search by ID, item, or reference…" />
        <FilterBar filters={["Transfer", "Receive", "Return", "Count", "Inspect"]} />
        <Btn variant="ghost" icon={ListFilter} size="sm">Date Range</Btn>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TransactionTimeline txns={TRANSACTIONS} />
        </div>
        <div className="space-y-3">
          <div className="bg-card border border-border p-4" style={{ borderRadius: "3px" }}>
            <div className="text-[12px] font-bold uppercase tracking-wide mb-3" style={F.condensed}>Summary</div>
            {[
              { label: "Transfers", value: "2", color: "#1E3A8A" },
              { label: "Receives", value: "1", color: "#14532D" },
              { label: "Returns", value: "1", color: "#5B21B6" },
              { label: "Counts", value: "1", color: "#374151" },
              { label: "Inspections", value: "1", color: "#92400E" },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between text-[12px] py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm" style={{ background: r.color }} />
                  <span>{r.label}</span>
                </div>
                <span className="font-bold" style={MONO}>{r.value}</span>
              </div>
            ))}
          </div>
          <div className="bg-[#FFF7ED] border border-[#FB923C] p-3" style={{ borderRadius: "3px" }}>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[#9A3412] mb-1">
              <AlertTriangle size={13} />
              Variance Flagged
            </div>
            <p className="text-[11px] text-[#7C2D12]">
              TXN-20250608-0031 (Count) detected a −2 unit variance on ITM-0088. Human review required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InspectionsView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Inspections"
        sub="2 open · 1 overdue · last completed Jun 2, 2025"
        actions={<Btn variant="primary" icon={Plus} size="sm">New Inspection</Btn>}
      />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
        <KPICard label="Due This Month" value="2" alert />
        <KPICard label="Completed YTD" value="8" />
        <KPICard label="Avg. Duration" value="47m" sub="Last 12 inspections" />
        <KPICard label="Open Findings" value="3" alert />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InspectionChecklist />
        <div className="space-y-2">
          <div className="text-[12px] font-bold uppercase tracking-wide" style={F.condensed}>Recent Inspections</div>
          {[
            { id: "INS-2025-012", mag: "MAG-001", date: "2025-06-05", inspector: "J. Vasquez", status: "confirmed" as StatusKey, findings: 0 },
            { id: "INS-2025-011", mag: "MAG-002", date: "2025-05-29", inspector: "M. Okonkwo", status: "review-required" as StatusKey, findings: 2 },
            { id: "INS-2025-010", mag: "MAG-004", date: "2025-05-15", inspector: "T. Chen", status: "missing-documentation" as StatusKey, findings: 1 },
            { id: "INS-2025-009", mag: "MAG-001", date: "2025-03-02", inspector: "J. Vasquez", status: "confirmed" as StatusKey, findings: 0 },
          ].map(ins => (
            <div key={ins.id} className="bg-card border border-border p-3" style={{ borderRadius: "3px" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground" style={MONO}>{ins.id}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[12px] font-semibold">{ins.mag}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {ins.inspector} · {ins.date}
                    {ins.findings > 0 && <span className="ml-2 text-[#B91C1C]">{ins.findings} finding{ins.findings > 1 ? "s" : ""}</span>}
                  </div>
                </div>
                <StatusBadge status={ins.status} small />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhysicalInventoryView() {
  const [counted, setCounted] = useState<Record<string, number>>({});
  const items = INVENTORY.filter(i => i.mag === "MAG-001");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Physical Inventory — MAG-001"
        sub="Count session PHY-2025-007 · Started 14:07 · J. Vasquez"
        actions={<>
          <Btn variant="secondary" size="sm">Save Draft</Btn>
          <Btn variant="primary" size="sm">Submit Count</Btn>
        </>}
      />
      <div className="bg-[#FFFBEB] border border-[#FCD34D] px-3 py-2.5 flex items-center gap-2" style={{ borderRadius: "3px" }}>
        <Info size={13} className="text-[#D97706]" />
        <span className="text-[12px] text-[#78350F]">
          Count all items in MAG-001. Record physical quantities below. Variances are automatically flagged.
        </span>
      </div>
      <div className="bg-card border border-border" style={{ borderRadius: "3px" }}>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              {["Item ID", "Description", "System Qty", "Physical Count", "Variance", "Status"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase"
                  style={F.condensed}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const phys = counted[item.id] ?? null;
              const variance = phys !== null ? phys - item.qty : null;
              return (
                <tr key={item.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-[#FAFBFD]" : ""}`}>
                  <td className="px-3 py-2.5 text-muted-foreground" style={MONO}>{item.id}</td>
                  <td className="px-3 py-2.5">{item.name}</td>
                  <td className="px-3 py-2.5 text-right font-medium" style={MONO}>{item.qty}</td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      className="w-20 text-right px-2 py-1 border border-border bg-input-background text-foreground text-[12px] outline-none focus:border-[#C2410C]"
                      style={{ ...MONO, borderRadius: "3px" }}
                      placeholder="—"
                      onChange={e => setCounted(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right" style={MONO}>
                    {variance !== null && (
                      <span className={`font-bold ${variance === 0 ? "text-[#16A34A]" : "text-[#B91C1C]"}`}>
                        {variance > 0 ? "+" : ""}{variance}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {variance !== null && (
                      <StatusBadge status={variance === 0 ? "confirmed" : "variance-detected"} small />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShowsView() {
  const cols = [
    { key: "id",       label: "Show ID",    mono: true, render: (r: Show) => <span style={MONO} className="text-muted-foreground">{r.id}</span> },
    { key: "name",     label: "Show Name",  render: (r: Show) => <span className="font-medium">{r.name}</span> },
    { key: "date",     label: "Date",       mono: true },
    { key: "location", label: "Location" },
    { key: "pyro",     label: "Pyrotechnician" },
    { key: "items",    label: "Items",      mono: true, right: true },
    { key: "new_wt",   label: "NEW (lbs)",  mono: true, right: true, render: (r: Show) => <span style={MONO}>{r.new_wt.toFixed(1)}</span> },
    { key: "status",   label: "Status",     render: (r: Show) => <StatusBadge status={r.status} small /> },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Shows"
        sub="4 shows — 2 upcoming, 1 awaiting approval, 1 completed"
        actions={<Btn variant="primary" icon={Plus} size="sm">New Show</Btn>}
      />
      <div className="flex items-center gap-3">
        <SearchBar placeholder="Search shows…" />
        <FilterBar filters={["Upcoming", "Draft", "Awaiting Approval", "Confirmed"]} />
      </div>
      <DataTable cols={cols as never} rows={SHOWS as never} />
    </div>
  );
}

function ComplianceReviewView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Compliance Review"
        sub="4 open items · last reviewed Jun 10, 2025"
        actions={<>
          <Btn variant="secondary" icon={Download} size="sm">Export Report</Btn>
        </>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Critical" value="1" alert />
        <KPICard label="High" value="2" alert />
        <KPICard label="Medium" value="1" />
        <KPICard label="Resolved (30d)" value="7" />
      </div>
      <div className="space-y-2">
        <div className="text-[12px] font-bold uppercase tracking-wide text-foreground" style={F.condensed}>
          Open Items — Requires Action
        </div>
        {COMPLIANCE_ALERTS.map(a => <AlertRow key={a.id} alert={a} />)}
      </div>
      <div className="bg-card border border-border p-4" style={{ borderRadius: "3px" }}>
        <div className="text-[12px] font-bold uppercase tracking-wide mb-3" style={F.condensed}>Regulatory Deadlines</div>
        <div className="space-y-2">
          {[
            { label: "ATF Annual Inspection — MAG-001", due: "2025-09-02", daysLeft: 83, ok: true },
            { label: "License Renewal — MAG-004", due: "2025-09-01", daysLeft: 82, ok: false },
            { label: "ATF Annual Inspection — MAG-002", due: "2025-08-29", daysLeft: 79, ok: true },
            { label: "State Fire Marshal Review", due: "2025-12-01", daysLeft: 173, ok: true },
          ].map(d => (
            <div key={d.label} className="flex items-center gap-3 text-[12px] py-1.5 border-b border-border last:border-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.ok ? "bg-[#16A34A]" : "bg-[#B91C1C]"}`} />
              <span className="flex-1">{d.label}</span>
              <span className="text-muted-foreground" style={MONO}>{d.due}</span>
              <span className={`font-bold text-[11px] ${d.daysLeft < 90 && !d.ok ? "text-[#B91C1C]" : "text-muted-foreground"}`} style={MONO}>
                {d.daysLeft}d
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditHistoryView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit History"
        sub="Immutable system log — all events recorded"
        actions={<Btn variant="secondary" icon={Download} size="sm">Export Log</Btn>}
      />
      <div className="flex items-center gap-3">
        <SearchBar placeholder="Search events, users, entities…" />
        <FilterBar filters={["System", "User", "Transfer", "Compliance"]} />
      </div>
      <div className="bg-card border border-border" style={{ borderRadius: "3px" }}>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              {["Event ID", "Timestamp", "User", "Action", "Entity", "Detail"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase" style={F.condensed}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AUDIT_LOG.map((e, i) => (
              <tr key={e.id} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-[#FAFBFD]" : ""}`}>
                <td className="px-3 py-2.5 text-muted-foreground text-[10px]" style={MONO}>{e.id}</td>
                <td className="px-3 py-2.5 text-muted-foreground text-[11px]" style={MONO}>{e.ts}</td>
                <td className="px-3 py-2.5 font-medium">{e.user}</td>
                <td className="px-3 py-2.5">{e.action}</td>
                <td className="px-3 py-2.5 text-[#1E3A8A] font-medium" style={MONO}>{e.entity}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsView() {
  const docs = [
    { id: "DOC-001", name: "ATF License — MAG-001", type: "License", entity: "MAG-001", added: "2025-01-15", status: "active" as StatusKey },
    { id: "DOC-002", name: "Transport Manifest — PO-2025-0188", type: "Manifest", entity: "PO-2025-0188", added: "2025-06-10", status: "awaiting-approval" as StatusKey },
    { id: "DOC-003", name: "Inspection Report — INS-2025-012", type: "Inspection", entity: "INS-2025-012", added: "2025-06-05", status: "confirmed" as StatusKey },
    { id: "DOC-004", name: "ATF Form 5400.27 — TXN-20250607-0028", type: "Transport", entity: "TXN-20250607-0028", added: "—", status: "missing-documentation" as StatusKey },
    { id: "DOC-005", name: "Insurance Certificate 2025", type: "Insurance", entity: "ORG", added: "2025-01-01", status: "active" as StatusKey },
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Documents"
        sub="5 documents — 1 missing"
        actions={<Btn variant="primary" icon={Plus} size="sm">Upload</Btn>}
      />
      <div className="bg-card border border-border" style={{ borderRadius: "3px" }}>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-muted border-b border-border">
              {["Doc ID", "Name", "Type", "Related To", "Date Added", "Status", ""].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase" style={F.condensed}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => (
              <tr key={d.id} className={`border-b border-border last:border-0 hover:bg-muted/50 ${i % 2 === 1 ? "bg-[#FAFBFD]" : ""}`}>
                <td className="px-3 py-2.5 text-muted-foreground" style={MONO}>{d.id}</td>
                <td className="px-3 py-2.5 font-medium">{d.name}</td>
                <td className="px-3 py-2.5"><Pill label={d.type} /></td>
                <td className="px-3 py-2.5 text-[#1E3A8A] font-medium" style={MONO}>{d.entity}</td>
                <td className="px-3 py-2.5 text-muted-foreground" style={MONO}>{d.added}</td>
                <td className="px-3 py-2.5"><StatusBadge status={d.status} small /></td>
                <td className="px-3 py-2.5 text-right">
                  <button className="text-muted-foreground hover:text-foreground"><Eye size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsView() {
  return (
    <div className="space-y-4">
      <PageHeader title="Reports" sub="Generate and download compliance and operational reports" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { title: "ATF Annual Report", desc: "Comprehensive inventory and transaction summary for ATF submission", icon: Shield, tag: "Regulatory" },
          { title: "Physical Inventory Summary", desc: "Count results, variances, and reconciliation status by magazine", icon: Box, tag: "Inventory" },
          { title: "Transaction Log Export", desc: "Full chain-of-custody record with signature data", icon: BookOpen, tag: "Compliance" },
          { title: "Show Manifest", desc: "Pre-show loadout, NET weights, and crew assignment", icon: Zap, tag: "Events" },
          { title: "Inspection History", desc: "All inspections with findings and resolution status", icon: Clipboard, tag: "Maintenance" },
          { title: "Variance Investigation", desc: "Detected variances, assigned investigators, and resolution", icon: AlertTriangle, tag: "Compliance" },
        ].map(r => (
          <div key={r.title} className="bg-card border border-border p-4 hover:border-muted-foreground/30 transition-colors cursor-pointer"
            style={{ borderRadius: "3px" }}>
            <div className="flex items-start justify-between">
              <r.icon size={18} className="text-muted-foreground" />
              <Pill label={r.tag} />
            </div>
            <div className="mt-3 text-[14px] font-semibold" style={F.condensed}>{r.title}</div>
            <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{r.desc}</div>
            <Btn variant="secondary" size="xs" icon={Download} onClick={() => {}}>Generate</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminView() {
  return (
    <div className="space-y-4">
      <PageHeader title="Administration" sub="System configuration and user management" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Users", icon: Users, count: 3, sub: "2 operators, 1 admin" },
          { label: "Licenses & Permits", icon: KeyRound, count: 4, sub: "1 expiring soon" },
          { label: "Organizations", icon: Building, count: 1, sub: "Cascade Pyro LLC" },
          { label: "Audit Settings", icon: Gauge, count: null, sub: "Configured" },
          { label: "Document Templates", icon: FileText, count: 8, sub: "Active templates" },
          { label: "System Logs", icon: Activity, count: null, sub: "Export / archive" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border p-4 cursor-pointer hover:border-muted-foreground/30 transition-colors"
            style={{ borderRadius: "3px" }}>
            <div className="flex items-center justify-between mb-2">
              <s.icon size={16} className="text-muted-foreground" />
              {s.count !== null && <span className="text-[18px] font-bold" style={MONO}>{s.count}</span>}
            </div>
            <div className="text-[13px] font-semibold" style={F.condensed}>{s.label}</div>
            <div className="text-[11px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MOBILE FIELD VIEW ────────────────────────────────────────────────────────

type FieldScreen = "home" | "scan" | "receive" | "move" | "count" | "inspect" | "confirm";

function MobileFieldView() {
  const [screen, setScreen] = useState<FieldScreen>("home");
  const [online] = useState(true);
  const [receiveStep, setReceiveStep] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const ACTIONS = [
    { id: "receive", label: "Receive", icon: Inbox, color: "#16A34A", bg: "#F0FDF4" },
    { id: "move", label: "Move", icon: Move, color: "#1E3A8A", bg: "#EFF6FF" },
    { id: "count", label: "Count", icon: Hash, color: "#78350F", bg: "#FFFBEB" },
    { id: "inspect", label: "Inspect", icon: Clipboard, color: "#5B21B6", bg: "#F5F3FF" },
    { id: "return", label: "Return", icon: RotateCcw, color: "#374151", bg: "#F3F4F6" },
    { id: "scan", label: "Scan", icon: Scan, color: "#C2410C", bg: "#FFF7ED" },
  ] as const;

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
      {/* Phone frame */}
      <div className="w-[375px] max-h-[812px] bg-[#0C0F14] rounded-[40px] overflow-hidden shadow-2xl border-[6px] border-[#1E2330] flex flex-col"
        style={{ height: "812px" }}>

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] text-white/60">
          <span style={MONO}>14:23</span>
          <div className="flex items-center gap-1">
            {online ? (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                <span>SYNC</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[#D97706]">
                <WifiOff size={9} />
                <span>OFFLINE</span>
              </div>
            )}
          </div>
        </div>

        {/* App content */}
        <div className="flex-1 bg-[#F1F3F8] overflow-hidden flex flex-col">

          {/* App header */}
          <div className="bg-[#0C0F14] px-5 pb-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-widest" style={F.condensed}>PyroLedger Field</div>
                <div className="text-[16px] font-bold text-white" style={F.condensed}>
                  {screen === "home" ? "Field Operations" :
                   screen === "scan" ? "Scan Item" :
                   screen === "receive" ? "Receive Inventory" :
                   screen === "move" ? "Move Items" :
                   screen === "count" ? "Physical Count" :
                   screen === "inspect" ? "Inspection" : "Confirm"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {screen !== "home" && (
                  <button
                    onClick={() => { setScreen("home"); setReceiveStep(0); setScanResult(null); }}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <ArrowLeft size={15} />
                  </button>
                )}
                <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <Bell size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* HOME screen */}
            {screen === "home" && (
              <div className="p-4 space-y-4">
                {/* Status card */}
                <div className="bg-card border border-border p-3" style={{ borderRadius: "4px" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${online ? "bg-[#16A34A]" : "bg-[#D97706]"}`} />
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase" style={F.condensed}>
                      {online ? "Online · Synced 14:23" : "Offline · 3 changes pending"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                    <div className="bg-muted rounded p-2">
                      <div className="text-[18px] font-bold" style={MONO}>4</div>
                      <div className="text-muted-foreground" style={F.condensed}>Pending Actions</div>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <div className="text-[18px] font-bold text-[#C2410C]" style={MONO}>1</div>
                      <div className="text-muted-foreground" style={F.condensed}>Critical Alert</div>
                    </div>
                  </div>
                </div>

                {/* Action grid */}
                <div className="grid grid-cols-3 gap-2">
                  {ACTIONS.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setScreen(a.id as FieldScreen)}
                      className="flex flex-col items-center justify-center py-5 gap-2 border border-border bg-card active:opacity-70 transition-opacity"
                      style={{ borderRadius: "6px" }}>
                      <div className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: a.bg }}>
                        <a.icon size={20} style={{ color: a.color }} />
                      </div>
                      <span className="text-[12px] font-semibold" style={{ ...F.condensed, color: "#0C0F14" }}>
                        {a.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Alert */}
                <div className="bg-[#FEF2F2] border border-[#F87171] p-3" style={{ borderRadius: "4px" }}>
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[#991B1B] mb-1">
                    <AlertTriangle size={13} /> Variance — MAG-002
                  </div>
                  <p className="text-[11px] text-[#7F1D1D]">
                    −2 units of Brocade Peony detected. Review required.
                  </p>
                  <button className="mt-2 text-[11px] font-semibold text-[#991B1B] flex items-center gap-1">
                    Review <ArrowRight size={11} />
                  </button>
                </div>

                {/* Recent actions */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2" style={F.condensed}>
                    Recent
                  </div>
                  {TRANSACTIONS.slice(0, 3).map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                      <TxnTypeBadge type={t.type} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground" style={MONO}>{t.ts.split(" ")[0]}</div>
                      </div>
                      <StatusBadge status={t.status} small />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCAN screen */}
            {screen === "scan" && (
              <div className="p-4 space-y-4">
                <div className="bg-[#0C0F14] rounded-lg overflow-hidden aspect-square flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-[#C2410C] relative">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#C2410C]" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#C2410C]" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#C2410C]" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#C2410C]" />
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#C2410C]/60" />
                    </div>
                  </div>
                  <Camera size={40} className="text-white/20" />
                </div>
                <div className="text-center text-[12px] text-muted-foreground">
                  Point camera at barcode or QR code
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center">
                    <Hash size={14} className="text-muted-foreground" />
                  </div>
                  <input
                    className="w-full pl-9 pr-3 py-3.5 border border-border bg-card text-[13px] outline-none focus:border-[#C2410C]"
                    style={{ borderRadius: "4px", ...MONO }}
                    placeholder="Or enter Item ID manually…"
                    onChange={e => setScanResult(e.target.value || null)}
                  />
                </div>
                {scanResult && (
                  <div className="bg-[#F0FDF4] border border-[#86EFAC] p-3" style={{ borderRadius: "4px" }}>
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#14532D] mb-1">
                      <CircleCheck size={13} /> Item Located
                    </div>
                    <div className="text-[11px] text-[#166534]" style={MONO}>{scanResult}</div>
                    <div className="text-[11px] text-[#166534] mt-0.5">100mm Red Star Shell · MAG-001 · Qty: 144</div>
                  </div>
                )}
                <button
                  className="w-full py-4 font-semibold text-[14px] text-white flex items-center justify-center gap-2"
                  style={{ background: "#C2410C", borderRadius: "6px", ...F.condensed }}>
                  <Scan size={18} /> Scan Item
                </button>
              </div>
            )}

            {/* RECEIVE screen */}
            {screen === "receive" && (
              <div className="p-4 space-y-3">
                {/* Steps */}
                <div className="flex items-center gap-1">
                  {["Shipment", "Items", "Confirm"].map((s, i) => (
                    <div key={s} className="flex items-center gap-1 flex-1">
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${i <= receiveStep ? "bg-[#C2410C] text-white" : "bg-muted text-muted-foreground"}`}>
                        {i < receiveStep ? <Check size={12} /> : i + 1}
                      </div>
                      <span className={`text-[10px] flex-1 ${i <= receiveStep ? "text-foreground font-medium" : "text-muted-foreground"}`}
                        style={F.condensed}>{s}</span>
                      {i < 2 && <div className="w-4 h-px bg-border" />}
                    </div>
                  ))}
                </div>

                {receiveStep === 0 && (
                  <div className="space-y-3">
                    <div className="text-[13px] font-semibold" style={F.condensed}>Shipment Details</div>
                    {[
                      { label: "PO / Reference Number", placeholder: "PO-2025-0XXX", type: "text" },
                      { label: "Supplier", placeholder: "Select supplier…", type: "text" },
                      { label: "Destination Magazine", placeholder: "Select magazine…", type: "text" },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide" style={F.condensed}>{f.label}</label>
                        <input
                          className="w-full px-3 py-3.5 border border-border bg-card text-[13px] outline-none focus:border-[#C2410C]"
                          style={{ borderRadius: "4px" }}
                          placeholder={f.placeholder}
                        />
                      </div>
                    ))}
                    <button
                      className="w-full py-4 font-semibold text-[14px] text-white"
                      onClick={() => setReceiveStep(1)}
                      style={{ background: "#C2410C", borderRadius: "6px", ...F.condensed }}>
                      Next: Add Items
                    </button>
                  </div>
                )}

                {receiveStep === 1 && (
                  <div className="space-y-3">
                    <div className="text-[13px] font-semibold" style={F.condensed}>Items Received</div>
                    {INVENTORY.slice(0, 2).map(item => (
                      <div key={item.id} className="bg-card border border-border p-3" style={{ borderRadius: "4px" }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-[12px] font-semibold">{item.name}</div>
                            <div className="text-[10px] text-muted-foreground" style={MONO}>{item.sku}</div>
                          </div>
                          <input type="number" className="w-16 text-right px-2 py-1 border border-border bg-muted text-[13px] font-bold outline-none"
                            style={{ borderRadius: "3px", ...MONO }} defaultValue={item.qty} />
                        </div>
                      </div>
                    ))}
                    <button
                      className="w-full py-3 border border-dashed border-[#C2410C] text-[#C2410C] font-semibold text-[13px] flex items-center justify-center gap-2"
                      style={{ borderRadius: "4px", ...F.condensed }}>
                      <Plus size={15} /> Add Item
                    </button>
                    <button
                      className="w-full py-4 font-semibold text-[14px] text-white"
                      onClick={() => setReceiveStep(2)}
                      style={{ background: "#C2410C", borderRadius: "6px", ...F.condensed }}>
                      Next: Confirm
                    </button>
                  </div>
                )}

                {receiveStep === 2 && (
                  <div className="space-y-3">
                    <div className="bg-[#FFFBEB] border border-[#FCD34D] p-3" style={{ borderRadius: "4px" }}>
                      <div className="text-[12px] font-bold text-[#78350F]" style={F.condensed}>
                        Review Before Submitting
                      </div>
                      <p className="text-[11px] text-[#92400E] mt-1">
                        This action is irreversible. Items will be logged to the chain-of-custody record.
                      </p>
                    </div>
                    <div className="bg-card border border-border p-3 space-y-2 text-[12px]" style={{ borderRadius: "4px" }}>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PO Reference</span>
                        <span className="font-medium" style={MONO}>PO-2025-0188</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Destination</span>
                        <span className="font-medium">MAG-001</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Items</span>
                        <span className="font-medium" style={MONO}>2 lines</span>
                      </div>
                    </div>
                    <button
                      className="w-full py-4 font-bold text-[15px] text-white flex items-center justify-center gap-2"
                      onClick={() => setShowConfirm(true)}
                      style={{ background: "#C2410C", borderRadius: "6px", ...F.condensed }}>
                      <Check size={18} /> Submit Receive
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* COUNT screen */}
            {screen === "count" && (
              <div className="p-4 space-y-3">
                <div className="bg-card border border-border p-3" style={{ borderRadius: "4px" }}>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1" style={F.condensed}>Counting Magazine</div>
                  <div className="text-[16px] font-bold" style={F.condensed}>MAG-001 — Primary Storage</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">7 items · {new Date().toLocaleDateString()}</div>
                </div>
                {INVENTORY.filter(i => i.mag === "MAG-001").map(item => (
                  <div key={item.id} className="bg-card border border-border p-3" style={{ borderRadius: "4px" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold truncate">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground" style={MONO}>{item.id} · Expected: {item.qty}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[18px] font-bold text-muted-foreground">−</button>
                        <input type="number" defaultValue={item.qty}
                          className="w-14 text-center text-[16px] font-bold border border-border outline-none py-1.5"
                          style={{ ...MONO, borderRadius: "4px" }} />
                        <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[18px] font-bold text-muted-foreground">+</button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  className="w-full py-4 font-bold text-[14px] text-white"
                  onClick={() => setShowConfirm(true)}
                  style={{ background: "#0C0F14", borderRadius: "6px", ...F.condensed }}>
                  Submit Count
                </button>
              </div>
            )}

            {/* MOVE screen */}
            {screen === "move" && (
              <div className="p-4 space-y-3">
                <div className="text-[13px] font-semibold" style={F.condensed}>Transfer Items</div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide" style={F.condensed}>From Magazine</label>
                  <select className="w-full px-3 py-3.5 border border-border bg-card text-[13px] outline-none"
                    style={{ borderRadius: "4px" }}>
                    {MAGAZINES.map(m => <option key={m.id}>{m.id} — {m.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <ArrowRight size={15} className="text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide" style={F.condensed}>To Magazine</label>
                  <select className="w-full px-3 py-3.5 border border-border bg-card text-[13px] outline-none"
                    style={{ borderRadius: "4px" }}>
                    {MAGAZINES.map(m => <option key={m.id}>{m.id} — {m.name}</option>)}
                  </select>
                </div>
                {INVENTORY.slice(0, 3).map(item => (
                  <div key={item.id} className="bg-card border border-border p-3 flex items-center gap-3" style={{ borderRadius: "4px" }}>
                    <input type="checkbox" className="w-5 h-5" style={{ accentColor: "#C2410C" }} />
                    <div className="flex-1">
                      <div className="text-[12px] font-medium">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground" style={MONO}>Qty: {item.qty}</div>
                    </div>
                    <input type="number" placeholder="Qty" className="w-16 text-center px-2 py-1.5 border border-border text-[12px] outline-none"
                      style={{ ...MONO, borderRadius: "3px" }} />
                  </div>
                ))}
                <button
                  className="w-full py-4 font-bold text-[14px] text-white"
                  onClick={() => setShowConfirm(true)}
                  style={{ background: "#C2410C", borderRadius: "6px", ...F.condensed }}>
                  Submit Transfer
                </button>
              </div>
            )}

            {/* INSPECT screen */}
            {screen === "inspect" && (
              <div className="p-4 space-y-3">
                <div className="text-[13px] font-semibold" style={F.condensed}>Magazine Inspection</div>
                <div className="bg-card border border-border p-3" style={{ borderRadius: "4px" }}>
                  <div className="text-[11px] text-muted-foreground" style={F.condensed}>MAGAZINE</div>
                  <div className="text-[15px] font-bold mt-0.5" style={F.condensed}>MAG-001 — Primary Storage</div>
                </div>
                <div className="space-y-1">
                  {INSPECTION_ITEMS.map(c => (
                    <div key={c.id} className="flex items-center gap-3 bg-card border border-border px-3 py-4" style={{ borderRadius: "4px" }}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${c.status === "pass" ? "bg-[#F0FDF4] border border-[#86EFAC]" : c.status === "fail" ? "bg-[#FEF2F2] border border-[#F87171]" : "bg-[#FFFBEB] border border-[#FCD34D]"}`}>
                        {c.status === "pass" && <Check size={12} className="text-[#16A34A]" />}
                        {c.status === "fail" && <X size={12} className="text-[#B91C1C]" />}
                        {c.status === "review" && <AlertTriangle size={10} className="text-[#D97706]" />}
                      </div>
                      <span className="text-[13px] flex-1 leading-snug">{c.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  className="w-full py-4 font-bold text-[14px] text-white"
                  onClick={() => setShowConfirm(true)}
                  style={{ background: "#0C0F14", borderRadius: "6px", ...F.condensed }}>
                  Submit Inspection
                </button>
              </div>
            )}
          </div>

          {/* Mobile bottom nav */}
          <div className="bg-card border-t border-border grid grid-cols-4">
            {[
              { id: "home", icon: Activity, label: "Home" },
              { id: "scan", icon: Scan, label: "Scan" },
              { id: "receive", icon: Inbox, label: "Receive" },
              { id: "inspect", icon: Clipboard, label: "Inspect" },
            ].map(n => (
              <button key={n.id} onClick={() => setScreen(n.id as FieldScreen)}
                className={`flex flex-col items-center justify-center py-3 gap-1 ${screen === n.id ? "text-[#C2410C]" : "text-muted-foreground"}`}>
                <n.icon size={18} />
                <span className="text-[9px] font-semibold uppercase" style={F.condensed}>{n.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-t-2xl p-5 shadow-2xl">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} className="text-[#C2410C]" />
              <span className="text-[15px] font-bold" style={F.condensed}>Confirm Submission</span>
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">
              This action will be recorded in the chain-of-custody log and cannot be undone. Continue?
            </p>
            <button
              onClick={() => { setShowConfirm(false); setScreen("home"); setReceiveStep(0); }}
              className="w-full py-4 font-bold text-[14px] text-white mb-2"
              style={{ background: "#C2410C", borderRadius: "6px", ...F.condensed }}>
              Confirm & Submit
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full py-3 text-[13px] font-medium text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DESIGN SYSTEM REFERENCE ─────────────────────────────────────────────────

function DesignSystemView() {
  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader title="Design System Reference" sub="PyroLedger — Component tokens and patterns" />

      {/* Status badges */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Status Language</div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(STATUS).map(k => <StatusBadge key={k} status={k as StatusKey} />)}
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Typography</div>
        <div className="bg-card border border-border p-5 space-y-4" style={{ borderRadius: "3px" }}>
          <div style={F.condensed} className="text-[32px] font-bold">Barlow Semi Condensed — Headings, Labels, Navigation</div>
          <div className="text-[16px] font-medium">Figtree — Body text, descriptions, supporting content. Highly legible at operational densities.</div>
          <div className="text-[13px] text-muted-foreground">Figtree Regular — Secondary information, captions, metadata, timestamps</div>
          <div style={MONO} className="text-[13px] text-[#5B21B6]">JetBrains Mono — IDs, quantities, weights, codes, serial numbers: ITM-0088 · 1247 lbs NEW · 14:23:07</div>
          <div className="flex flex-wrap gap-3 text-[11px]">
            <Pill label="1.3G Display" />
            <Pill label="ATF Form 5400.27" />
            <Pill label="LOT-2025-041" color="#1E3A8A" bg="#EFF6FF" />
          </div>
        </div>
      </section>

      {/* Color system */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Color System</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: "Background", hex: "#F1F3F8" },
            { name: "Card", hex: "#FFFFFF" },
            { name: "Primary", hex: "#0C0F14" },
            { name: "Accent", hex: "#C2410C" },
            { name: "Muted", hex: "#E8EBF3" },
            { name: "Muted FG", hex: "#5C6278" },
            { name: "Destructive", hex: "#B91C1C" },
            { name: "Sidebar", hex: "#0C0F14" },
          ].map(c => (
            <div key={c.name} className="space-y-1.5">
              <div className="h-10 border border-border" style={{ background: c.hex, borderRadius: "3px" }} />
              <div className="text-[11px] font-medium">{c.name}</div>
              <div className="text-[10px] text-muted-foreground" style={MONO}>{c.hex}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Spacing Scale</div>
        <div className="flex items-end gap-4 flex-wrap">
          {[2, 4, 8, 12, 16, 20, 24, 32, 40, 48].map(s => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className="bg-accent" style={{ width: s, height: s, borderRadius: "2px" }} />
              <span className="text-[9px] text-muted-foreground" style={MONO}>{s}px</span>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Buttons</div>
        <div className="flex flex-wrap gap-2 items-center">
          <Btn variant="primary" size="md">Primary Action</Btn>
          <Btn variant="secondary" size="md">Secondary</Btn>
          <Btn variant="ghost" size="md">Ghost</Btn>
          <Btn variant="destructive" size="md">Destructive</Btn>
          <Btn variant="primary" size="sm" icon={Plus}>Add Item</Btn>
          <Btn variant="secondary" size="xs" icon={Download}>Export</Btn>
          <Btn variant="primary" size="md" disabled>Disabled</Btn>
        </div>
      </section>

      {/* Alert rows */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Compliance Alerts</div>
        <div className="space-y-2">
          {COMPLIANCE_ALERTS.map(a => <AlertRow key={a.id} alert={a} />)}
        </div>
      </section>

      {/* Magazine cards */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Magazine Cards</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MAGAZINES.slice(0, 2).map(m => <MagazineCard key={m.id} mag={m} onClick={() => {}} />)}
        </div>
      </section>

      {/* Transaction timeline */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>Transaction Timeline</div>
        <TransactionTimeline txns={TRANSACTIONS.slice(0, 4)} />
      </section>

      {/* States */}
      <section className="space-y-3">
        <div className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase" style={F.condensed}>System States</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Loading */}
          <div className="bg-card border border-border p-6 flex flex-col items-center justify-center gap-3" style={{ borderRadius: "3px" }}>
            <RefreshCw size={24} className="text-muted-foreground animate-spin" style={{ animationDuration: "1.5s" }} />
            <div className="text-[12px] font-medium text-muted-foreground" style={F.condensed}>Loading…</div>
          </div>
          {/* Offline */}
          <div className="bg-muted border border-border p-6 flex flex-col items-center justify-center gap-3" style={{ borderRadius: "3px" }}>
            <WifiOff size={24} className="text-muted-foreground" />
            <div className="text-[12px] font-medium text-muted-foreground" style={F.condensed}>Offline</div>
            <div className="text-[11px] text-center text-muted-foreground">3 changes pending sync</div>
          </div>
          {/* Error */}
          <div className="bg-[#FEF2F2] border border-[#F87171] p-6 flex flex-col items-center justify-center gap-3" style={{ borderRadius: "3px" }}>
            <CircleX size={24} className="text-[#B91C1C]" />
            <div className="text-[12px] font-semibold text-[#991B1B]" style={F.condensed}>Sync Error</div>
            <div className="text-[11px] text-center text-[#7F1D1D]">Unable to reach server. Check connection.</div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

function Sidebar({ active, onNav, collapsed, onToggle }: {
  active: ViewId;
  onNav: (v: ViewId) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className="flex flex-col border-r border-[rgba(255,255,255,0.07)] transition-all duration-200"
      style={{ background: "#0C0F14", width: collapsed ? 56 : 220, flexShrink: 0 }}>

      {/* Logo */}
      <div className="flex items-center px-3 py-4 border-b border-[rgba(255,255,255,0.07)]" style={{ minHeight: 56 }}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center"
            style={{ background: "#C2410C", borderRadius: "3px" }}>
            <Zap size={14} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-[14px] font-bold text-white whitespace-nowrap" style={F.condensed}>PyroLedger</div>
              <div className="text-[9px] text-white/30 tracking-widest whitespace-nowrap" style={F.condensed}>PYROTECHNICS ERP</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onToggle} className="ml-auto text-white/30 hover:text-white/70 flex-shrink-0">
            <ChevronLeft size={14} />
          </button>
        )}
        {collapsed && (
          <button onClick={onToggle} className="absolute left-0 right-0 inset-y-0 opacity-0 w-full" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(group => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <SectionHeader>
                <span style={{ color: "rgba(255,255,255,0.25)" }}>{group.label}</span>
              </SectionHeader>
            )}
            {group.items.map(item => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id as ViewId)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-colors relative ${isActive
                    ? "bg-white/10 text-white"
                    : "text-[rgba(188,196,212,0.7)] hover:text-white hover:bg-white/5"}`}
                  style={F.condensed}>
                  {isActive && (
                    <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r" style={{ background: "#C2410C" }} />
                  )}
                  <item.icon size={14} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                      {item.count != null && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: item.alert ? "#C2410C" : "rgba(255,255,255,0.1)",
                            color: item.alert ? "#fff" : "rgba(255,255,255,0.5)",
                          }}>
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.count != null && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                      style={{ background: item.alert ? "#C2410C" : "rgba(255,255,255,0.3)" }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
          style={{ background: "#C2410C" }}>JV</div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-[11px] font-semibold text-white whitespace-nowrap">J. Vasquez</div>
            <div className="text-[9px] text-white/30 whitespace-nowrap" style={F.condensed}>SENIOR OPERATOR</div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────

function TopBar({ onMobile }: { onMobile: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 border-b border-border bg-card"
      style={{ minHeight: 48, flexShrink: 0 }}>
      <div className="flex-1">
        <SearchBar placeholder="Search inventory, magazines, transactions… (⌘K)" compact />
      </div>
      <SyncStatus />
      <button className="relative text-muted-foreground hover:text-foreground p-1.5">
        <Bell size={15} />
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#C2410C]" />
      </button>
      <button
        onClick={onMobile}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        style={{ borderRadius: "3px", ...F.condensed }}>
        <Smartphone size={12} /> Field View
      </button>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = useCallback((v: ViewId) => {
    if (v === "mobile") {
      setMobileOpen(true);
    } else {
      setView(v);
    }
  }, []);

  const renderView = () => {
    switch (view) {
      case "dashboard":   return <DashboardView onNav={handleNav} />;
      case "inventory":   return <InventoryView />;
      case "products":    return (
        <div className="space-y-4">
          <PageHeader title="Products" sub="Product catalog — 9 active SKUs" actions={<Btn variant="primary" icon={Plus} size="sm">Add Product</Btn>} />
          <DataTable
            cols={[
              { key: "sku", label: "SKU", mono: true, render: (r: InventoryItem) => <span style={MONO}>{r.sku}</span> },
              { key: "name", label: "Description" },
              { key: "cat", label: "Category", render: (r: InventoryItem) => <Pill label={r.cat} /> },
              { key: "new_wt", label: "NEW/Unit (lbs)", mono: true, right: true, render: (r: InventoryItem) => <span style={MONO}>{r.new_wt.toFixed(1)}</span> },
            ] as never}
            rows={INVENTORY as never}
          />
        </div>
      );
      case "lots":        return (
        <div className="space-y-4">
          <PageHeader title="Inventory Lots" sub="Lot tracking for chain-of-custody" />
          <DataTable
            cols={[
              { key: "lot", label: "Lot Number", mono: true },
              { key: "name", label: "Product" },
              { key: "qty", label: "Qty", mono: true, right: true },
              { key: "mag", label: "Magazine", mono: true },
              { key: "status", label: "Status", render: (r: InventoryItem) => <StatusBadge status={r.status} small /> },
            ] as never}
            rows={INVENTORY as never}
          />
        </div>
      );
      case "magazines":   return <MagazinesView onDetail={() => setView("magazine-detail")} />;
      case "magazine-detail": return <MagazineDetailView onBack={() => setView("magazines")} />;
      case "ledger":      return <TransactionLedgerView />;
      case "inspections": return <InspectionsView />;
      case "physical":    return <PhysicalInventoryView />;
      case "variance":    return (
        <div className="space-y-4">
          <PageHeader title="Variance Investigation" sub="1 open variance — MAG-002 · ITM-0088" />
          <AlertRow alert={COMPLIANCE_ALERTS[0]} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-[12px] font-bold uppercase tracking-wide" style={F.condensed}>Investigation Record</div>
              <div className="bg-card border border-border p-4 space-y-3" style={{ borderRadius: "3px" }}>
                {[
                  { label: "Item", value: "ITM-0088 — 5\" Brocade Peony Shell" },
                  { label: "Magazine", value: "MAG-002 — Day-of Show" },
                  { label: "System Qty", value: "24" },
                  { label: "Physical Count", value: "22" },
                  { label: "Variance", value: "−2 units" },
                  { label: "Detected", value: "2025-06-08 11:13" },
                  { label: "Assigned To", value: "J. Vasquez" },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-[12px] border-b border-border pb-2 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium" style={MONO}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[12px] font-bold uppercase tracking-wide" style={F.condensed}>Resolution Notes</div>
              <textarea
                className="w-full h-40 px-3 py-2.5 border border-border bg-card text-[12px] outline-none focus:border-[#C2410C] resize-none"
                style={{ borderRadius: "3px" }}
                placeholder="Document investigation findings and resolution…"
              />
              <div className="flex gap-2">
                <Btn variant="secondary" size="sm">Save Draft</Btn>
                <Btn variant="primary" size="sm">Submit Resolution</Btn>
              </div>
            </div>
          </div>
          <TransactionTimeline txns={TRANSACTIONS.filter(t => t.item === "ITM-0088")} />
        </div>
      );
      case "compliance":  return <ComplianceReviewView />;
      case "shows":       return <ShowsView />;
      case "packages":    return (
        <div className="space-y-4">
          <PageHeader title="Show Packages" sub="Pre-configured product groups for event loadout" actions={<Btn variant="primary" icon={Plus} size="sm">New Package</Btn>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {["Opener Package — 3min", "Mid-Show Salute Sequence", "Grand Finale — 90s", "Color Break Series"].map((p, i) => (
              <div key={p} className="bg-card border border-border p-4" style={{ borderRadius: "3px" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[13px] font-semibold" style={F.condensed}>{p}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{(i + 1) * 18} items · {((i + 1) * 22.4).toFixed(1)} lbs NEW</div>
                  </div>
                  <StatusBadge status={i === 1 ? "draft" : "confirmed"} small />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case "loadout":     return (
        <div className="space-y-4">
          <PageHeader title="Loadout" sub="SHW-2025-019 — Riverside Independence Day · Jul 4, 2025" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Total Items" value="287" />
            <KPICard label="NET Weight (lbs)" value="341.2" />
            <KPICard label="Source Magazine" value="MAG-001" />
            <KPICard label="Status" value="Pending" alert />
          </div>
          <DataTable
            cols={[
              { key: "sku", label: "SKU", mono: true },
              { key: "name", label: "Description" },
              { key: "qty", label: "Qty", mono: true, right: true },
              { key: "new_wt", label: "NEW (lbs)", mono: true, right: true, render: (r: InventoryItem) => <span style={MONO}>{r.new_wt.toFixed(1)}</span> },
              { key: "status", label: "Status", render: (r: InventoryItem) => <StatusBadge status={r.status} small /> },
            ] as never}
            rows={INVENTORY.slice(0, 6) as never}
          />
        </div>
      );
      case "shipments":   return (
        <div className="space-y-4">
          <PageHeader title="Shipments" sub="Inbound and outbound shipment tracking" actions={<Btn variant="primary" icon={Plus} size="sm">New Shipment</Btn>} />
          <DataTable
            cols={[
              { key: "id", label: "Ref", mono: true, render: (r: Transaction) => <span style={MONO} className="text-muted-foreground">{r.ref}</span> },
              { key: "type", label: "Direction", render: (r: Transaction) => <TxnTypeBadge type={r.type} /> },
              { key: "from", label: "From" },
              { key: "to", label: "To" },
              { key: "user", label: "Handler" },
              { key: "ts", label: "Date", mono: true },
              { key: "status", label: "Status", render: (r: Transaction) => <StatusBadge status={r.status} small /> },
            ] as never}
            rows={TRANSACTIONS as never}
          />
        </div>
      );
      case "documents":   return <DocumentsView />;
      case "reports":     return <ReportsView />;
      case "audit":       return <AuditHistoryView />;
      case "admin":       return <AdminView />;
      default:            return <DesignSystemView />;
    }
  };

  if (mobileOpen) {
    return (
      <div className="relative">
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-[12px] font-medium shadow-sm hover:bg-muted transition-colors"
          style={{ borderRadius: "3px", ...F.condensed }}>
          <Monitor size={13} /> Desktop View
        </button>
        <MobileFieldView />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active={view} onNav={handleNav} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMobile={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 scrollable">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

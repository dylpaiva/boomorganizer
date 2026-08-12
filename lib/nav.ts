import {
  LayoutDashboard,
  Boxes,
  Package,
  Layers,
  Warehouse,
  ScrollText,
  PackagePlus,
  ArrowLeftRight,
  ClipboardCheck,
  GitCompareArrows,
  ShieldCheck,
  CalendarCheck,
  Sparkles,
  Truck,
  FileCheck2,
  FolderArchive,
  BarChart3,
  History,
  Settings2,
  PackageCheck,
  Undo2,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Inventory', href: '/inventory', icon: Boxes },
      { label: 'Product Master', href: '/products', icon: Package },
      { label: 'Inventory Lots', href: '/lots', icon: Layers },
      { label: 'Transaction Ledger', href: '/ledger', icon: ScrollText },
    ],
  },
  {
    label: 'Storage & Operations',
    items: [
      { label: 'Magazines', href: '/magazines', icon: Warehouse },
      { label: 'Receive Inventory', href: '/receive', icon: PackagePlus },
      { label: 'Transfer Inventory', href: '/transfer', icon: ArrowLeftRight },
      { label: 'Physical Count', href: '/count', icon: ClipboardCheck },
      { label: 'Variance Investigation', href: '/variance', icon: GitCompareArrows },
      { label: 'Magazine Inspection', href: '/inspection', icon: ShieldCheck },
      { label: 'Daily Close', href: '/daily-close', icon: CalendarCheck },
    ],
  },
  {
    label: 'Shows & Logistics',
    items: [
      { label: 'Shows', href: '/shows', icon: Sparkles },
      { label: 'Loadout', href: '/loadout', icon: PackageCheck },
      { label: 'Return / Reconciliation', href: '/returns', icon: Undo2 },
      { label: 'Shipments', href: '/shipments', icon: Truck },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Compliance Review', href: '/compliance', icon: FileCheck2 },
      { label: 'Documents', href: '/documents', icon: FolderArchive },
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Audit History', href: '/audit', icon: History },
      { label: 'Administration', href: '/admin', icon: Settings2 },
    ],
  },
]

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items)

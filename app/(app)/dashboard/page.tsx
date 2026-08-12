import Link from 'next/link'
import {
  Gauge,
  Warehouse,
  FileCheck2,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'
import { api } from '@/lib/services'
import { formatNew, formatDateTime, formatNumber, titleize } from '@/lib/format'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SectionCard } from '@/components/shared/section-card'
import { FlagBadge, FlagBadgeList } from '@/components/shared/flag-badge'
import { DomainStatus, SyncPill } from '@/components/shared/status-pill'
import { NewTrendChart } from '@/components/dashboard/new-trend-chart'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { ShieldAlert } from 'lucide-react'

export default async function DashboardPage() {
  const [stats, trend, magazines, ledger, compliance, variances] = await Promise.all([
    api.getDashboardStats(),
    api.getNewTrend(),
    api.listMagazines(),
    api.listLedger(),
    api.listComplianceItems(),
    api.listVarianceCases(),
  ])

  const recentLedger = ledger.slice(0, 6)

  // Build an action queue from items that request human attention.
  const actions = [
    ...compliance
      .filter((c) => c.status === 'open' || c.status === 'in-review')
      .map((c) => ({
        id: c.id,
        flag: c.flag,
        title: c.subject,
        meta: c.relatedTo,
        href: '/compliance',
      })),
    ...variances
      .filter((v) => v.status !== 'resolved')
      .map((v) => ({
        id: v.id,
        flag: 'variance-detected' as const,
        title: `${v.productName} — variance ${v.variance}`,
        meta: `${v.magazineName} · ${v.lotNumber}`,
        href: '/variance',
      })),
  ].slice(0, 6)

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Current state of inventory, storage, and items requiring human review. This prototype uses fictional sample data and does not certify regulatory compliance."
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href="/reports" />}>
              Reports
            </Button>
            <Button size="sm" render={<Link href="/receive" />}>
              Receive Inventory
            </Button>
          </>
        }
      />

      {/* Compliance disclaimer */}
      <Alert>
        <ShieldAlert />
        <AlertTitle>Human review required for compliance decisions</AlertTitle>
        <AlertDescription>
          PyroLedger surfaces operational signals and pending actions. It does not legally
          certify compliance — flagged items must be dispositioned by an authorized person.
        </AlertDescription>
      </Alert>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total NEW On-Hand"
          value={formatNew(stats.totalNewG)}
          sublabel="Across all magazines"
          icon={Gauge}
        />
        <StatCard
          label="Magazines Operational"
          value={`${stats.magazinesOperational}/${stats.magazinesTotal}`}
          sublabel={`${stats.inspectionsDue} inspection due`}
          icon={Warehouse}
          tone={stats.inspectionsDue > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Open Compliance Items"
          value={stats.openComplianceItems}
          sublabel={`${stats.variancesOpen} variances open`}
          icon={FileCheck2}
          tone="danger"
        />
        <StatCard
          label="Pending Sync"
          value={stats.pendingSync}
          sublabel="Mobile entries awaiting upload"
          icon={RefreshCw}
          tone={stats.pendingSync > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend */}
        <SectionCard
          title="Net Explosive Weight — 7 Day Trend"
          description="Aggregate on-hand NEW across all storage."
          className="lg:col-span-2"
        >
          <NewTrendChart data={trend} />
        </SectionCard>

        {/* Action queue */}
        <SectionCard
          title="Requires Action"
          description="Items awaiting human review or disposition."
          action={
            <Button variant="ghost" size="xs" render={<Link href="/compliance" />}>
              View all
              <ChevronRight data-icon="inline-end" />
            </Button>
          }
          noPadding
        >
          <ul className="divide-y divide-border">
            {actions.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {a.meta}
                    </p>
                    <div className="mt-1.5">
                      <FlagBadge flag={a.flag} />
                    </div>
                  </div>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <SectionCard
          title="Recent Ledger Activity"
          description="Latest inventory movements."
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="xs" render={<Link href="/ledger" />}>
              Full ledger
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          }
          noPadding
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLedger.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(e.timestamp)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{titleize(e.type)}</span>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <span className="block truncate text-sm">{e.productName}</span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {e.lotNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    <span className={e.quantity < 0 ? 'text-destructive' : 'text-success'}>
                      {e.quantity > 0 ? '+' : ''}
                      {formatNumber(e.quantity)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <SyncPill state={e.sync} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        {/* Magazine status */}
        <SectionCard
          title="Magazine Status"
          description="Capacity and review flags."
          action={
            <Button variant="ghost" size="xs" render={<Link href="/magazines" />}>
              Manage
              <ChevronRight data-icon="inline-end" />
            </Button>
          }
          noPadding
        >
          <ul className="divide-y divide-border">
            {magazines.map((m) => {
              const pct = Math.round((m.currentNewG / m.capacityNewG) * 100)
              return (
                <li key={m.id}>
                  <Link
                    href={`/magazines/${m.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium">{m.code}</span>
                      <DomainStatus status={m.status} />
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatNew(m.currentNewG)} / {formatNew(m.capacityNewG)}
                      </span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    {m.flags.length > 0 && <FlagBadgeList flags={m.flags} />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      </div>
    </>
  )
}

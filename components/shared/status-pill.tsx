import { cn } from '@/lib/utils'
import { titleize, syncLabels } from '@/lib/format'
import type { SyncState } from '@/lib/types'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const toneClasses: Record<Tone, string> = {
  neutral: 'border-border bg-secondary text-secondary-foreground',
  success: 'border-success/40 bg-success/15 text-success',
  warning: 'border-warning/40 bg-warning/20 text-warning-foreground',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-info/40 bg-info/10 text-info',
  muted: 'border-border bg-muted text-muted-foreground',
}

/** Generic status pill. Pass an explicit tone or let the label drive a default. */
export function StatusPill({
  label,
  tone = 'neutral',
  className,
  dot = true,
}: {
  label: string
  tone?: Tone
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit items-center gap-1.5 rounded-md border px-2 text-xs font-medium whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />}
      {label}
    </span>
  )
}

// ---- Domain status → tone maps -------------------------------------------

const statusToneMap: Record<string, Tone> = {
  // magazine
  operational: 'success',
  'inspection-due': 'warning',
  closed: 'muted',
  maintenance: 'info',
  // count / variance
  draft: 'muted',
  'in-progress': 'info',
  'pending-review': 'warning',
  reconciled: 'success',
  open: 'warning',
  investigating: 'info',
  resolved: 'success',
  // daily close
  balanced: 'success',
  'variance-detected': 'danger',
  pending: 'warning',
  // shows
  planned: 'muted',
  packaging: 'info',
  loaded: 'info',
  'in-field': 'warning',
  returned: 'info',
  // shipments
  expected: 'muted',
  'in-transit': 'info',
  received: 'success',
  dispatched: 'info',
  exception: 'danger',
  // compliance
  'in-review': 'info',
  cleared: 'success',
  escalated: 'danger',
  // documents
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  missing: 'danger',
  // inspection result
  pass: 'success',
  attention: 'warning',
  fail: 'danger',
  // generic
  active: 'success',
  inactive: 'muted',
}

export function DomainStatus({ status, className }: { status: string; className?: string }) {
  const tone = statusToneMap[status] ?? 'neutral'
  return <StatusPill label={titleize(status)} tone={tone} className={className} />
}

const syncToneMap: Record<SyncState, Tone> = {
  synced: 'success',
  pending: 'warning',
  offline: 'muted',
  error: 'danger',
}

export function SyncPill({ state, className }: { state: SyncState; className?: string }) {
  return <StatusPill label={syncLabels[state]} tone={syncToneMap[state]} className={className} />
}

/**
 * UN hazard division label. Rendered as a neutral technical chip — the UI does
 * NOT validate or enforce hazard classifications, it only displays them.
 */
export function HazardBadge({ division, className }: { division: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-fit items-center rounded-md border border-border bg-secondary px-1.5 font-mono text-xs font-medium tabular-nums text-secondary-foreground',
        className,
      )}
    >
      {division}
    </span>
  )
}

import {
  AlertTriangle,
  FileWarning,
  GitCompareArrows,
  ScanEye,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { flagLabels } from '@/lib/format'
import type { ReviewFlag } from '@/lib/types'

const flagConfig: Record<
  ReviewFlag,
  { icon: LucideIcon; tone: 'warning' | 'danger' | 'info' }
> = {
  'review-required': { icon: ScanEye, tone: 'info' },
  'potential-conflict': { icon: AlertTriangle, tone: 'warning' },
  'missing-documentation': { icon: FileWarning, tone: 'warning' },
  'variance-detected': { icon: GitCompareArrows, tone: 'danger' },
  'human-review-required': { icon: UserCheck, tone: 'danger' },
}

const toneClasses = {
  warning: 'border-warning/40 bg-warning/15 text-warning-foreground',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
  info: 'border-info/40 bg-info/10 text-info',
} as const

export function FlagBadge({ flag, className }: { flag: ReviewFlag; className?: string }) {
  const { icon: Icon, tone } = flagConfig[flag]
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {flagLabels[flag]}
    </span>
  )
}

export function FlagBadgeList({
  flags,
  className,
  max,
}: {
  flags: ReviewFlag[]
  className?: string
  max?: number
}) {
  if (!flags.length) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const shown = max ? flags.slice(0, max) : flags
  const remaining = max ? flags.length - shown.length : 0
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {shown.map((f) => (
        <FlagBadge key={f} flag={f} />
      ))}
      {remaining > 0 && (
        <span className="text-[11px] text-muted-foreground">+{remaining}</span>
      )}
    </div>
  )
}

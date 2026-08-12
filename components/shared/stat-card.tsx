import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type Tone = 'default' | 'warning' | 'danger' | 'info' | 'success'

const iconTone: Record<Tone, string> = {
  default: 'bg-secondary text-secondary-foreground',
  warning: 'bg-warning/20 text-warning-foreground',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  success: 'bg-success/15 text-success',
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = 'default',
  className,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon?: LucideIcon
  tone?: Tone
  className?: string
}) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </span>
          {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        </div>
        {Icon && (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md',
              iconTone[tone],
            )}
          >
            <Icon className="size-4.5" aria-hidden />
          </span>
        )}
      </CardContent>
    </Card>
  )
}

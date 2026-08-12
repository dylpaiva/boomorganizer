'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const chartConfig = {
  new: {
    label: 'Net Explosive Weight',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function NewTrendChart({ data }: { data: { day: string; new: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillNew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-new)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-new)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}t`}
          className="text-xs"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${(Number(value) / 1_000_000).toFixed(3)} t NEW`}
            />
          }
        />
        <Area
          dataKey="new"
          type="monotone"
          fill="url(#fillNew)"
          stroke="var(--color-new)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import type { InventorySummaryRow } from "@/lib/types"
import { Toolbar, SearchField, ToolbarSpacer } from "@/components/shared/toolbar"
import { FlagBadgeList } from "@/components/shared/flag-badge"
import { HazardBadge } from "@/components/shared/status-pill"
import { formatQty, formatNew, categoryLabel } from "@/lib/format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

const CATEGORIES = ["all", "display-shell", "cake", "lift-charge", "igniter", "accessory", "binary"] as const

export function InventoryTable({ rows }: { rows: InventorySummaryRow[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false
      if (!q) return true
      return (
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.hazardDivision.toLowerCase().includes(q)
      )
    })
  }, [rows, query, category])

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Toolbar>
        <SearchField value={query} onChange={setQuery} placeholder="Search products, SKU, hazard…" />
        <ToolbarSpacer />
        <ToggleGroup
          value={[category]}
          onValueChange={(v) => setCategory((v[0] as string) ?? "all")}
          className="hidden md:flex"
        >
          {CATEGORIES.map((c) => (
            <ToggleGroupItem key={c} value={c} className="text-xs">
              {c === "all" ? "All" : categoryLabel(c)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Toolbar>

      {filtered.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyTitle>No products match</EmptyTitle>
            <EmptyDescription>Adjust the search or category filter.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Hazard</TableHead>
              <TableHead className="text-right">On-hand</TableHead>
              <TableHead className="text-right">Lots</TableHead>
              <TableHead className="text-right">Magazines</TableHead>
              <TableHead className="text-right">NEW</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="w-8" aria-label="Open" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.productId} className="group">
                <TableCell>
                  <Link
                    href={`/product-master/${r.productId}`}
                    className="flex flex-col gap-0.5 outline-none"
                  >
                    <span className="font-medium text-foreground group-hover:text-primary">
                      {r.productName}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <HazardBadge division={r.hazardDivision} />
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatQty(r.totalQuantity, r.unitOfMeasure)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {r.lotCount}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {r.magazineCount}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatNew(r.totalNewG)}
                </TableCell>
                <TableCell>
                  <FlagBadgeList flags={r.flags} max={2} />
                </TableCell>
                <TableCell>
                  <Link href={`/product-master/${r.productId}`} aria-label={`Open ${r.productName}`}>
                    <ChevronRightIcon className="size-4 text-muted-foreground group-hover:text-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

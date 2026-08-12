import type { ReviewFlag, SyncState } from './types'

/** Format net explosive weight (grams) into a compact, readable label. */
export function formatNew(grams: number): string {
  if (grams >= 1_000_000) return `${(grams / 1_000_000).toFixed(2)} t`
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`
  return `${grams} g`
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

const uomLabels: Record<string, string> = {
  each: 'ea',
  case: 'cs',
  lb: 'lb',
  kg: 'kg',
  ft: 'ft',
}

/** Format a quantity with its unit of measure, e.g. "1,240 ea". */
export function formatQty(qty: number, uom: string): string {
  return `${formatNumber(qty)} ${uomLabels[uom] ?? uom}`
}

const categoryLabels: Record<string, string> = {
  'display-shell': 'Display Shell',
  cake: 'Cake',
  'lift-charge': 'Lift Charge',
  igniter: 'Igniter',
  accessory: 'Accessory',
  binary: 'Binary',
}

/** Human-readable label for a product category. */
export function categoryLabel(category: string): string {
  return categoryLabels[category] ?? titleize(category)
}

/** Signed quantity display for ledger rows, e.g. "+40" / "-12". */
export function formatSigned(n: number): string {
  return n > 0 ? `+${formatNumber(n)}` : formatNumber(n)
}

export function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatTime(iso?: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Human-readable label for an operational review flag. */
export const flagLabels: Record<ReviewFlag, string> = {
  'review-required': 'Review Required',
  'potential-conflict': 'Potential Conflict',
  'missing-documentation': 'Missing Documentation',
  'variance-detected': 'Variance Detected',
  'human-review-required': 'Human Review Required',
}

export const flagDescriptions: Record<ReviewFlag, string> = {
  'review-required': 'A person should review this record before it advances.',
  'potential-conflict': 'Conflicting data was detected and needs human resolution.',
  'missing-documentation': 'A required document has not been attached.',
  'variance-detected': 'A counted quantity did not match the system total.',
  'human-review-required': 'This item must be dispositioned by an authorized person.',
}

export const syncLabels: Record<SyncState, string> = {
  synced: 'Synced',
  pending: 'Pending Sync',
  offline: 'Offline',
  error: 'Sync Error',
}

/** Title-case a hyphenated status token, e.g. "in-progress" -> "In Progress". */
export function titleize(token: string): string {
  return token
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Field Ledger design reminder: every regulated custody change appends an event; projections are derived, never edited. */
import type { InventoryEvent, InventoryEventType, InventoryProjectionRow } from "@/types";

const incomingTypes: InventoryEventType[] = ["acquisition", "receipt"];
const transferTypes: InventoryEventType[] = ["movement", "allocation", "load", "return"];
const outgoingTypes: InventoryEventType[] = ["use", "disposition", "destruction"];

export function eventDeltas(event: InventoryEvent): Array<{ custodyId: string; quantity: number }> {
  if (incomingTypes.includes(event.type) && event.toCustodyId) return [{ custodyId: event.toCustodyId, quantity: event.quantity }];
  if (transferTypes.includes(event.type)) {
    return [
      ...(event.fromCustodyId ? [{ custodyId: event.fromCustodyId, quantity: -event.quantity }] : []),
      ...(event.toCustodyId ? [{ custodyId: event.toCustodyId, quantity: event.quantity }] : []),
    ];
  }
  if (outgoingTypes.includes(event.type) && event.fromCustodyId) return [{ custodyId: event.fromCustodyId, quantity: -event.quantity }];
  if (event.type === "adjustment" || event.type === "correction" || event.type === "reversal") {
    return [
      ...(event.fromCustodyId && event.quantity > 0 ? [{ custodyId: event.fromCustodyId, quantity: -event.quantity }] : []),
      ...(event.toCustodyId && event.quantity > 0 ? [{ custodyId: event.toCustodyId, quantity: event.quantity }] : []),
    ];
  }
  return [];
}

export function projectInventory(events: InventoryEvent[]): InventoryProjectionRow[] {
  const projections = new Map<string, InventoryProjectionRow>();
  events.forEach((event) => {
    eventDeltas(event).forEach(({ custodyId, quantity }) => {
      const lotId = event.lotId ?? "UNATTRIBUTED";
      const key = `${event.productId}:${lotId}:${custodyId}`;
      const current = projections.get(key) ?? { productId: event.productId, lotId, custodyId, quantity: 0 };
      projections.set(key, { ...current, quantity: current.quantity + quantity });
    });
  });
  return Array.from(projections.values()).filter((row) => row.quantity !== 0).sort((a, b) => b.quantity - a.quantity);
}

export function availableQuantity(events: InventoryEvent[], productId: string, lotId: string, custodyId: string) {
  return projectInventory(events).find((row) => row.productId === productId && row.lotId === lotId && row.custodyId === custodyId)?.quantity ?? 0;
}

export function relatedEvents(events: InventoryEvent[], eventId: string) {
  return events.filter((event) => event.id === eventId || event.correctionOf === eventId || event.reversalOf === eventId);
}

export function formatEventType(eventType: InventoryEventType) {
  return eventType.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

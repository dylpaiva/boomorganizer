/** Field Ledger design reminder: tests protect the distinction between immutable events and read-only inventory projections. */
import { projectInventory } from "@/lib/eventLedger";
import type { InventoryEvent } from "@/types";
import { describe, expect, it } from "vitest";

const base: Omit<InventoryEvent, "id" | "sequence" | "type" | "quantity" | "fromCustodyId" | "toCustodyId" | "correctionOf"> = {
  occurredAt: "2026-08-12T14:00:00.000Z",
  recordedAt: "2026-08-12T14:00:01.000Z",
  actor: "Demo Field Operator",
  productId: "product-comet-24",
  lotId: "LOT-DEMO-A17",
  unit: "each",
  reference: "DEMO-TEST",
  note: "Synthetic unit test event.",
  syncState: "synced",
  receiptId: "RCP-DEMO-TEST",
  demoOnly: true,
};

describe("event ledger projection", () => {
  it("derives destination and source quantities from append-only receipt and movement events", () => {
    const events: InventoryEvent[] = [
      { ...base, id: "evt-1", sequence: 1, type: "receipt", quantity: 10, toCustodyId: "mag-alpha" },
      { ...base, id: "evt-2", sequence: 2, type: "movement", quantity: 4, fromCustodyId: "mag-alpha", toCustodyId: "mag-bravo" },
    ];

    expect(projectInventory(events)).toEqual(expect.arrayContaining([
      expect.objectContaining({ custodyId: "mag-alpha", quantity: 6 }),
      expect.objectContaining({ custodyId: "mag-bravo", quantity: 4 }),
    ]));
  });

  it("keeps a zero-quantity correction out of the physical inventory projection while preserving it as an event", () => {
    const events: InventoryEvent[] = [
      { ...base, id: "evt-1", sequence: 1, type: "receipt", quantity: 10, toCustodyId: "mag-alpha" },
      { ...base, id: "evt-2", sequence: 2, type: "correction", quantity: 0, toCustodyId: "mag-alpha", correctionOf: "evt-1" },
    ];

    expect(events).toHaveLength(2);
    expect(projectInventory(events)).toEqual([
      expect.objectContaining({ custodyId: "mag-alpha", quantity: 10 }),
    ]);
  });
});

"use client";

import { FormEvent, useMemo, useState } from "react";

import { inventoryCommand } from "@/lib/inventory-api";
import { hasSupabaseConfiguration } from "@/lib/supabase";

type Workflow = "receive" | "move" | "count";

const INITIAL_FORM = {
  organizationId: "",
  productId: "",
  lotId: "",
  sourceLocationId: "",
  destinationLocationId: "",
  quantity: "",
  unit: "EACH",
  observedQuantity: "",
  reason: "",
};

function uniqueKey(): string {
  return crypto.randomUUID();
}

function utcNow(): string {
  return new Date().toISOString();
}

function responseMessage(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "object" && detail !== null && "message" in detail) {
      return String(detail.message);
    }
  }
  return "The server accepted the command.";
}

export function InventoryConsole() {
  const [workflow, setWorkflow] = useState<Workflow>("receive");
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const configured = useMemo(() => hasSupabaseConfiguration(), []);

  function update(name: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setSubmitting(true);
    const idempotencyKey = uniqueKey();

    try {
      let path = "/v1/inventory/receipts";
      let body: Record<string, unknown>;
      if (workflow === "receive") {
        body = {
          product_id: form.productId,
          inventory_lot_id: form.lotId,
          destination_location_id: form.destinationLocationId,
          quantity: form.quantity,
          unit: form.unit,
          occurred_at: utcNow(),
          reference_type: "field_receipt",
          reason: form.reason || undefined,
        };
      } else if (workflow === "move") {
        path = "/v1/inventory/movements";
        body = {
          product_id: form.productId,
          inventory_lot_id: form.lotId,
          source_location_id: form.sourceLocationId,
          destination_location_id: form.destinationLocationId,
          quantity: form.quantity,
          unit: form.unit,
          occurred_at: utcNow(),
          reason: form.reason || undefined,
        };
      } else {
        path = "/v1/inventory/physical-counts";
        body = {
          location_id: form.sourceLocationId,
          occurred_at: utcNow(),
          lines: [
            {
              inventory_lot_id: form.lotId,
              observed_quantity: form.observedQuantity,
              unit: form.unit,
              note: form.reason || undefined,
            },
          ],
        };
      }

      const result = await inventoryCommand(path, form.organizationId, idempotencyKey, body);
      const message = responseMessage(result.payload);
      if (result.status >= 200 && result.status < 300) {
        const action = workflow === "count" ? "Physical count recorded" : "Inventory command accepted";
        setLastReceipt(`${action} · ${idempotencyKey}`);
        setNotice(`${action}. ${message}`);
      } else {
        setNotice(`Command rejected (${result.status}). ${message}`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The command could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <aside className="command-rail" aria-label="Primary navigation">
        <div className="brand-mark" aria-hidden="true">PL</div>
        <div className="brand-copy"><strong>PyroLedger</strong><span>Field operations</span></div>
        <nav>
          <a className="active" href="#inventory">Inventory</a>
          <a href="#custody">Custody</a>
          <a href="#audit">Audit history</a>
          <a href="#reports">Reports</a>
        </nav>
        <p className="rail-status"><span /> Server authoritative</p>
      </aside>

      <section className="workspace" id="inventory">
        <header className="workspace-head">
          <div>
            <p className="eyebrow">Inventory core / online command</p>
            <h1>Capture custody without rewriting history.</h1>
          </div>
          <div className={`connection ${configured ? "ready" : "blocked"}`}>
            <span /> {configured ? "Supabase session required" : "Configuration required"}
          </div>
        </header>

        {!configured && (
          <section className="warning" role="status">
            <strong>Connection is not configured.</strong>
            <p>Set the public Supabase URL, anonymous key, and API URL in the deployment environment. No browser-only inventory records are created while this state is unresolved.</p>
          </section>
        )}

        <section className="workflow-grid">
          <div className="workflow-card">
            <div className="workflow-tabs" role="tablist" aria-label="Inventory workflow">
              {(["receive", "move", "count"] as Workflow[]).map((candidate) => (
                <button
                  className={workflow === candidate ? "selected" : ""}
                  key={candidate}
                  onClick={() => setWorkflow(candidate)}
                  role="tab"
                  type="button"
                >
                  {candidate === "receive" ? "Receive" : candidate === "move" ? "Move" : "Physical count"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="command-form">
              <div className="form-title">
                <p className="eyebrow">Append-only command</p>
                <h2>{workflow === "receive" ? "Receive into custody" : workflow === "move" ? "Move between locations" : "Record observed quantity"}</h2>
                <p>Every submission receives a fresh idempotency key. The server verifies organization membership and permission before it accepts a new record.</p>
              </div>
              <label>Organization UUID<input aria-label="Organization UUID" required value={form.organizationId} onChange={(e) => update("organizationId", e.target.value)} placeholder="Authorized organization context" /></label>
              <div className="form-row">
                <label>Product UUID<input required value={form.productId} onChange={(e) => update("productId", e.target.value)} placeholder="Scan or lookup product" /></label>
                <label>Lot UUID<input required value={form.lotId} onChange={(e) => update("lotId", e.target.value)} placeholder="Scan or lookup lot" /></label>
              </div>
              {workflow !== "receive" && <label>Source location UUID<input required value={form.sourceLocationId} onChange={(e) => update("sourceLocationId", e.target.value)} placeholder={workflow === "count" ? "Counted location" : "Current custody location"} /></label>}
              {workflow !== "count" && <label>Destination location UUID<input required value={form.destinationLocationId} onChange={(e) => update("destinationLocationId", e.target.value)} placeholder="Receiving or destination location" /></label>}
              {workflow !== "count" ? (
                <div className="form-row">
                  <label>Quantity<input required min="0.0001" step="0.0001" type="number" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} placeholder="0.0000" /></label>
                  <label>Operational unit<select value={form.unit} onChange={(e) => update("unit", e.target.value)}><option>EACH</option><option>PACKAGE</option><option>CASE</option><option>POUND</option><option>KILOGRAM</option></select></label>
                </div>
              ) : (
                <div className="form-row">
                  <label>Observed quantity<input required min="0" step="0.0001" type="number" value={form.observedQuantity} onChange={(e) => update("observedQuantity", e.target.value)} placeholder="0.0000" /></label>
                  <label>Operational unit<select value={form.unit} onChange={(e) => update("unit", e.target.value)}><option>EACH</option><option>PACKAGE</option><option>CASE</option><option>POUND</option><option>KILOGRAM</option></select></label>
                </div>
              )}
              <label>Reason or field note<textarea value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="Optional operational context; never a replacement for source evidence." rows={3} /></label>
              <button className="submit" disabled={submitting || !configured} type="submit">{submitting ? "Submitting server command…" : "Submit append-only command"}</button>
            </form>
          </div>

          <aside className="evidence-card" id="audit">
            <p className="eyebrow">Evidence receipt</p>
            <h2>Server response is the record.</h2>
            <div className="evidence-thread"><span /><span /><span /></div>
            <dl>
              <div><dt>Authority</dt><dd>Authenticated API command</dd></div>
              <div><dt>Inventory source</dt><dd>Append-only event ledger</dd></div>
              <div><dt>Count behavior</dt><dd>Observed versus derived, never overwrite</dd></div>
              <div><dt>Regulatory data</dt><dd>Verification required; not evaluated</dd></div>
            </dl>
            {lastReceipt ? <p className="receipt">{lastReceipt}</p> : <p className="receipt muted">No command receipt in this browser session.</p>}
          </aside>
        </section>

        {notice && <section className="notice" role="status">{notice}</section>}
        <section className="principles">
          <article><span>01</span><h3>Tenant-scoped</h3><p>The selected organization is only a request context. The API independently verifies membership and permission.</p></article>
          <article><span>02</span><h3>Ledger-derived</h3><p>Available balance is projected from recorded events. A quantity field in this interface is never the source of truth.</p></article>
          <article><span>03</span><h3>Reviewable variance</h3><p>A physical count creates an observed record and, when needed, a variance. It does not silently alter custody.</p></article>
        </section>
      </section>
    </main>
  );
}

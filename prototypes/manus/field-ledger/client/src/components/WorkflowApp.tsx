/** Field Ledger design reminder: command rail + evidence canvas; emphasize scan-first action, custody provenance, and irreversible receipts. */
import { Button } from "@/components/ui/button";
import { availableQuantity, formatEventType, projectInventory, relatedEvents } from "@/lib/eventLedger";
import { custodyLocations, initialEvents, locationById, productById, products, workflowDefinitions } from "@/lib/demoData";
import type { AppState, InventoryEvent, InventoryEventType, OperationReceipt, PhysicalCount, WorkflowDefinition, WorkflowId } from "@/types";
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Check,
  ChevronRight,
  ClipboardCheck,
  CloudOff,
  Download,
  FileCheck2,
  History,
  Menu,
  PackageCheck,
  Radio,
  ReceiptText,
  ScanLine,
  Search,
  ShieldCheck,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const appActor = "Demo Field Operator";
const eventTypesWithoutProjection: InventoryEventType[] = ["correction", "reversal"];

function makeId(prefix: string) {
  return `${prefix}-DEMO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

function ProductLabel({ productId }: { productId: string }) {
  const product = productById(productId);
  return <span>{product?.displayName ?? "Unknown synthetic product"}</span>;
}

function LocationLabel({ locationId }: { locationId?: string }) {
  return <span>{locationById(locationId)?.label ?? "—"}</span>;
}

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "amber" | "green" | "rose" | "slate" | "blue" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="section-detail">{detail}</p>
      </div>
      {action ? <div className="heading-action">{action}</div> : null}
    </div>
  );
}

function LedgerStamp({ receipt }: { receipt: OperationReceipt }) {
  return (
    <div className="receipt-stamp">
      <div className="receipt-stamp-mark"><Check size={18} strokeWidth={3} /></div>
      <div>
        <p className="stamp-overline">Latest operational receipt</p>
        <strong>{receipt.title}</strong>
        <p>{receipt.reference} · {timeLabel(receipt.occurredAt)}</p>
      </div>
    </div>
  );
}

function ScanField({ value, onChange, onSubmit, label = "Scanner input", helper = "Synthetic barcode input. Try DEMO-0815-0001." }: { value: string; onChange: (value: string) => void; onSubmit: () => void; label?: string; helper?: string }) {
  return (
    <label className="scan-field">
      <span className="field-label"><Barcode size={16} /> {label}</span>
      <div className="scan-control">
        <input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSubmit()} placeholder="Scan or type code" aria-label={label} />
        <button className="scan-button" onClick={onSubmit} type="button" aria-label="Resolve scanner input"><ScanLine size={19} /></button>
      </div>
      <small>{helper}</small>
    </label>
  );
}

interface TransferFormProps {
  workflow: WorkflowDefinition;
  events: InventoryEvent[];
  onCommit: (event: Omit<InventoryEvent, "id" | "sequence" | "occurredAt" | "recordedAt" | "actor" | "syncState" | "receiptId" | "demoOnly">, title: string, summary: string) => void;
}

function TransferForm({ workflow, events, onCommit }: TransferFormProps) {
  const isReceipt = workflow.id === "receive-inventory";
  const isMove = workflow.id === "move-inventory";
  const isAllocation = workflow.id === "show-package";
  const isLoadout = workflow.id === "show-loadout";
  const isVehicle = workflow.id === "vehicle-custody";
  const isReturn = workflow.id === "return-reconciliation";
  const defaultProduct = isLoadout || isReturn ? "product-fountain-6" : "product-comet-24";
  const [productId, setProductId] = useState(defaultProduct);
  const [lotId, setLotId] = useState(isLoadout || isReturn ? "LOT-DEMO-F09" : "LOT-DEMO-A17");
  const [quantity, setQuantity] = useState("1");
  const [fromCustodyId, setFromCustodyId] = useState(isLoadout ? "show-demo" : isReturn ? "vehicle-bravo" : "mag-alpha");
  const [toCustodyId, setToCustodyId] = useState(isReceipt ? "mag-alpha" : isMove ? "mag-bravo" : isAllocation ? "show-demo" : isLoadout ? "vehicle-bravo" : isVehicle ? "vehicle-bravo" : "mag-alpha");
  const [reference, setReference] = useState(`DEMO-${workflow.shortTitle.toUpperCase().replace(/\s/g, "-")}-01`);
  const [note, setNote] = useState("Synthetic prototype entry. Production policy controls are intentionally not modeled.");
  const qty = Number(quantity);
  const available = availableQuantity(events, productId, lotId, fromCustodyId);
  const requiresSource = !isReceipt;
  const valid = Number.isFinite(qty) && qty > 0 && productId && lotId && toCustodyId && (!requiresSource || fromCustodyId) && (!requiresSource || fromCustodyId !== toCustodyId);
  const exceedsAvailable = requiresSource && qty > available;

  const submit = () => {
    if (!valid || exceedsAvailable || !workflow.eventType) return;
    onCommit({
      type: workflow.eventType,
      productId,
      lotId,
      quantity: qty,
      unit: "each",
      fromCustodyId: requiresSource ? fromCustodyId : undefined,
      toCustodyId,
      reference,
      note,
    }, `${formatEventType(workflow.eventType)} receipt issued`, `${qty} ${productById(productId)?.unit ?? "each"} of ${productById(productId)?.displayName} recorded from ${requiresSource ? locationById(fromCustodyId)?.label : "external sender"} to ${locationById(toCustodyId)?.label}.`);
  };

  return (
    <div className="form-shell">
      <div className="form-intro">
        <div className="form-intro-icon"><Truck size={20} /></div>
        <div><strong>{workflow.title}</strong><p>This creates a new <code>{workflow.eventType}</code> event; it never edits a stored balance.</p></div>
      </div>
      <div className="form-grid">
        <label className="field"><span>Product</span><select value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((product) => <option value={product.id} key={product.id}>{product.displayName}</option>)}</select></label>
        <label className="field"><span>Lot reference</span><input value={lotId} onChange={(event) => setLotId(event.target.value)} placeholder="LOT-DEMO-…" /></label>
        <label className="field"><span>Quantity</span><input min="1" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        {requiresSource ? <label className="field"><span>From custody</span><select value={fromCustodyId} onChange={(event) => setFromCustodyId(event.target.value)}>{custodyLocations.filter((location) => location.id !== "supplier-demo").map((location) => <option value={location.id} key={location.id}>{location.label}</option>)}</select><small>Derived available: {available} each</small></label> : null}
        <label className="field"><span>To custody</span><select value={toCustodyId} onChange={(event) => setToCustodyId(event.target.value)}>{custodyLocations.filter((location) => location.id !== "supplier-demo").map((location) => <option value={location.id} key={location.id}>{location.label}</option>)}</select></label>
        <label className="field"><span>Reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        <label className="field field-wide"><span>Operator note</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      </div>
      {exceedsAvailable ? <div className="inline-warning"><AlertTriangle size={17} /><span>Quantity exceeds the derived available projection at the selected source. This prototype blocks the handoff; production policy and permissions remain open questions.</span></div> : null}
      <div className="form-footer">
        <span className="muted-copy">A receipt is generated immediately. {requiresSource ? "Source and destination are both retained in the event." : "The sender is retained as external synthetic custody."}</span>
        <Button type="button" onClick={submit} disabled={!valid || exceedsAvailable} className="action-button"><Check size={17} /> {workflow.primaryAction}</Button>
      </div>
    </div>
  );
}

function ScanWorkflow({ onRoute }: { onRoute: (workflowId: WorkflowId) => void }) {
  const [scanValue, setScanValue] = useState("DEMO-0815-0001");
  const [submitted, setSubmitted] = useState(false);
  const product = products.find((candidate) => candidate.scanCode.toLowerCase() === scanValue.trim().toLowerCase() || candidate.sku.toLowerCase() === scanValue.trim().toLowerCase());
  return (
    <div className="workflow-stack">
      <SectionHeading eyebrow="01 · Scan first" title="Resolve a product before custody changes." detail="This scanner is keyboard-wedge friendly for the prototype. A camera scanner and device integration are deliberately left for production." />
      <div className="field-card scan-hero-card">
        <div className="scan-hero-copy"><Pill tone="amber">Scanner ready</Pill><h2>Scan the package identifier.</h2><p>Use a synthetic code to prove speed and failure behavior. No product or inventory change occurs at scan resolution.</p></div>
        <div className="scan-hero-action"><ScanField value={scanValue} onChange={setScanValue} onSubmit={() => setSubmitted(true)} /></div>
      </div>
      {submitted ? product ? <div className="resolved-product"><div className="resolved-icon"><PackageCheck size={24} /></div><div><p className="eyebrow">Matched synthetic product</p><h2>{product.displayName}</h2><p>{product.sku} · {product.description}</p></div><div className="resolved-actions"><Button onClick={() => onRoute("receive-inventory")} className="action-button">Receive <ArrowRight size={16} /></Button><Button variant="outline" onClick={() => onRoute("move-inventory")} className="ghost-button">Move custody</Button></div></div> : <div className="attention-card"><AlertTriangle size={22} /><div><h2>Code is not in the synthetic catalog.</h2><p>Stop the custody action and capture a review reference. This prototype does not infer a product, lot, or hazard classification.</p></div></div> : null}
      <div className="note-panel"><ShieldCheck size={18} /><span><strong>Prototype constraint:</strong> scan identity is an input-resolution step only. The event receipt is generated only by the next explicit workflow action.</span></div>
    </div>
  );
}

function AssignLotWorkflow({ events, initialEventId, onCommit }: { events: InventoryEvent[]; initialEventId?: string; onCommit: TransferFormProps["onCommit"] }) {
  const eligible = events.filter((event) => !event.lotId && !eventTypesWithoutProjection.includes(event.type));
  const [eventId, setEventId] = useState(initialEventId ?? eligible[0]?.id ?? events[0].id);
  const [lotId, setLotId] = useState("LOT-DEMO-REVIEW-01");
  const [reason, setReason] = useState("Lot attribution discovered after the original receipt. Original record remains unchanged.");
  useEffect(() => { if (initialEventId) setEventId(initialEventId); }, [initialEventId]);
  const original = events.find((event) => event.id === eventId);
  const submit = () => {
    if (!original || !lotId.trim()) return;
    onCommit({ type: "correction", productId: original.productId, lotId, quantity: 0, unit: "each", fromCustodyId: original.fromCustodyId, toCustodyId: original.toCustodyId, reference: `DEMO-CORRECTION-${original.sequence}`, note: reason, correctionOf: original.id }, "Correction receipt issued", `Lot ${lotId} was attributed through a new correction event linked to ${original.id}. The original event remains preserved.`);
  };
  return <div className="workflow-stack"><SectionHeading eyebrow="Evidence correction" title="Assign lot through a linked correction." detail="The original event remains immutable. This prototype creates a zero-quantity attribution correction that visibly links to the original evidence." /><div className="field-card"><div className="form-grid"><label className="field field-wide"><span>Original event</span><select value={eventId} onChange={(event) => setEventId(event.target.value)}>{events.map((event) => <option key={event.id} value={event.id}>{event.id} · {formatEventType(event.type)} · <ProductLabel productId={event.productId} /></option>)}</select></label><label className="field"><span>Lot reference</span><input value={lotId} onChange={(event) => setLotId(event.target.value)} /></label><label className="field field-wide"><span>Correction rationale</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label></div><div className="inline-warning neutral"><History size={17} /><span>Prototype assumption: a correction may carry late lot attribution. Regulatory validation and approval routing are not modeled.</span></div><div className="form-footer"><span className="muted-copy">Linked original: {original?.id ?? "none"}</span><Button className="action-button" onClick={submit}><FileCheck2 size={17} /> Issue correction</Button></div></div></div>;
}

function PhysicalInventoryWorkflow({ state, onRecord }: { state: AppState; onRecord: (count: Omit<PhysicalCount, "id" | "occurredAt" | "actor" | "demoOnly">) => void }) {
  const rows = projectInventory(state.events).filter((row) => row.custodyId === "mag-alpha");
  const [rowKey, setRowKey] = useState(rows[0] ? `${rows[0].productId}:${rows[0].lotId}` : "");
  const [countedQuantity, setCountedQuantity] = useState(rows[0]?.quantity.toString() ?? "0");
  const [note, setNote] = useState("Synthetic count observed by demo operator.");
  const selected = rows.find((row) => `${row.productId}:${row.lotId}` === rowKey) ?? rows[0];
  const expected = selected?.quantity ?? 0;
  const actual = Number(countedQuantity);
  const variance = actual - expected;
  const submit = () => selected && Number.isFinite(actual) && onRecord({ locationId: "mag-alpha", productId: selected.productId, lotId: selected.lotId, expectedQuantity: expected, countedQuantity: actual, status: variance === 0 ? "matched" : "variance-open", note });
  return <div className="workflow-stack"><SectionHeading eyebrow="Observed, not overwritten" title="Capture the physical count." detail="The derived ledger remains unchanged. A variance opens a separate investigation path rather than silently changing a quantity." /><div className="field-card"><div className="form-grid"><label className="field field-wide"><span>Count item</span><select value={rowKey} onChange={(event) => { const next = rows.find((row) => `${row.productId}:${row.lotId}` === event.target.value); setRowKey(event.target.value); setCountedQuantity(next?.quantity.toString() ?? "0"); }}>{rows.map((row) => <option value={`${row.productId}:${row.lotId}`} key={`${row.productId}:${row.lotId}`}><ProductLabel productId={row.productId} /> · {row.lotId}</option>)}</select></label><div className="readout"><span>Derived expected</span><strong>{expected}</strong><small>each · read-only projection</small></div><label className="field"><span>Observed count</span><input type="number" min="0" value={countedQuantity} onChange={(event) => setCountedQuantity(event.target.value)} /></label><label className="field field-wide"><span>Count note</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label></div><div className={variance === 0 ? "inline-success" : "inline-warning"}>{variance === 0 ? <Check size={17} /> : <AlertTriangle size={17} />}<span>{variance === 0 ? "Count matches the derived projection. Recording the observation will create a count receipt." : `Variance detected: ${Math.abs(variance)} each ${variance > 0 ? "above" : "below"} the derived projection. An investigation is required before any separate adjustment event.`}</span></div><div className="form-footer"><span className="muted-copy">Location: <LocationLabel locationId="mag-alpha" /></span><Button className="action-button" onClick={submit}><ClipboardCheck size={17} /> Record count</Button></div></div></div>;
}

function VarianceWorkflow({ state, onCommit, onRoute }: { state: AppState; onCommit: TransferFormProps["onCommit"]; onRoute: (id: WorkflowId) => void }) {
  const count = state.counts.find((candidate) => candidate.status === "variance-open" || candidate.status === "investigating");
  const [reason, setReason] = useState("Synthetic reconciliation note. Production approval, classification, and escalation policies are intentionally outside this prototype.");
  if (!count) return <div className="workflow-stack"><SectionHeading eyebrow="Investigation" title="No open synthetic variance." detail="Record a physical count that differs from the derived projection to exercise this workflow." /><div className="empty-card"><ClipboardCheck size={27} /><h2>There is nothing waiting for investigation.</h2><p>Physical inventory creates evidence first, then routes an unresolved difference here.</p><Button className="action-button" onClick={() => onRoute("physical-inventory")}>Record physical count <ArrowRight size={16} /></Button></div></div>;
  const difference = count.countedQuantity - count.expectedQuantity;
  const adjustmentQuantity = Math.abs(difference);
  const submit = () => onCommit({ type: "adjustment", productId: count.productId, lotId: count.lotId, quantity: adjustmentQuantity, unit: "each", fromCustodyId: difference < 0 ? count.locationId : undefined, toCustodyId: difference > 0 ? count.locationId : undefined, reference: `DEMO-ADJUST-${count.id.slice(-4)}`, note: reason }, "Adjustment event issued", `A signed adjustment event was appended for ${adjustmentQuantity} each after the recorded physical-count investigation. The count observation remains preserved.`);
  return <div className="workflow-stack"><SectionHeading eyebrow="Variance evidence" title="Investigate before recording an adjustment." detail="This prototype surfaces a plain-language difference, preserves the physical count, and appends—rather than edits—a resolution event." /><div className="field-card"><div className="variance-banner"><div><Pill tone="rose">Variance open</Pill><h2><ProductLabel productId={count.productId} /></h2><p>{count.lotId} · <LocationLabel locationId={count.locationId} /></p></div><div className="variance-number"><span>Observed delta</span><strong>{difference > 0 ? "+" : "−"}{Math.abs(difference)}</strong><small>each</small></div></div><div className="evidence-strip"><span>Expected <strong>{count.expectedQuantity}</strong></span><ChevronRight size={16} /><span>Counted <strong>{count.countedQuantity}</strong></span><ChevronRight size={16} /><span>Resolution <strong>new adjustment event</strong></span></div><label className="field field-wide"><span>Investigation note</span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="inline-warning neutral"><AlertTriangle size={17} /><span>This action demonstrates append-only adjustment mechanics. It does not assert regulatory approval, root-cause, or disposition rules.</span></div><div className="form-footer"><span className="muted-copy">Physical count receipt: {count.id}</span><Button className="action-button" onClick={submit}><FileCheck2 size={17} /> Create adjustment</Button></div></div></div>;
}

function AttestationWorkflow({ workflow, onReceipt }: { workflow: WorkflowDefinition; onReceipt: (title: string, summary: string, outcome?: OperationReceipt["outcome"]) => void }) {
  const [status, setStatus] = useState("No attention items observed in this synthetic prototype entry.");
  const titles: Partial<Record<WorkflowId, { heading: string; details: string; fields: string[] }>> = {
    "magazine-daily-close": { heading: "Close the operational day with a receipt.", details: "The prototype captures an explicit attestation and an exception note. It does not encode a regulatory checklist or acceptance thresholds.", fields: ["Custody location: Magazine Alpha · Synthetic", "Physical count status: reviewed", "Exception summary"] },
    "magazine-inspection": { heading: "Record an inspection observation.", details: "Record the operator’s observation as an auditable receipt. Configurable criteria and inspection standards belong to the production regulatory model.", fields: ["Inspection surface: synthetic", "Custody location: Magazine Alpha · Synthetic", "Observation summary"] },
    "shipment-review": { heading: "Capture a shipment review receipt.", details: "This is intentionally a review shell, not a regulatory rules engine. It keeps the decision, reference, and attention state visible.", fields: ["Shipment reference: DEMO-SHIP-014", "Review scope: synthetic manifest", "Attention summary"] },
  };
  const copy = titles[workflow.id] ?? { heading: workflow.title, details: workflow.description, fields: ["Synthetic record", "Operator review", "Note"] };
  return <div className="workflow-stack"><SectionHeading eyebrow="Operational record" title={copy.heading} detail={copy.details} /><div className="field-card attestation-card"><div className="attestation-top"><div className="attestation-icon"><ShieldCheck size={26} /></div><div><h2>{workflow.title}</h2><p>This is an operational receipt, not an inventory balance update.</p></div></div><div className="checklist">{copy.fields.map((item, index) => <div className="check-item" key={item}><span className="check-number">0{index + 1}</span><span>{item}</span><Check size={17} /></div>)}</div><label className="field field-wide"><span>Operator note</span><textarea rows={4} value={status} onChange={(event) => setStatus(event.target.value)} /></label><div className="form-footer"><span className="muted-copy">Actor: {appActor} · synthetic demo only</span><Button className="action-button" onClick={() => onReceipt(`${workflow.title} receipt issued`, status, status.toLowerCase().includes("attention") ? "attention" : "completed")}><Check size={17} /> {workflow.primaryAction}</Button></div></div></div>;
}

function AuditWorkflow({ state, onCorrect }: { state: AppState; onCorrect: (event: InventoryEvent) => void }) {
  const [filter, setFilter] = useState<"all" | "events" | "receipts" | "queued">("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(state.events[state.events.length - 1]?.id);
  const rows = state.events.slice().reverse().filter((event) => filter === "all" || filter === "events" || (filter === "queued" && event.syncState === "queued"));
  const selected = state.events.find((event) => event.id === selectedId);
  return <div className="workflow-stack"><SectionHeading eyebrow="Append-only trace" title="Audit history stays visible." detail="Events and operation receipts are separate evidence records. The interface supplies correction and reversal pathways; it intentionally supplies no edit or delete control." action={<Pill tone="green">{state.events.length} events</Pill>} /><div className="audit-toolbar"><div className="segmented">{(["all", "events", "receipts", "queued"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}</button>)}</div><div className="audit-search"><Search size={16} /><span>Static demo trace</span></div></div><div className="audit-layout"><div className="audit-list"><div className="audit-list-heading"><span>Event receipt</span><span>State</span></div>{rows.map((event) => <button className={selectedId === event.id ? "audit-row active" : "audit-row"} key={event.id} onClick={() => setSelectedId(event.id)}><div><strong>{event.id}</strong><span>{formatEventType(event.type)} · <ProductLabel productId={event.productId} /></span></div><div><Pill tone={event.syncState === "queued" ? "amber" : "green"}>{event.syncState}</Pill><small>{timeLabel(event.occurredAt)}</small></div></button>)}{filter !== "events" && filter !== "queued" ? state.operationReceipts.slice().reverse().map((receipt) => <div className="audit-row receipt-row" key={receipt.id}><div><strong>{receipt.reference}</strong><span>{receipt.title}</span></div><div><Pill tone={receipt.outcome === "attention" ? "rose" : "green"}>{receipt.outcome}</Pill><small>{timeLabel(receipt.occurredAt)}</small></div></div>) : null}</div><aside className="audit-detail">{selected ? <><p className="eyebrow">Selected evidence</p><h2>{formatEventType(selected.type)}</h2><div className="detail-pairs"><span>Event ID</span><code>{selected.id}</code><span>Actor</span><strong>{selected.actor}</strong><span>Occurred</span><strong>{timeLabel(selected.occurredAt)}</strong><span>Custody route</span><strong><LocationLabel locationId={selected.fromCustodyId} /> <ArrowRight size={13} /> <LocationLabel locationId={selected.toCustodyId} /></strong><span>Reference</span><strong>{selected.reference}</strong><span>Note</span><strong>{selected.note}</strong></div>{relatedEvents(state.events, selected.id).length > 1 ? <div className="linked-evidence"><History size={16} /> Linked evidence: {relatedEvents(state.events, selected.id).map((event) => event.id).join(", ")}</div> : null}<Button variant="outline" className="ghost-button detail-action" onClick={() => onCorrect(selected)}><FileCheck2 size={16} /> Create linked correction</Button></> : <div className="empty-detail">Select an event to inspect its immutable receipt.</div>}</aside></div></div>;
}

function ExportWorkflow({ state, onReceipt }: { state: AppState; onReceipt: (title: string, summary: string, outcome?: OperationReceipt["outcome"]) => void }) {
  const [includeCounts, setIncludeCounts] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);
  const createExport = () => {
    const payload = { exportVersion: "pyroledger-prototype-v1", generatedAt: nowIso(), classification: "synthetic-demo-only", events: state.events, operationReceipts: includeReceipts ? state.operationReceipts : [], physicalCounts: includeCounts ? state.counts : [], inventoryProjection: projectInventory(state.events), migrationNote: "Portable JSON; no Manus runtime is required to parse this file." };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `pyroledger-synthetic-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    onReceipt("Portable evidence export created", `Export includes ${state.events.length} event records${includeReceipts ? ` and ${state.operationReceipts.length} operational receipts` : ""}.`, "exported");
  };
  return <div className="workflow-stack"><SectionHeading eyebrow="Portable boundary" title="Export the complete synthetic record." detail="The prototype writes a documented JSON package in the browser. Production can substitute signed formats, storage, schemas, and delivery channels." /><div className="export-layout"><div className="field-card export-card"><div className="export-icon"><Download size={25} /></div><h2>Evidence package</h2><p>The current in-memory demo ledger, its derived inventory projection, and optional non-ledger records are serialized as JSON.</p><label className="toggle-row"><input type="checkbox" checked={includeCounts} onChange={(event) => setIncludeCounts(event.target.checked)} /><span><strong>Include physical count records</strong><small>{state.counts.length} record(s)</small></span></label><label className="toggle-row"><input type="checkbox" checked={includeReceipts} onChange={(event) => setIncludeReceipts(event.target.checked)} /><span><strong>Include operation receipts</strong><small>{state.operationReceipts.length} record(s)</small></span></label><Button className="action-button export-button" onClick={createExport}><Download size={17} /> Create JSON export</Button></div><div className="export-notes"><p className="eyebrow">Migration handoff</p><h2>Designed to leave the prototype.</h2><ul><li>Event records use a documented, portable shape.</li><li>Inventory projection is derived at export time—not a stored mutable quantity.</li><li>Browser storage, signatures, approvals, and regulator formats are not implemented.</li></ul><div className="note-panel"><CloudOff size={18} /><span>In offline simulation, the file still exports the local queued events and retains their sync state.</span></div></div></div></div>;
}

function Dashboard({ state, onRoute }: { state: AppState; onRoute: (id: WorkflowId) => void }) {
  const inventory = projectInventory(state.events);
  const queued = state.events.filter((event) => event.syncState === "queued").length;
  const variance = state.counts.filter((count) => count.status === "variance-open").length;
  return <div className="workflow-stack dashboard"><div className="dashboard-hero"><div className="hero-overlay" /><div className="hero-content"><Pill tone="amber">Synthetic demo workspace</Pill><h1>Move material.<br /><em>Keep the evidence.</em></h1><p>Event-led inventory is a ledger of custody changes. This prototype derives availability from receipts rather than keeping a mutable quantity field.</p><div className="hero-buttons"><Button className="action-button" onClick={() => onRoute("scan-product")}><ScanLine size={17} /> Scan product</Button><Button variant="outline" className="ghost-button light" onClick={() => onRoute("audit-history")}><History size={17} /> Inspect audit history</Button></div></div><div className="hero-rail"><span>Live prototype status</span><strong>{queued > 0 ? "Queue requires sync" : "Evidence current"}</strong><small>{state.events.length} immutable events · {state.operationReceipts.length} operational receipts</small></div></div><div className="custody-thread" aria-label="Custody evidence path"><div className="thread-step active"><span>01</span><div><strong>Next handoff</strong><small>Scan → explicit event</small></div></div><ArrowRight size={18} /><div className="thread-step"><span>02</span><div><strong>Derived custody</strong><small>{inventory.reduce((total, row) => total + row.quantity, 0)} units in projection</small></div></div><ArrowRight size={18} /><div className="thread-step"><span>03</span><div><strong>Receipt consequence</strong><small>{state.events.length + state.operationReceipts.length} records visible</small></div></div></div><div className="metric-band"><div><span>Derived units</span><strong>{inventory.reduce((total, row) => total + row.quantity, 0)}</strong><small>read-only projection</small></div><div><span>Custody locations</span><strong>{new Set(inventory.map((row) => row.custodyId)).size}</strong><small>synthetic only</small></div><div><span>Open variance</span><strong className={variance ? "danger-number" : ""}>{variance}</strong><small>count record(s)</small></div><div><span>Queued evidence</span><strong className={queued ? "amber-number" : ""}>{queued}</strong><small>offline simulation</small></div></div><div className="dashboard-split"><div className="field-card quick-actions"><div className="card-provenance"><span>Operational action set</span><code>CTX-DEMO-OVERVIEW</code></div><p className="eyebrow">Common handoffs</p><h2>Take the next custody action.</h2><div className="quick-grid">{["receive-inventory", "move-inventory", "show-loadout", "physical-inventory"].map((id) => { const workflow = workflowDefinitions.find((definition) => definition.id === id)!; return <button key={id} onClick={() => onRoute(workflow.id)}><span className="quick-icon">{id === "physical-inventory" ? <ClipboardCheck size={19} /> : id === "show-loadout" ? <Truck size={19} /> : <ArrowRight size={19} />}</span><strong>{workflow.shortTitle}</strong><small>{workflow.description}</small><em>{workflow.eventType ? formatEventType(workflow.eventType) : "observation"} · next receipt</em><ChevronRight size={16} /></button>; })}</div></div><div className="field-card projection-card"><div className="card-provenance"><span>Projection snapshot</span><code>AS-OF {timeLabel(state.events[state.events.length - 1]?.occurredAt ?? nowIso())}</code></div><div className="projection-head"><div><p className="eyebrow">Read-only view</p><h2>Derived inventory</h2></div><Button variant="outline" className="ghost-button" onClick={() => onRoute("audit-history")}>Evidence <ArrowRight size={15} /></Button></div><div className="projection-list">{inventory.map((row) => <div key={`${row.productId}-${row.lotId}-${row.custodyId}`}><div><strong><ProductLabel productId={row.productId} /></strong><span>{row.lotId} · <LocationLabel locationId={row.custodyId} /></span></div><b>{row.quantity}</b></div>)}</div></div></div></div>;
}

export default function WorkflowApp() {
  const [state, setState] = useState<AppState>({ events: initialEvents, operationReceipts: [], counts: [], simulateOffline: false });
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowId | "overview">("overview");
  const [correctionEventId, setCorrectionEventId] = useState<string | undefined>();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const activeDefinition = workflowDefinitions.find((definition) => definition.id === activeWorkflow);
  const latestReceipt = useMemo(() => state.operationReceipts.find((receipt) => receipt.id === state.lastReceiptId), [state.lastReceiptId, state.operationReceipts]);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => { window.removeEventListener("online", updateConnection); window.removeEventListener("offline", updateConnection); };
  }, []);

  const route = (workflowId: WorkflowId | "overview") => { setActiveWorkflow(workflowId); setMobileOpen(false); };
  const addReceipt = (workflow: WorkflowId, title: string, summary: string, outcome: OperationReceipt["outcome"] = "completed") => {
    const receipt: OperationReceipt = { id: makeId("opr"), workflow, occurredAt: nowIso(), actor: appActor, outcome, title, summary, reference: `RCP-DEMO-${String(state.operationReceipts.length + state.events.length + 1).padStart(4, "0")}`, syncState: state.simulateOffline || !online ? "queued" : "synced", demoOnly: true };
    setState((previous) => ({ ...previous, operationReceipts: [...previous.operationReceipts, receipt], lastReceiptId: receipt.id }));
  };
  const commitEvent = (workflow: WorkflowId, payload: Omit<InventoryEvent, "id" | "sequence" | "occurredAt" | "recordedAt" | "actor" | "syncState" | "receiptId" | "demoOnly">, title: string, summary: string) => {
    const receiptId = `RCP-DEMO-${String(state.events.length + state.operationReceipts.length + 1).padStart(4, "0")}`;
    const date = nowIso();
    const event: InventoryEvent = { ...payload, id: makeId("evt"), sequence: state.events.length + 1, occurredAt: date, recordedAt: date, actor: appActor, syncState: state.simulateOffline || !online ? "queued" : "synced", receiptId, demoOnly: true };
    const receipt: OperationReceipt = { id: makeId("opr"), workflow, occurredAt: date, actor: appActor, outcome: "completed", title, summary, reference: receiptId, syncState: event.syncState, demoOnly: true };
    setState((previous) => ({ ...previous, events: [...previous.events, event], operationReceipts: [...previous.operationReceipts, receipt], lastReceiptId: receipt.id }));
  };
  const recordCount = (count: Omit<PhysicalCount, "id" | "occurredAt" | "actor" | "demoOnly">) => {
    const full: PhysicalCount = { ...count, id: makeId("cnt"), actor: appActor, occurredAt: nowIso(), demoOnly: true };
    const receipt: OperationReceipt = { id: makeId("opr"), workflow: "physical-inventory", occurredAt: full.occurredAt, actor: appActor, outcome: full.status === "matched" ? "completed" : "attention", title: full.status === "matched" ? "Physical count recorded" : "Physical count recorded · variance open", summary: full.status === "matched" ? "Observed quantity matched the derived projection; no ledger event was created." : `Observed quantity differs from the derived projection. Variance investigation is now available.`, reference: `RCP-DEMO-${String(state.events.length + state.operationReceipts.length + 1).padStart(4, "0")}`, syncState: state.simulateOffline || !online ? "queued" : "synced", demoOnly: true };
    setState((previous) => ({ ...previous, counts: [...previous.counts, full], operationReceipts: [...previous.operationReceipts, receipt], lastReceiptId: receipt.id }));
  };
  const syncQueue = () => {
    const queued = state.events.filter((event) => event.syncState === "queued").length + state.operationReceipts.filter((receipt) => receipt.syncState === "queued").length;
    const receipt: OperationReceipt = { id: makeId("opr"), workflow: "audit-history", occurredAt: nowIso(), actor: appActor, outcome: "completed", title: "Queued demo evidence marked synced", summary: `${queued} locally queued synthetic record(s) were marked synced in the prototype. No server exchange occurred.`, reference: `RCP-DEMO-${String(state.events.length + state.operationReceipts.length + 1).padStart(4, "0")}`, syncState: "synced", demoOnly: true };
    setState((previous) => ({ ...previous, events: previous.events.map((event) => ({ ...event, syncState: "synced" })), operationReceipts: [...previous.operationReceipts.map((operationReceipt) => ({ ...operationReceipt, syncState: "synced" as const })), receipt], lastReceiptId: receipt.id, simulateOffline: false }));
  };
  const renderWorkflow = () => {
    if (activeWorkflow === "overview") return <Dashboard state={state} onRoute={route} />;
    const workflow = activeDefinition!;
    if (workflow.id === "scan-product") return <ScanWorkflow onRoute={route} />;
    if (workflow.id === "assign-lot") return <AssignLotWorkflow events={state.events} initialEventId={correctionEventId} onCommit={(payload, title, summary) => commitEvent(workflow.id, payload, title, summary)} />;
    if (workflow.id === "physical-inventory") return <PhysicalInventoryWorkflow state={state} onRecord={recordCount} />;
    if (workflow.id === "variance-investigation") return <VarianceWorkflow state={state} onRoute={route} onCommit={(payload, title, summary) => commitEvent(workflow.id, payload, title, summary)} />;
    if (["magazine-daily-close", "magazine-inspection", "shipment-review"].includes(workflow.id)) return <AttestationWorkflow workflow={workflow} onReceipt={(title, summary, outcome) => addReceipt(workflow.id, title, summary, outcome)} />;
    if (workflow.id === "audit-history") return <AuditWorkflow state={state} onCorrect={(event) => { setCorrectionEventId(event.id); route("assign-lot"); }} />;
    if (workflow.id === "regulatory-export") return <ExportWorkflow state={state} onReceipt={(title, summary, outcome) => addReceipt(workflow.id, title, summary, outcome)} />;
    return <div className="workflow-stack"><SectionHeading eyebrow={`${workflow.group} workflow`} title={workflow.title} detail={workflow.description} /><TransferForm workflow={workflow} events={state.events} onCommit={(payload, title, summary) => commitEvent(workflow.id, payload, title, summary)} /></div>;
  };
  const groupNames = ["Inventory", "Magazine", "Shows", "Compliance"] as const;
  const queued = state.events.filter((event) => event.syncState === "queued").length + state.operationReceipts.filter((receipt) => receipt.syncState === "queued").length;
  return <div className="app-shell"><aside className={mobileOpen ? "command-rail open" : "command-rail"}><div className="rail-top"><button className="brand" onClick={() => route("overview")}><img src="/manus-storage/pyroledger-ledger-spark-logo_8eafa862.png" alt="" /><span><strong>PyroLedger</strong><small>Field Ledger / prototype</small></span></button><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div><button className={activeWorkflow === "overview" ? "overview-link active" : "overview-link"} onClick={() => route("overview")}><Warehouse size={18} /> Operational overview</button><nav>{groupNames.map((group) => <div className="nav-group" key={group}><p>{group}</p>{workflowDefinitions.filter((definition) => definition.group === group).map((definition) => <button key={definition.id} onClick={() => route(definition.id)} className={activeWorkflow === definition.id ? "active" : ""}><span>{definition.shortTitle}</span>{definition.id === "variance-investigation" && state.counts.some((count) => count.status === "variance-open") ? <i /> : null}</button>)}</div>)}</nav><div className="rail-footer"><div className="sync-state"><span className={state.simulateOffline || !online ? "sync-dot offline" : "sync-dot"} /> <span>{state.simulateOffline || !online ? "Offline queue" : "Network available"}</span></div><label className="offline-toggle"><input type="checkbox" checked={state.simulateOffline} onChange={(event) => setState((previous) => ({ ...previous, simulateOffline: event.target.checked }))} /><span>Simulate offline</span></label>{queued ? <button onClick={syncQueue} className="sync-button"><Radio size={15} /> Mark {queued} queued as synced</button> : null}</div></aside><main className="evidence-canvas"><header className="mobile-header"><button onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="mobile-brand"><img src="/manus-storage/pyroledger-ledger-spark-logo_8eafa862.png" alt="" /><span>PyroLedger</span></div><Pill tone={queued ? "amber" : "green"}>{queued ? `${queued} queued` : "synced"}</Pill></header><div className="top-notice"><CloudOff size={15} /><span><strong>Prototype:</strong> synthetic data only. Inventory is derived from append-only events. <button onClick={() => route("regulatory-export")}>View export boundary <ArrowRight size={13} /></button></span></div>{renderWorkflow()}</main><aside className="receipt-rail"><div className="receipt-rail-head"><ReceiptText size={18} /><span>Evidence receipt</span></div>{latestReceipt ? <LedgerStamp receipt={latestReceipt} /> : <div className="receipt-empty"><FileCheck2 size={24} /><strong>Receipts appear here.</strong><p>Complete a workflow action to see its irreversible record.</p></div>}<div className="receipt-rail-rule" /><div className="receipt-ledger-note"><span className="eyebrow">Ledger condition</span><strong>Append events. Derive balance.</strong><p>No delete or edit action is exposed for inventory events.</p></div></aside>{mobileOpen ? <button className="rail-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" /> : null}</div>;
}

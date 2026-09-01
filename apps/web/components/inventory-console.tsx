"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { inventoryCommand, inventoryRead } from "@/lib/inventory-api";
import { getSupabaseClient, hasSupabaseConfiguration } from "@/lib/supabase";

type Workflow = "receive" | "move" | "count";
type View = "dashboard" | "inventory" | "locations" | "counts" | "activity" | "magazines" | "reports";
type LoadState = "idle" | "loading" | "ready" | "error";

type Lot = {
  id: string;
  product_id: string;
  lot_code: string;
  operational_unit: string;
  status: string;
};

type Balance = {
  inventory_lot_id: string;
  product_id: string;
  location_id: string;
  unit: string;
  quantity: string;
};

type InventoryEvent = {
  id: string;
  event_type: string;
  inventory_lot_id: string;
  source_location_id: string | null;
  destination_location_id: string | null;
  quantity: string;
  unit: string;
  occurred_at: string;
  recorded_at: string;
  correction_of_event_id: string | null;
  reversal_of_event_id: string | null;
  reason: string | null;
};

type AuditEvent = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  outcome: string;
  created_at?: string;
};

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

const connectedNavigation: Array<{ id: View; label: string; detail: string }> = [
  { id: "dashboard", label: "Dashboard", detail: "Live readiness" },
  { id: "inventory", label: "Inventory", detail: "Commands & balances" },
  { id: "locations", label: "Locations", detail: "Balance locations" },
  { id: "counts", label: "Physical counts", detail: "Observed quantity" },
  { id: "activity", label: "Activity", detail: "Ledger & audit" },
];

const unavailableNavigation: Array<{ id: View; label: string; detail: string }> = [
  { id: "magazines", label: "Magazines", detail: "Not connected" },
  { id: "reports", label: "Reports", detail: "Coming later" },
];

function uniqueKey(): string {
  return crypto.randomUUID();
}

function utcNow(): string {
  return new Date().toISOString();
}

function shortId(value: string | null | undefined): string {
  return value ? `${value.slice(0, 8)}…${value.slice(-4)}` : "—";
}

function responseMessage(payload: unknown): string {
  if (typeof payload === "object" && payload !== null && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "object" && detail !== null && "message" in detail) {
      return String(detail.message);
    }
    if (typeof detail === "string") {
      return detail;
    }
  }
  return "The API returned a response.";
}

function asRecords<T>(payload: unknown): T[] {
  return Array.isArray(payload) ? (payload as T[]) : [];
}

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "Recorded time unavailable";
  }
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString();
}

function Label({ children, tone = "connected" }: { children: React.ReactNode; tone?: "connected" | "demo" | "blocked" }) {
  return <span className={`status-label ${tone}`}>{children}</span>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><strong>{title}</strong><p>{copy}</p></div>;
}

export function InventoryConsole() {
  const [view, setView] = useState<View>("dashboard");
  const [workflow, setWorkflow] = useState<Workflow>("receive");
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadMessage, setLoadMessage] = useState("Choose an authorized organization context to load live records.");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const configured = useMemo(() => hasSupabaseConfiguration(), []);
  const authenticated = Boolean(sessionEmail);

  const update = (name: keyof typeof INITIAL_FORM, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const refreshLiveData = useCallback(async () => {
    if (!configured) {
      setLoadState("idle");
      setLoadMessage("Configuration required. Add the web and API environment variables described in the README.");
      return;
    }
    if (!authenticated) {
      setLoadState("idle");
      setLoadMessage("Sign in with Supabase before PyroLedger requests server-authoritative records.");
      return;
    }
    if (!form.organizationId.trim()) {
      setLoadState("idle");
      setLoadMessage("Enter an authorized organization UUID. The API will independently confirm membership and permissions.");
      return;
    }

    setLoadState("loading");
    setLoadMessage("Loading tenant-scoped records from the API…");
    try {
      const [lotsResult, balancesResult, eventsResult, auditResult] = await Promise.all([
        inventoryRead("/v1/inventory/lots", form.organizationId),
        inventoryRead("/v1/inventory/balances", form.organizationId),
        inventoryRead("/v1/inventory/events", form.organizationId),
        inventoryRead("/v1/inventory/audit-events", form.organizationId),
      ]);
      const responses = [lotsResult, balancesResult, eventsResult, auditResult];
      const firstFailure = responses.find((result) => result.status < 200 || result.status >= 300);
      if (firstFailure) {
        throw new Error(`API request rejected (${firstFailure.status}). ${responseMessage(firstFailure.payload)}`);
      }
      setLots(asRecords<Lot>(lotsResult.payload));
      setBalances(asRecords<Balance>(balancesResult.payload));
      setEvents(asRecords<InventoryEvent>(eventsResult.payload));
      setAuditEvents(asRecords<AuditEvent>(auditResult.payload));
      setLoadState("ready");
      setLoadMessage("Live tenant-scoped records loaded from the FastAPI Inventory Core.");
    } catch (error) {
      setLots([]);
      setBalances([]);
      setEvents([]);
      setAuditEvents([]);
      setLoadState("error");
      setLoadMessage(error instanceof Error ? error.message : "The live inventory request could not be completed.");
    }
  }, [authenticated, configured, form.organizationId]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }
    void client.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user.email ?? null));
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void refreshLiveData();
  }, [refreshLiveData]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client) {
      setNotice("Supabase configuration is required before an operator can sign in.");
      return;
    }
    setSigningIn(true);
    setNotice(null);
    const { error } = await client.auth.signInWithPassword({ email: signInEmail, password: signInPassword });
    setSigningIn(false);
    if (error) {
      setNotice(`Sign in rejected. ${error.message}`);
      return;
    }
    setSignInPassword("");
    setNotice("Supabase session established. Add an authorized organization context to load API records.");
  };

  const signOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setSessionEmail(null);
    setLots([]);
    setBalances([]);
    setEvents([]);
    setAuditEvents([]);
    setNotice("Signed out. No further inventory requests will be sent from this browser session.");
  };

  const submitCommand = async (event: FormEvent<HTMLFormElement>) => {
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
          lines: [{
            inventory_lot_id: form.lotId,
            observed_quantity: form.observedQuantity,
            unit: form.unit,
            note: form.reason || undefined,
          }],
        };
      }

      const result = await inventoryCommand(path, form.organizationId, idempotencyKey, body);
      if (result.status >= 200 && result.status < 300) {
        const action = workflow === "count" ? "Physical count recorded" : workflow === "move" ? "Movement accepted" : "Receipt accepted";
        setNotice(`${action}. API status ${result.status}; idempotency key ${idempotencyKey}.`);
        await refreshLiveData();
      } else {
        setNotice(`Command rejected (${result.status}). ${responseMessage(result.payload)}`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The command could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  const locationBalances = useMemo(() => {
    const grouped = new Map<string, Balance[]>();
    balances.forEach((balance) => {
      const current = grouped.get(balance.location_id) ?? [];
      grouped.set(balance.location_id, [...current, balance]);
    });
    return Array.from(grouped.entries());
  }, [balances]);

  const renderDashboard = () => (
    <section className="content-grid dashboard-grid">
      <article className="intro-card">
        <p className="eyebrow">Integration demo / authoritative boundary</p>
        <h1>One field desk.<br /><em>One source of truth.</em></h1>
        <p>PyroLedger is assembled around the existing FastAPI Inventory Core. Browser state can request, display, and explain records; it does not become an inventory ledger.</p>
        <div className="intro-actions">
          <button className="primary-button" onClick={() => setView("inventory")}>Open inventory desk <span>↗</span></button>
          <button className="quiet-button" onClick={() => setView("activity")}>View event trail</button>
        </div>
      </article>
      <aside className="system-card">
        <div className="system-card-head"><p className="eyebrow">Runtime status</p><Label tone={loadState === "ready" ? "connected" : loadState === "error" ? "blocked" : "demo"}>{loadState === "ready" ? "Connected" : loadState === "error" ? "Attention" : "Awaiting setup"}</Label></div>
        <dl className="system-list">
          <div><dt>Identity</dt><dd>{sessionEmail ?? "No active Supabase session"}</dd></div>
          <div><dt>Tenant scope</dt><dd>{form.organizationId ? shortId(form.organizationId) : "Not selected"}</dd></div>
          <div><dt>Inventory authority</dt><dd>FastAPI event ledger</dd></div>
          <div><dt>Current request state</dt><dd>{loadMessage}</dd></div>
        </dl>
      </aside>
      <div className="metric-row">
        <Metric label="Inventory lots" value={loadState === "ready" ? String(lots.length) : "—"} copy="API-backed tenant records" />
        <Metric label="Balance lines" value={loadState === "ready" ? String(balances.length) : "—"} copy="Ledger-derived, never browser-set" />
        <Metric label="Recent events" value={loadState === "ready" ? String(events.length) : "—"} copy="Append-only activity read" />
        <Metric label="Audit records" value={loadState === "ready" ? String(auditEvents.length) : "—"} copy="Tenant-scoped audit trail" />
      </div>
      {!configured ? <SetupCard kind="config" /> : !authenticated ? <SetupCard kind="sign-in" onSignIn={handleSignIn} email={signInEmail} password={signInPassword} setEmail={setSignInEmail} setPassword={setSignInPassword} signingIn={signingIn} /> : <ReadinessCard organizationId={form.organizationId} onOrganizationChange={(value) => update("organizationId", value)} onRefresh={() => void refreshLiveData()} loadState={loadState} />}
    </section>
  );

  const renderInventory = () => (
    <section className="content-grid inventory-grid">
      <section className="page-heading"><div><p className="eyebrow">Connected workflow / inventory core</p><h1>Inventory desk</h1><p>Submit only the commands currently connected to the server-authoritative ledger. A fresh idempotency key is supplied for every request.</p></div><button className="refresh-button" onClick={() => void refreshLiveData()} disabled={loadState === "loading"}>{loadState === "loading" ? "Refreshing…" : "Refresh live records"}</button></section>
      <section className="command-panel">
        <div className="workflow-tabs" role="tablist" aria-label="Connected inventory workflows">
          {(["receive", "move", "count"] as Workflow[]).map((candidate) => <button className={workflow === candidate ? "selected" : ""} key={candidate} onClick={() => setWorkflow(candidate)} role="tab" type="button">{candidate === "receive" ? "Receive" : candidate === "move" ? "Move" : "Physical count"}</button>)}
        </div>
        <form onSubmit={submitCommand} className="command-form">
          <div className="form-title"><p className="eyebrow"><Label>Connected</Label> Server-authoritative command</p><h2>{workflow === "receive" ? "Receive into custody" : workflow === "move" ? "Move between locations" : "Record observed quantity"}</h2><p>{workflow === "count" ? "The API records the observation and creates a variance when appropriate. It does not overwrite ledger custody." : "The API resolves tenant scope, permission, unit, and inventory integrity before accepting a new immutable event."}</p></div>
          <label>Authorized organization UUID<input required value={form.organizationId} onChange={(event) => update("organizationId", event.target.value)} placeholder="Organization context requested of API" /></label>
          {workflow !== "count" && <label>Product UUID<input required value={form.productId} onChange={(event) => update("productId", event.target.value)} placeholder="Authoritative product UUID" /></label>}
          <label>Inventory lot UUID<input required value={form.lotId} onChange={(event) => update("lotId", event.target.value)} placeholder="Authoritative lot UUID" /></label>
          {workflow !== "receive" && <label>Source or counted location UUID<input required value={form.sourceLocationId} onChange={(event) => update("sourceLocationId", event.target.value)} placeholder={workflow === "move" ? "Current custody location UUID" : "Location observed in the count"} /></label>}
          {workflow !== "count" && <label>Destination location UUID<input required value={form.destinationLocationId} onChange={(event) => update("destinationLocationId", event.target.value)} placeholder="Receiving or destination location UUID" /></label>}
          <div className="form-row">
            <label>{workflow === "count" ? "Observed quantity" : "Quantity"}<input required min={workflow === "count" ? "0" : "0.0001"} step="0.0001" type="number" value={workflow === "count" ? form.observedQuantity : form.quantity} onChange={(event) => update(workflow === "count" ? "observedQuantity" : "quantity", event.target.value)} placeholder="0.0000" /></label>
            <label>Operational unit<select value={form.unit} onChange={(event) => update("unit", event.target.value)}><option>EACH</option><option>PACKAGE</option><option>CASE</option><option>POUND</option><option>KILOGRAM</option></select></label>
          </div>
          <label>Reason or field note<textarea value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="Optional operational context; never a replacement for source evidence." rows={3} /></label>
          <button className="primary-button submit" disabled={submitting || !configured || !authenticated} type="submit">{submitting ? "Sending API request…" : workflow === "count" ? "Record physical count" : "Submit append-only command"}<span>↗</span></button>
          {(!configured || !authenticated) && <p className="form-guard">{!configured ? "Not connected: configure Supabase and API environment variables first." : "Not connected: sign in with an authorized Supabase user before submitting."}</p>}
        </form>
      </section>
      <section className="read-panel">
        <PanelHeader eyebrow="Live inventory" title="Ledger-derived balances" action={<button className="text-action" onClick={() => setView("locations")}>Locations ↗</button>} />
        {loadState === "ready" && balances.length > 0 ? <div className="data-table balance-table"><div className="data-row table-head"><span>Lot</span><span>Location</span><span>Quantity</span></div>{balances.map((balance) => <div className="data-row" key={`${balance.inventory_lot_id}-${balance.location_id}-${balance.unit}`}><span><strong>{shortId(balance.inventory_lot_id)}</strong><small>{balance.unit}</small></span><span>{shortId(balance.location_id)}</span><span className="numeric">{balance.quantity}</span></div>)}</div> : <EmptyState title="No live balances displayed" copy={loadState === "error" ? loadMessage : "Load an authorized organization to read ledger-derived balances. This panel never derives an alternate browser balance."} />}
      </section>
    </section>
  );

  const renderLocations = () => (
    <section className="content-grid">
      <section className="page-heading"><div><p className="eyebrow">Connected view / derived grouping</p><h1>Locations</h1><p>This view groups API-returned balance lines by location ID. It does not create, update, or calculate inventory locations in the browser.</p></div><button className="refresh-button" onClick={() => void refreshLiveData()}>Refresh</button></section>
      <section className="read-panel full-span"><PanelHeader eyebrow="Live API response" title="Locations with returned balance lines" />{loadState === "ready" && locationBalances.length > 0 ? <div className="location-grid">{locationBalances.map(([locationId, locationLines]) => <article className="location-card" key={locationId}><Label>Connected</Label><h3>{shortId(locationId)}</h3><p>{locationLines.length} returned balance line{locationLines.length === 1 ? "" : "s"}</p><div>{locationLines.map((line) => <span key={`${line.inventory_lot_id}-${line.unit}`}>{shortId(line.inventory_lot_id)} <strong>{line.quantity} {line.unit}</strong></span>)}</div></article>)}</div> : <EmptyState title="No locations to display" copy="The current API has no standalone location-list endpoint. This connected view appears only when the balances endpoint returns location-scoped records." />}</section>
    </section>
  );

  const renderCounts = () => (
    <section className="content-grid">
      <section className="page-heading"><div><p className="eyebrow">Connected workflow / reconciliation</p><h1>Physical counts</h1><p>Record an observed quantity through the Inventory Core. The API compares it to the event ledger and may create a variance; it does not rewrite current inventory.</p></div><button className="primary-button" onClick={() => { setWorkflow("count"); setView("inventory"); }}>Open count form <span>↗</span></button></section>
      <section className="principle-grid"><Principle number="01" title="Observed, not overwritten" copy="Physical counts are distinct records. A value typed in the browser cannot become an on-hand balance." /><Principle number="02" title="Variance is explicit" copy="When observation differs from the ledger projection, the API returns an explicit variance record." /><Principle number="03" title="Resolution held back" copy="Variance-resolution adjustment UI is not exposed until exact resolution behavior has hardening evidence." /></section>
      <section className="read-panel full-span"><PanelHeader eyebrow="Audit evidence" title="Physical-count activity remains separate from the ledger" />{loadState === "ready" && auditEvents.some((event) => event.action.startsWith("physical_inventory") || event.action.startsWith("inventory_variance")) ? <div className="data-table"><div className="data-row table-head audit-row"><span>Action</span><span>Target</span><span>Outcome</span></div>{auditEvents.filter((event) => event.action.startsWith("physical_inventory") || event.action.startsWith("inventory_variance")).map((event) => <div className="data-row audit-row" key={event.id}><span><strong>{event.action}</strong><small>{shortId(event.id)}</small></span><span>{event.target_type} · {shortId(event.target_id)}</span><span><Label tone={event.outcome === "accepted" ? "connected" : "demo"}>{event.outcome}</Label></span></div>)}</div> : <EmptyState title="No physical-count audit records loaded" copy="After an authenticated physical-count submission, refresh Activity to inspect the separate observation and audit records returned by the API." />}</section>
    </section>
  );

  const renderActivity = () => (
    <section className="content-grid">
      <section className="page-heading"><div><p className="eyebrow">Connected view / reviewable history</p><h1>Activity</h1><p>Inventory events and audit events are requested independently from the API and displayed as received. No local event creation or history editing is available.</p></div><button className="refresh-button" onClick={() => void refreshLiveData()} disabled={loadState === "loading"}>{loadState === "loading" ? "Refreshing…" : "Refresh activity"}</button></section>
      <section className="read-panel full-span"><PanelHeader eyebrow="Append-only inventory events" title="Recent ledger events" />{loadState === "ready" && events.length > 0 ? <EventTable events={events} /> : <EmptyState title="No inventory events loaded" copy={loadState === "error" ? loadMessage : "Use an authorized organization context to read tenant-scoped event history."} />}</section>
      <section className="read-panel full-span"><PanelHeader eyebrow="Audit events" title="Command and reconciliation evidence" />{loadState === "ready" && auditEvents.length > 0 ? <div className="data-table"><div className="data-row table-head audit-row"><span>Action</span><span>Target</span><span>Outcome</span></div>{auditEvents.map((event) => <div className="data-row audit-row" key={event.id}><span><strong>{event.action}</strong><small>{formatTimestamp(event.created_at)}</small></span><span>{event.target_type} · {shortId(event.target_id)}</span><span><Label tone={event.outcome === "accepted" ? "connected" : "demo"}>{event.outcome}</Label></span></div>)}</div> : <EmptyState title="No audit records loaded" copy="Audit history requires the same authorized organization context and the audit.read permission." />}</section>
    </section>
  );

  const renderUnavailable = (title: string, copy: string) => (
    <section className="unavailable-page"><Label tone="blocked">Not connected</Label><p className="eyebrow">Preserved scope boundary</p><h1>{title}</h1><p>{copy}</p><div className="unavailable-note"><strong>No demo records are shown here.</strong><span>The integration branch keeps unimplemented operational workflows visibly unavailable instead of using fictional inventory, compliance, or regulatory data.</span></div><button className="quiet-button back-button" onClick={() => setView("dashboard")}>Return to connected overview</button></section>
  );

  const content = view === "dashboard" ? renderDashboard() : view === "inventory" ? renderInventory() : view === "locations" ? renderLocations() : view === "counts" ? renderCounts() : view === "activity" ? renderActivity() : view === "magazines" ? renderUnavailable("Magazine workflows are not connected.", "Magazine management and inspection workflows are preserved as an explicit future scope. They have no server-authoritative API flow in this integration demo.") : renderUnavailable("Reports are coming later.", "The current Inventory Core provides ledger and audit reads, but no approved reports or exports workflow. This branch does not simulate reports from browser data.");

  return (
    <main className="app-shell">
      <aside className="app-sidebar" aria-label="Primary navigation">
        <button className="brand" onClick={() => setView("dashboard")}><span className="brand-mark"><i /><i /><i /></span><span><strong>PyroLedger</strong><small>Integration demo</small></span></button>
        <div className="sidebar-group"><p>Workspace</p>{connectedNavigation.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.label}</span><small>{item.detail}</small></button>)}</div>
        <div className="sidebar-group deferred"><p>Unconnected</p>{unavailableNavigation.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><span>{item.label}</span><small>{item.detail}</small></button>)}</div>
        <div className="sidebar-footer"><Label tone={authenticated && configured ? "connected" : "demo"}>{authenticated && configured ? "Session available" : "Setup required"}</Label><p>{authenticated ? sessionEmail : "No identity is assumed."}</p></div>
      </aside>

      <section className="application-area">
        <header className="topbar"><div><span className="breadcrumb">PyroLedger / {view}</span><p>{configured ? authenticated ? "Authenticated access must still pass server-side membership and RBAC." : "Supabase authentication is required for live API access." : "Environment configuration has not been supplied."}</p></div><div className="topbar-actions">{authenticated ? <button className="quiet-button" onClick={() => void signOut()}>Sign out</button> : <button className="quiet-button" onClick={() => setView("dashboard")}>Sign in</button>}<Label tone={configured ? "connected" : "blocked"}>{configured ? "API configured" : "Not connected"}</Label></div></header>
        {notice && <div className="notice" role="status"><span>System note</span><p>{notice}</p><button onClick={() => setNotice(null)} aria-label="Dismiss system note">×</button></div>}
        <div className="content-frame">{content}</div>
      </section>
    </main>
  );
}

function Metric({ label, value, copy }: { label: string; value: string; copy: string }) {
  return <article className="metric"><p>{label}</p><strong>{value}</strong><span>{copy}</span></article>;
}

function Principle({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="principle"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>;
}

function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className="panel-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</header>;
}

function EventTable({ events }: { events: InventoryEvent[] }) {
  return <div className="data-table"><div className="data-row table-head event-row"><span>Event</span><span>Route</span><span>Quantity</span><span>Recorded</span></div>{events.map((event) => <div className="data-row event-row" key={event.id}><span><strong>{event.event_type}</strong><small>{shortId(event.id)}</small></span><span>{shortId(event.source_location_id)} → {shortId(event.destination_location_id)}</span><span className="numeric">{event.quantity} {event.unit}</span><span>{formatTimestamp(event.recorded_at)}</span></div>)}</div>;
}

function ReadinessCard({ organizationId, onOrganizationChange, onRefresh, loadState }: { organizationId: string; onOrganizationChange: (value: string) => void; onRefresh: () => void; loadState: LoadState }) {
  return <section className="readiness-card"><div><p className="eyebrow">Authorized tenant context</p><h2>Request live records.</h2><p>The organization ID below is only a request context. The API independently resolves the signed-in operator’s active membership, permissions, and tenant scope.</p></div><div className="readiness-action"><label>Organization UUID<input value={organizationId} onChange={(event) => onOrganizationChange(event.target.value)} placeholder="Paste authorized organization UUID" /></label><button className="primary-button" onClick={onRefresh} disabled={!organizationId || loadState === "loading"}>{loadState === "loading" ? "Loading records…" : "Load live records"}<span>↗</span></button></div></section>;
}

function SetupCard({ kind, onSignIn, email, password, setEmail, setPassword, signingIn }: { kind: "config" | "sign-in"; onSignIn?: (event: FormEvent<HTMLFormElement>) => void; email?: string; password?: string; setEmail?: (value: string) => void; setPassword?: (value: string) => void; signingIn?: boolean }) {
  if (kind === "config") {
    return <section className="setup-card"><Label tone="blocked">Not connected</Label><p className="eyebrow">Runtime configuration</p><h2>Configure the trusted boundary first.</h2><p>Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_BASE_URL` to `apps/web/.env.local`; configure the API’s PostgreSQL, issuer, JWKS, and CORS variables in `apps/api/.env`.</p><code>See README.md → Configure PostgreSQL and Environment Files</code></section>;
  }
  return <section className="setup-card sign-in-card"><div><Label tone="demo">Authentication required</Label><p className="eyebrow">Authorized operator session</p><h2>Sign in before loading inventory.</h2><p>The browser session is issued by Supabase. PyroLedger then checks organization membership and permissions on every API call.</p></div><form onSubmit={onSignIn}><label>Email<input required type="email" value={email} onChange={(event) => setEmail?.(event.target.value)} placeholder="operator@example.com" /></label><label>Password<input required type="password" value={password} onChange={(event) => setPassword?.(event.target.value)} placeholder="Your Supabase password" /></label><button className="primary-button" disabled={signingIn} type="submit">{signingIn ? "Signing in…" : "Sign in to Supabase"}<span>↗</span></button></form></section>;
}

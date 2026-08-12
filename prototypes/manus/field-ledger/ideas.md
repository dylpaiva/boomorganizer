# PyroLedger Prototype Design Directions

## Three Initial Directions

### Field Ledger

**Very Brief Intro:** A calm operational console that combines paper-ledger clarity with a rugged, nighttime field-device character. It favors decision-grade density, strong scan affordances, and visible provenance over decorative dashboard effects.

**Probability:** 0.07

### Signal Cabin

**Very Brief Intro:** A warm, print-inspired control room with cream stock, muted inks, and stamped verification states. It makes regulated work feel deliberate and legible, like a modernized dispatch binder.

**Probability:** 0.03

### Evidence Grid

**Very Brief Intro:** A high-contrast analytical workspace with bright surfaces, thin technical rules, and a data-dominant cadence. It behaves like an inspector’s traceable evidence board rather than a conventional SaaS dashboard.

**Probability:** 0.09

## Chosen Direction: Field Ledger

### Design Movement

Field Ledger combines **industrial field instrumentation** with the **Swiss-style operational record**. It is a composed, high-density system designed for fast action during a handoff while retaining the provenance cues of a signed logbook.

### Core Principles

1. **Action before analysis:** Every surface prioritizes the immediate next custody action or exception decision.
2. **Provenance is visual:** Immutable event identifiers, timestamps, actors, and relationship links are continuously visible rather than hidden in a history drawer.
3. **Safety through hierarchy:** Warnings appear as bounded, plain-language decisions with a clear stop/go consequence rather than ambient alarm noise.
4. **Field-ready restraint:** The interface is useful in a dim magazine doorway, on a phone, or at a dispatch desk; ornament never competes with legibility.

### Color Philosophy

The base is **carbon black and weathered ink blue** to soften glare and communicate controlled operations. An **owned ignition amber** is reserved for scans, active custody, and actions requiring attention; it should read as a tool indicator, not a decoration. A weathered parchment white gives evidence records an archival, export-friendly surface. Safety states use restrained green, rose, and slate rather than a spectrum of competing alerts.

### Layout Paradigm

The application uses a **command rail + evidence canvas** rather than a centered grid. On wide screens, the left rail acts as the current operational context; the center canvas is the active workflow; the right edge is a persistent event receipt when a state changes. On narrow screens, the command rail becomes a compact context strip and tasks move through full-height, thumb-first panels.

### Signature Elements

1. A thin **amber custody thread** joins the active action, current custody state, and latest irreversible receipt.
2. **Ledger stamps** show event numbers, synchronization state, and export readiness using monospace type and outline rules.
3. **Field cards** pair a tactile dark header band with a pale evidence body, allowing dense records to remain scannable.

### Interaction Philosophy

Every operational change is an explicit, two-step commit that produces a receipt. Scan input is first-class and accepts synthetic scanner text or a device keyboard. Destructive language is avoided; corrections and reversals are modeled as new events that point back to their original event. Offline actions are queued locally, marked visibly, and sync only when the user requests it in this static prototype.

### Animation

Interactions use brief, physical transitions: action sheets rise over 220ms with `cubic-bezier(0.23, 1, 0.32, 1)`; receipt stamps fade and settle from 95% scale over 180ms; custody thread indicators shift only through transform and opacity. Scan success receives a quick amber pulse. Motion is removed under `prefers-reduced-motion` and never delays keyboard-first interaction.

### Typography System

**Barlow Condensed** is used for operational labels, large status numerals, and route names; it creates an instrument-panel hierarchy. **IBM Plex Sans** handles all instructional and audit prose for legibility. **IBM Plex Mono** identifies event IDs, scans, timestamps, manifest references, and export records. Large headings are condensed and left-aligned; no type is centered by default.

### Brand Essence

**A scan-first evidence ledger for pyrotechnics teams that need to move material quickly without losing the chain of custody.**

Personality: **disciplined, candid, field-capable**.

### Brand Voice

Headlines are imperative and factual; calls to action use physical operations language; microcopy names a consequence before an action. Examples: “**Confirm the handoff, then issue the receipt.**” and “**Count what is present. Explain what is not.**” Generic welcome language and vague productivity claims are prohibited.

### Wordmark & Logo

The mark is a **three-strand ledger spark**: three angular amber paths converge into a single white evidence line. It has no text, works as an app icon, and references controlled ignition without depicting a firework or explosive.

### Signature Brand Color

**Ignition Amber — `#F7A629`**. This is exclusively used to mark present operational attention, scan-ready controls, and the active custody thread.

## Style Decisions

- Field Ledger pages prioritize an active custody task and its receipt consequence above a marketing-style hero composition.
- The ignition amber custody thread must visibly connect the current action, custody projection, and latest receipt across the primary canvas.
- Every primary evidence card exposes at least one provenance cue, such as event ID, timestamp, lot reference, actor, sync state, or export state.

# ADR-001: Repository Architecture

**Status:** Accepted  
**Date:** 2026-08-12

## Context

PyroLedger has specification, design, prototype, review, integration, and production responsibilities that must not be conflated.

## Decision

Use dedicated branch responsibilities:

- `docs/chatgpt` — product requirements, regulatory analysis, architecture, database/API/security specifications, ADRs.
- `design/figma` — design system and UX specification.
- `prototype/v0` — UI experimentation.
- `prototype/manus` — rapid workflow prototypes.
- `review/claude` — security, architecture, and code-review findings.
- `develop` — integration.
- `main` — stable/production.

The currently existing legacy branches (`Chat`, `Claude`, `Figma`, `Manus`, `V0`) are preserved rather than deleted during initialization. Prototype branches do not become authoritative architecture automatically.

## Consequences

Documentation can evolve independently from implementation. Prototypes can be evaluated without becoming production architecture. Production changes flow through review/integration rather than directly from experimental branches.

## Open issue

**DECISION REQUIRED:** Determine whether legacy branch aliases should later be renamed/deprecated after their contents are reviewed.

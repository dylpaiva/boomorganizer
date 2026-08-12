# ADR-007: PWA-First Strategy

**Status:** Accepted  
**Date:** 2026-08-12

## Context

PyroLedger is field-heavy and must work well on mobile devices while retaining desktop administrative workflows. The product also requires offline operation.

## Decision

Adopt a PWA-first web architecture using Next.js/React/TypeScript. The client should support installable/mobile-friendly behavior, offline-capable workflows, and responsive layouts while sharing the same domain APIs used by desktop users.

Native mobile applications are not part of the initial production architecture unless a documented requirement demonstrates that the PWA cannot satisfy an operational or device capability need.

## Consequences

The product has one primary frontend stack and can iterate quickly across mobile and desktop. Offline storage, service-worker behavior, secure update handling, and device compatibility become explicit engineering concerns.

## Implementation gate

**DECISION REQUIRED:** Define supported device/browser matrix, offline storage limits, service-worker update strategy, and requirements for camera/barcode capabilities if introduced.

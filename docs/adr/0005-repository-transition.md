# ADR 0005: Transition incrementally to an application workspace

- Status: Accepted
- Date: 2026-08-30

## Context

The existing Vite dashboard builds and passes its current checks. The target architecture introduces a web application, API, shared contracts, domain code, and database package. Moving every file while adding persistence would produce a large change that is difficult to review.

## Decision

Keep the current frontend at the repository root for the first API read slice. Add the API and shared packages with minimal workspace configuration. Move the frontend into `apps/web` in a later mechanical change after the API integration is stable.

Each transition step must leave documented development, test, and build commands working.

## Consequences

- The first persistence change remains focused.
- The repository temporarily has an asymmetric layout.
- Import paths and deployment configuration are changed once, in a separate reviewed step.
- CI must continue to run the existing frontend checks throughout the transition.

## Alternatives considered

### Move the frontend immediately

Rejected because it would mix file movement, package configuration, and behavioral changes in the same initial implementation.


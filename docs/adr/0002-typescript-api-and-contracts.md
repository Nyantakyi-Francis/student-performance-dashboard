# ADR 0002: Use TypeScript for the web application, API, and contracts

- Status: Accepted
- Date: 2026-08-30

## Context

The current React application is written in JavaScript. The next version adds an API with many domain states and external data boundaries. Shared compile-time types can reduce accidental contract drift, but compile-time checking cannot validate HTTP bodies or uploaded files.

## Decision

Migrate the React application to TypeScript and build the API in TypeScript. Define runtime schemas for API requests, responses, environment variables, and import rows. Infer static types from those schemas where practical.

The API contract remains an explicit public artifact. Sharing TypeScript source is not a substitute for documenting HTTP behavior.

## Consequences

- Refactoring entity shapes becomes safer.
- Frontend and backend can share validated contract definitions.
- Runtime schemas add work but protect untrusted boundaries.
- Migration will be incremental and must not combine broad renaming with behavior changes.

## Alternatives considered

### Continue with JavaScript

Rejected because the expanded domain and API contracts would rely too heavily on tests and developer memory for shape safety.

### Use TypeScript types without runtime validation

Rejected because network requests, environment variables, and spreadsheet rows are untyped at runtime.


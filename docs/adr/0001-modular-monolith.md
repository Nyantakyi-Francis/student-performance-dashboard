# ADR 0001: Use a modular monolith

- Status: Accepted
- Date: 2026-08-30

## Context

The project needs a web application, API, database access, domain calculations, imports, and later background jobs. It has one maintainer and no measured scaling constraint that requires independent services.

## Decision

Use a modular monolith with explicit modules for identity, academics, assessments, grading, imports, reporting, and auditing. Deploy one API service and add a worker process from the same codebase when background processing is needed.

## Consequences

- Transactions and local development remain straightforward.
- Module boundaries can be tested without network calls.
- The deployment has fewer operational failure modes.
- Modules must not bypass each other's public application interfaces merely because they share a process.
- A service may be extracted later only when scaling, reliability, security, or team ownership provides measured justification.

## Alternatives considered

### Microservices

Rejected for the initial system. They would add network contracts, distributed tracing, deployment coordination, and data-consistency problems without solving a current constraint.

### Frontend-only application

Rejected because browser storage cannot enforce multi-user authorization, durable audit history, tenant isolation, or shared persistence.


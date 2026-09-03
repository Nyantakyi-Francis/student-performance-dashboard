# ADR 0003: Use PostgreSQL with version-controlled SQL migrations

- Status: Accepted
- Date: 2026-08-30

## Context

The academic model contains relationships, uniqueness rules, publication history, imports, and audit events. Important mutations need transactions. The portfolio should expose the schema and migration history clearly.

## Decision

Use PostgreSQL as the system of record. Use Drizzle for typed queries and schema definitions while retaining reviewable, version-controlled SQL migrations.

Database constraints will enforce referential integrity and safe invariants. Domain rules that depend on several records or policy interpretation remain in the application layer.

## Consequences

- Relational constraints and transactions fit the domain.
- SQL remains inspectable in code review.
- Local and CI environments need PostgreSQL.
- Migrations must be tested from an empty database and against the previous release state.
- Queries must always include tenant scope after multi-school access is introduced.

## Alternatives considered

### Browser `localStorage`

Rejected as the source of truth because it is device-local, user-controlled, difficult to migrate safely, and unable to enforce shared authorization.

### Document database

Rejected because the central data is relational and requires strong integrity across students, enrollments, assessments, and scores.

### Prisma

Viable, but not selected. Drizzle keeps generated SQL and schema behavior closer to the implementation, which is useful for demonstrating database reasoning in this project.


# Senior engineer portfolio feature roadmap

## Purpose

The current project is a capable client-side dashboard. It already supports student records, CSV and Excel import/export, filters, charts, term comparisons, browser persistence, and a small analytics test suite.

To demonstrate senior engineering ability, the project should become a dependable school analytics product rather than accumulate more charts. The strongest additions are the ones that show sound system design, explicit domain rules, data protection, operational discipline, and evidence that the application works under realistic conditions.

This document lists potential additions. The priorities identify what should be built first; building every item would be unnecessary.

## Current implementation status

Last updated: 2026-09-03

Work on the senior-engineer portfolio version has started. The repository now contains the first backend/API slice and supporting architecture documents, but the database-backed runtime is not configured yet.

### Completed

- Defined the version 1 product scope, users, workflows, non-goals, and portfolio success criteria.
- Documented the normalized academic domain model and its main integrity rules.
- Documented the target architecture, API boundary, security boundary, import workflow, and testing strategy.
- Recorded architecture decisions covering the modular monolith, TypeScript, PostgreSQL with Drizzle, session authentication, authorization, and the incremental repository transition.
- Added a TypeScript Fastify API workspace under `apps/api`.
- Added runtime environment validation with Zod.
- Added a PostgreSQL schema for schools, academic years, terms, grade levels, classes, subjects, students, enrollments, assessments, and scores.
- Generated the first SQL migration with constraints and foreign-key indexes.
- Added a database connection adapter and migration command.
- Added a health endpoint and the initial validated, cursor-paginated student endpoint.
- Added an idempotent synthetic-data seed script for the demo school, grade levels, classes, terms, subjects, students, assessments, and scores.
- Added a validated `GET /api/v1/dashboard-data` endpoint that reshapes persisted score records into the current dashboard format.
- Added a frontend API adapter for loading dashboard data from `GET /api/v1/dashboard-data`, with browser sample data as the fallback when the API is unavailable.
- Added API status messaging that describes whether data came from the API, returned empty, or fell back to browser sample data.
- Added API configuration and HTTP-contract tests.
- Confirmed that frontend tests, API tests, linting, type checking, the API build, and the frontend build pass.

### Selected but not configured

Supabase has been selected as the intended managed PostgreSQL provider. It fits the existing PostgreSQL and Drizzle design, so adopting it will not require replacing the Fastify API.

Supabase remains selected but not configured:

- no Supabase project has been created or linked;
- no Supabase credentials or connection strings have been added;
- the generated migration has not been applied to a live database;
- an idempotent synthetic seed script exists, but it has not been run against Supabase or another live PostgreSQL database;
- the student and dashboard-data endpoints have not been tested against PostgreSQL;
- the React dashboard can call the API, but the deployed/demo frontend still depends on browser-managed sample data unless an API and database are running behind it.

This is the deliberate stopping point. Supabase setup and database integration are deferred until work resumes.

### Resume point

Continue from this sequence:

1. Create a Supabase project for synthetic portfolio data.
2. Copy the direct PostgreSQL connection string into a local, uncommitted environment file.
3. Apply `apps/api/drizzle/0000_chunky_lockheed.sql` through the existing migration command.
4. Review the idempotent synthetic-data seed and adjust it if the demo dataset changes.
5. Run the seed against Supabase.
6. Add integration tests for `GET /api/v1/students` and `GET /api/v1/dashboard-data` against a test database.
7. Configure the running API to use the Supabase transaction-pooler connection string.
8. Point the React dashboard at the deployed API and verify loading, empty, fallback, and safe error states in a browser.
9. Update the README only after the live database-backed path is verified.

Do not place the database password or full connection string in the repository, frontend environment variables, screenshots, documentation, or chat history.

## Priority guide

- **P0:** Foundation work needed for a credible production-style application.
- **P1:** High-value work that demonstrates senior-level ownership.
- **P2:** Useful depth or differentiation after the core system is dependable.
- **P3:** Optional expansion that should only be added when it supports the intended portfolio story.

## Recommended portfolio scope

A strong version of this project would include the following vertical slice:

1. A typed frontend and documented backend API.
2. PostgreSQL persistence with schools, academic years, classes, enrollments, assessments, and scores.
3. Authentication and role-based access for administrators, teachers, students, and guardians.
4. A secure import workflow with preview, validation, duplicate detection, and an audit trail.
5. Configurable grading and risk rules, with transparent explanations of every flag.
6. Student and class reports, longitudinal trends, interventions, and PDF/CSV export.
7. Unit, integration, accessibility, and end-to-end tests in CI.
8. Observability, backup and restore procedures, deployment documentation, and measurable performance targets.

That scope is more persuasive than dozens of loosely connected interface features.

## 1. Domain model and academic structure

### P0: Replace flat records with a normalized academic model

The current model repeats a student's identity for each term. Introduce entities for:

- school and campus;
- academic year and term;
- grade level, class, and subject;
- student and guardian;
- teacher and teaching assignment;
- enrollment;
- assessment and assessment category;
- score, grade, attendance record, and intervention.

Use stable identifiers rather than matching students by lowercased name and grade. This prevents two students with the same name from being merged and allows a student to change classes or grades without losing history.

**Acceptance criteria**

- A student has one stable ID across terms and academic years.
- Enrollment history is separate from the student profile.
- Scores reference an assessment, subject, class, and enrollment.
- Referential integrity is enforced in the database.
- The schema and major relationships are documented with an entity-relationship diagram.

### P0: Model assessments instead of storing one score per subject

Support quizzes, assignments, projects, midterms, and final exams. Each assessment should have a date, maximum score, weight, category, subject, class, and publication state.

**Acceptance criteria**

- Teachers can create, edit, archive, and publish assessments.
- Raw points and percentages are stored without losing the original maximum score.
- Weighted totals are reproducible from recorded assessments.
- Changing a weighting rule triggers a controlled recalculation.

### P1: Configurable grading policies

Different schools use different pass marks, grade bands, category weights, rounding rules, and missing-work policies. Move the current hard-coded thresholds into versioned configuration.

Include:

- letter or descriptor bands;
- pass thresholds by school, grade, or subject;
- category weights;
- rules for excused, missing, incomplete, or late work;
- minimum evidence requirements before calculating a grade;
- effective dates and policy versions.

Every displayed grade should be traceable to the policy version used to calculate it.

### P1: Attendance and behavior context

Add daily attendance and optional behavior or engagement records. Correlation views may compare these variables with performance, but the interface must state that correlation does not prove causation.

### P2: Competency and standards tracking

Map assessments to curriculum standards or learning objectives. Show mastery by standard, evidence count, and last assessment date. This makes the product useful beyond term averages.

### P2: Promotion and completion workflows

Add end-of-year promotion, class transfer, withdrawal, graduation, and record-locking workflows. Preserve historical records after organizational changes.

## 2. Authentication, authorization, and tenancy

### P0: Authentication

Add secure sign-in, sign-out, session expiration, password reset, and verified email. If an external identity provider is used, document the decision and threat model.

**Acceptance criteria**

- Sessions use secure, HTTP-only cookies where applicable.
- Passwords are never stored or logged by the application.
- Authentication failures do not reveal whether an account exists.
- Rate limits protect login and reset endpoints.
- Sensitive actions can require recent reauthentication.

### P0: Role-based access control

Define permissions for at least:

- school administrator;
- teacher;
- student;
- guardian;
- read-only auditor or counselor.

Enforce permissions on the server, not only by hiding frontend controls.

**Examples**

- Teachers see only assigned classes unless given broader access.
- Students see only their own published results.
- Guardians see only linked students.
- Administrators manage users, policies, imports, and reporting periods.

### P0: School-level tenant isolation

If the product supports more than one school, every request must be scoped to a tenant. Add automated tests proving that records cannot cross school boundaries.

### P1: User provisioning and invitations

Support invitations, expiration, resend, deactivation, class assignment, and guardian-student linking. Record who granted or revoked access.

### P2: Single sign-on and multifactor authentication

Support an education-friendly identity provider or standards such as OpenID Connect. Add multifactor authentication for administrators and users with bulk export privileges.

## 3. Backend API and persistence

### P0: Server-backed persistence

Replace `localStorage` as the source of truth with a backend and PostgreSQL database. Browser storage can remain a cache or offline queue.

**Acceptance criteria**

- Data survives browser and device changes.
- Database migrations are version-controlled and repeatable.
- Seed data is clearly separated from production data.
- Writes use transactions where partial completion would corrupt state.
- Optimistic concurrency or version checks prevent silent overwrites.

### P0: Documented API contract

Provide an OpenAPI specification or an equivalent typed contract. Define request validation, response shapes, pagination, filtering, sorting, error codes, and idempotency behavior.

### P1: Query and caching strategy

Add server-side pagination and filtering for large schools. Prevent unbounded queries. Cache safe aggregate results and invalidate them when underlying scores change.

### P1: Background jobs

Move expensive tasks such as large imports, PDF generation, aggregate recalculation, and scheduled reports to a job queue.

**Acceptance criteria**

- Jobs have explicit states and progress.
- Retriable and permanent errors are distinguished.
- Repeated delivery does not create duplicate records.
- Administrators can inspect failed jobs without reading server logs.

### P2: Real-time updates

Use server-sent events or WebSockets for job progress and collaborative updates. Define conflict behavior before adding real-time editing.

## 4. Data import, validation, and interoperability

### P0: Import preview and column mapping

Before writing data, show:

- detected columns;
- proposed field mappings;
- valid, warning, and rejected row counts;
- normalized values;
- duplicates;
- sample errors with row numbers.

Require confirmation after preview. Do not silently convert invalid scores to zero.

### P0: Strict domain validation

Validate scores against the assessment maximum, allowed grade and term values, required identifiers, date ranges, and enrollment. Treat missing values separately from zero.

### P1: Duplicate detection and idempotent imports

Allow users to choose whether a duplicate should be skipped, updated, or reviewed. Compute an import fingerprint or accept an idempotency key so retrying the same file does not duplicate records.

### P1: Import audit trail and rollback

Store the original filename, uploader, timestamp, mapping, validation result, and affected records. Allow a permitted administrator to reverse an import safely.

### P1: Large-file processing

Stream or process large files in chunks. Show progress and allow the user to leave the page while processing continues.

### P2: Data templates and saved mappings

Support reusable templates for common school information systems. Version templates so a changed spreadsheet format does not break an older import.

### P2: Standards-based exchange

If the target market requires it, support an education data standard such as OneRoster. Treat this as a product decision, not a checkbox.

## 5. Analytics and decision support

### P0: Transparent metric definitions

Add a data dictionary explaining class average, pass rate, risk level, improvement, missing work, and unique student count. Show denominators, excluded data, rounding rules, time window, and last refresh time.

### P0: Explainable risk flags

Replace a single average threshold with configurable rules. A flag should explain its causes, for example declining mathematics scores across three assessments, two missing assignments, or attendance below a configured threshold.

Avoid presenting a risk score as a diagnosis. Include a human review state and document limitations.

### P1: Cohort and subgroup comparisons

Support comparisons by class, grade, subject, term, assessment, and selected demographic fields. Require minimum group sizes where disclosure could identify a student.

### P1: Longitudinal student profiles

Show performance across academic years, subject trajectories, assessment history, attendance, interventions, and teacher notes. Mark changes in curriculum, grading policy, and class placement on the timeline.

### P1: Distribution and data-quality views

Add score distributions, median, quartiles, range, standard deviation, missing-data rate, and outlier review. Averages alone can hide uneven performance.

### P1: Assessment analysis

Include:

- item or question analysis when item-level data exists;
- difficulty and discrimination indicators;
- comparison across classes with adequate sample sizes;
- completion and missing-response rates;
- assessment reliability only when the data and assumptions support it.

### P1: Saved reports and drill-down

Let users save a filter configuration, open a chart segment to see its underlying records, and share a stable report link subject to authorization.

### P2: Intervention tracking

Create interventions with an owner, reason, start date, review date, notes, and outcome. Link the intervention to the evidence that prompted it and record whether a teacher accepted or dismissed an automated flag.

### P2: Goals and progress monitoring

Allow a teacher and student to define a measurable target and review progress against it. Retain the baseline and history rather than overwriting the goal.

### P2: Forecasting with safeguards

If forecasting is included, use a documented baseline model, confidence intervals, drift monitoring, subgroup evaluation, and a model card. Compare it with a simple rule-based baseline. Do not use predictive output for automatic punitive action.

### P3: Natural-language summaries

Generate draft summaries from verified metrics. Require citations back to dashboard values, protect student data, and keep a human approval step before sending a report.

## 6. Reporting and communication

### P1: Student report cards

Generate accessible HTML and print-ready PDF reports with grades, attendance, comments, grading-policy version, issue date, and school identity. PDFs should have stable pagination and selectable text.

### P1: Class and subject reports

Create reusable reports for class performance, assessment outcomes, students needing review, and missing work. Include filter context and metric definitions in every export.

### P1: Scheduled reports

Let authorized users schedule reports, select recipients, preview the contents, and see delivery status. Avoid putting sensitive student data in email bodies when a secure link is appropriate.

### P2: Parent and student portal

Provide published results, teacher comments, attendance, downloadable reports, and acknowledgement status. Separate draft and published data clearly.

### P2: Notification preferences

Support in-app and email notifications with per-user preferences, quiet hours, deduplication, and delivery logs. SMS should be added only with clear consent and cost controls.

## 7. Teacher and administrator workflows

### P0: Gradebook workflow

Add class rosters, bulk score entry, keyboard navigation, autosave status, unsaved-change protection, and assessment publication. Teachers should be able to mark a score missing, excused, or incomplete without converting it to zero.

### P1: Approval and locking

Support draft, submitted, approved, published, amended, and locked states. Record who changed a published result and why.

### P1: Bulk actions

Allow permitted users to move students between classes, publish assessments, assign interventions, export selected records, and archive terms. Show a preview and affected-record count before applying a bulk change.

### P1: Audit history in the interface

For important records, show the previous value, new value, actor, time, and reason. Audit records must be append-only to ordinary users.

### P2: Comments and handoff notes

Support structured teacher comments and private staff notes with separate permissions. Include mention and assignment workflows only if they solve a real coordination need.

## 8. Offline and low-bandwidth support

### P1: Progressive web application

Make the core grade-entry workflow installable and usable on unreliable connections.

**Acceptance criteria**

- The application shell and assigned class roster can load offline after an initial sync.
- Pending changes are visibly queued.
- Users can distinguish saved locally, syncing, synced, and conflicted states.
- Sensitive cached data is minimized and cleared on sign-out or device revocation.

### P1: Conflict resolution

When two devices edit the same record, do not silently use the last write. Show both versions, their timestamps, and a permitted resolution action.

### P1: Low-bandwidth mode

Reduce chart animation, defer large modules such as Excel support, compress responses, paginate records, and offer a table-first mode. Record bundle budgets and test on a throttled connection.

## 9. Accessibility and inclusive design

### P0: WCAG 2.2 AA target

Audit and fix keyboard navigation, focus order, focus trapping, labels, error association, contrast, zoom, reflow, touch targets, reduced motion, and screen-reader announcements.

### P0: Accessible chart alternatives

Every chart should have a text summary and data table. Do not rely on color alone. Tooltips must be keyboard-accessible or the same data must be available nearby.

### P1: Accessible data entry

Use fieldsets, explicit labels, clear validation messages, error summaries, and focus movement after submission. Bulk grid entry needs a documented keyboard model.

### P1: Internationalization

Externalize interface text and support locale-aware dates, numbers, names, and grading labels. Test long translations and right-to-left layout if those locales are in scope.

### P2: Print and reduced-complexity views

Offer clear print styles and a simplified view for users who do not need charts or dense controls.

## 10. Security and privacy

### P0: Threat model

Document assets, actors, trust boundaries, entry points, abuse cases, mitigations, and residual risks. Include student-record disclosure, cross-tenant access, malicious spreadsheet upload, export abuse, account takeover, and insecure offline caches.

### P0: Server-side input and output controls

Validate all inputs on the server. Encode untrusted output, use parameterized queries, restrict accepted file types and sizes, and protect spreadsheet exports against formula injection in cells beginning with `=`, `+`, `-`, or `@`.

### P0: Privacy controls

Implement data minimization, purpose-based collection, retention periods, account deactivation, record deletion or anonymization where permitted, and an export process for data-subject requests.

Document which legal and policy requirements apply to the intended deployment instead of making an unsupported claim of compliance.

### P0: Secure defaults

Use restrictive CORS, content security policy, secure headers, CSRF protection where needed, least-privilege database credentials, secret rotation, and environment separation.

### P1: Audit and anomaly detection

Record authentication events, permission changes, bulk exports, imports, publication, and sensitive record access. Alert on unusual export volume or repeated authorization failures.

### P1: Dependency and supply-chain security

Pin dependencies, review lockfile changes, automate vulnerability and license scanning, protect the release workflow, and produce a software bill of materials for releases.

### P1: Security verification

Add authorization tests, tenant-isolation tests, file-upload abuse tests, dependency scanning, secret scanning, and a documented response process for reported vulnerabilities.

## 11. Frontend architecture and user experience

### P0: TypeScript and runtime schemas

Migrate the JavaScript code to TypeScript. Use runtime validation at API and file-import boundaries because TypeScript alone does not validate external data.

### P0: Route-based application structure

Split the single dashboard into routes such as overview, students, classes, assessments, imports, reports, and administration. Add route-level authorization and error boundaries.

### P1: Server-state management

Use a deliberate server-state strategy for caching, invalidation, optimistic updates, retry policy, and request cancellation. Keep transient UI state separate from persisted domain data.

### P1: Design system

Create reusable primitives, tokens, form patterns, empty states, loading states, errors, dialogs, tables, and chart conventions. Document them in a component workbench or equivalent catalog.

### P1: Robust table experience

Add server-side sorting, pagination, column visibility, density control, sticky identifiers, saved views, selection, and accessible keyboard interaction. Virtualize only after measurement shows it is needed.

### P1: Complete state handling

Every page and mutation should define loading, empty, partial, stale, offline, unauthorized, validation-error, and unexpected-error behavior.

### P1: Undo and confirmation patterns

Use recoverable archive or undo for routine deletion. Reserve blocking confirmation dialogs for high-cost actions and state the exact affected scope.

### P2: Command palette and shortcuts

Add shortcuts for experienced users only after core keyboard navigation works. Make shortcuts discoverable and configurable where conflicts are likely.

## 12. Testing and quality engineering

### P0: Unit tests for domain rules

Expand beyond three analytics tests. Cover boundary values, empty and missing scores, custom grading policies, duplicate student names, incomplete terms, ordering, rounding, and policy-version changes.

### P0: Integration tests

Test database repositories, API authorization, import validation, transactions, audit events, and job idempotency against a real test database.

### P0: End-to-end tests

Automate critical journeys:

- administrator creates a school term and invites a teacher;
- teacher creates an assessment and enters scores;
- teacher previews and commits an import;
- teacher publishes results;
- student or guardian views a published report;
- unauthorized users are denied access;
- offline edits sync or enter conflict resolution.

### P0: Accessibility tests

Run automated checks in CI and perform documented manual tests with keyboard navigation and at least one screen reader. Automated checks alone are insufficient.

### P1: Contract and migration tests

Verify API compatibility, generated clients, database migration from the previous release, and rollback or forward-fix procedures.

### P1: Property-based tests

Use generated inputs for grade calculations, imports, normalization, and aggregation invariants. For example, a retry must not duplicate a committed import, and an average must remain within the allowed score range.

### P1: Performance and load tests

Define representative school sizes and test imports, dashboard queries, exports, concurrent grade entry, and report generation. Publish the test dataset shape and hardware assumptions.

### P1: Visual regression tests

Capture stable states for responsive layouts, long names, empty data, validation errors, tables, dialogs, and reports.

### P2: Resilience tests

Test lost connections, job retries, expired sessions, partial service outages, duplicate requests, and database failover behavior appropriate to the deployment.

## 13. Performance and scalability

### P0: Performance budgets

Set measurable budgets for initial JavaScript, largest contentful paint, interaction latency, API response percentiles, and memory use. Record results in CI or release notes.

### P1: Bundle and loading improvements

Lazy-load routes, charts, Excel processing, and report tooling. Remove unused code and inspect bundle composition. The current production build places a substantial amount of code in the main JavaScript bundle, so route and feature splitting would provide visible evidence of engineering judgment.

### P1: Database performance

Add indexes based on measured query patterns, inspect query plans, prevent N+1 queries, paginate exports through background jobs, and precompute expensive aggregates only when justified.

### P1: Representative scale demo

Provide a documented generator for anonymized synthetic data and demonstrate the product with thousands of students and assessment records. Do not place real student data in the repository or demo.

## 14. Observability and operations

### P0: Structured logging

Log request IDs, tenant IDs, operation names, job IDs, durations, and safe error details. Do not log student names, scores, tokens, passwords, or uploaded file contents by default.

### P0: Error monitoring

Capture frontend and backend exceptions with release version and source maps. Give users a support reference without exposing internal stack traces.

### P1: Metrics and tracing

Measure request latency, error rate, job duration, queue depth, import rejection rate, report failures, and database health. Trace expensive workflows across API, queue, and database boundaries.

### P1: Health and readiness checks

Separate liveness from readiness. Check critical dependencies without turning health endpoints into expensive load generators.

### P1: Service objectives and runbooks

Define a small set of service-level objectives, alerts tied to user-visible problems, and runbooks for failed imports, slow queries, email failures, and database capacity.

### P1: Backup and restore

Automate encrypted backups, define recovery point and recovery time objectives, and perform a documented restore test. A backup that has never been restored is not sufficient evidence.

## 15. Delivery and infrastructure

### P0: Continuous integration

Run formatting, linting, type checking, unit tests, integration tests, build, accessibility smoke tests, and security scans on pull requests. Protect the main branch and require passing checks.

### P0: Repeatable environments

Provide local development setup with seeded data and one documented command path. Keep development, staging, and production configuration separate.

### P1: Preview deployments

Create an isolated preview for each pull request using synthetic data. Clean up preview resources automatically.

### P1: Safe database deployments

Use backward-compatible expand-and-contract migrations, migration locks, and a documented rollback or forward-fix plan.

### P1: Release strategy

Use versioned releases, changelogs, smoke tests, staged rollout where available, and a tested rollback procedure. Record application and schema versions together.

### P2: Infrastructure as code

Define hosting, database, queues, storage, DNS, monitoring, and access policies in reviewed configuration when the deployment is complex enough to justify it.

## 16. Documentation and engineering communication

### P0: Architecture documentation

Add:

- a system context diagram;
- container or service diagram;
- data model diagram;
- authentication and authorization flow;
- import sequence diagram;
- deployment diagram.

Keep diagrams close to the code and update them when boundaries change.

### P0: Architecture decision records

Record important decisions and alternatives, such as database choice, tenancy model, authorization enforcement, offline strategy, grading-policy versioning, job queue, and analytics limitations.

### P0: Local development guide

Document prerequisites, environment variables, database setup, migrations, seed data, test commands, troubleshooting, and how to reset local state safely.

### P1: API and data dictionary

Publish API documentation, example errors, pagination behavior, webhook or event contracts, metric definitions, and field-level data ownership.

### P1: Operational documentation

Include deployment, rollback, backup restore, incident response, key rotation, user offboarding, and data-retention procedures.

### P1: Portfolio case study

Explain:

- the users and problems selected;
- constraints such as unreliable connectivity and student privacy;
- rejected alternatives and tradeoffs;
- performance and reliability targets;
- before-and-after measurements;
- known limitations and the next decision that would require user research.

Use screenshots and short workflow recordings as evidence, not decoration.

## 17. Developer experience and maintainability

### P0: Clear module boundaries

Separate domain logic, application services, adapters, API handlers, and presentation code. Grade calculations should not depend on React components or database details.

### P1: Repository conventions

Add contribution guidance, naming and testing conventions, pull-request expectations, ownership rules, and a definition of done.

### P1: Generated and seeded test data

Provide deterministic factories for schools, classes, users, assessments, and scores. Make edge cases easy to create without copying large fixtures.

### P1: Automated dependency maintenance

Schedule dependency updates, group low-risk updates, run the full test suite, and document how urgent security patches are handled.

### P2: Monorepo only if justified

If frontend, API, workers, and shared packages need coordinated releases, a monorepo can help. Do not introduce one solely to make the project look larger.

## 18. Product governance and ethical use

### P0: Analytics limitations

Document what the dashboard can and cannot infer. State how missing assessments, changed teachers, curriculum changes, attendance, and small samples affect comparisons.

### P0: Human review and appeals

Allow authorized staff to review, annotate, dismiss, or correct a risk flag. Preserve the original evidence and decision history. Students should not be penalized automatically by an opaque score.

### P1: Fairness evaluation

If subgroup or predictive analytics are used, evaluate error rates and outcomes across relevant groups where lawful and statistically defensible. Suppress unsafe small-group results.

### P1: Data retention and consent

Define why each field is collected, who can see it, how long it is retained, and how guardian or student communication preferences are recorded where applicable.

## 19. Optional differentiators

These features can make the project distinctive after the foundation is complete.

### P2: What-if grade calculator

Let teachers simulate weighting or missing-assignment changes without modifying official records. Clearly label simulated results and prevent accidental publication.

### P2: Curriculum coverage map

Show which standards were assessed, how often, and where evidence is missing. This can support planning without claiming that assessment frequency equals learning quality.

### P2: Anonymized research export

Allow authorized users to export a minimized, de-identified dataset with a recorded purpose, approval state, and suppression rules. Explain that de-identification reduces risk but may not eliminate it.

### P2: Public demo sandbox

Provide a resettable demo tenant with synthetic data, guided scenarios, and no connection to production records. Recruiters should be able to test key workflows without creating an account manually.

### P2: Integration API and webhooks

Offer scoped API keys, rotation, usage logs, rate limits, idempotency, webhook signing, retries, and replay protection.

### P3: Mobile companion

Build a focused mobile experience for attendance or quick score entry only if research shows it is useful. A responsive web application may be sufficient.

## 20. Features to avoid or defer

Senior judgment includes declining work that adds surface area without evidence of value.

- More chart types before metric definitions and drill-down are sound.
- A chatbot that can expose student data or produce untraceable claims.
- Microservices before one service has a demonstrated scaling or ownership problem.
- Blockchain-based records without a concrete trust problem that requires it.
- Predictive labels without model evaluation, explanations, and human review.
- Real-time collaboration before conflict rules and audit history exist.
- Native mobile applications when responsive and offline-capable web flows meet the need.
- Gamification that ranks or publicly compares students.
- Claims of legal compliance without a documented scope, controls, and review.

## 21. Suggested delivery sequence

### Phase 1: Correct foundations

- Write the domain model and architecture decision records.
- Migrate to TypeScript and add runtime schemas.
- Add PostgreSQL, migrations, a documented API, and stable student identities.
- Implement authentication, server-side authorization, and tenant isolation.
- Add CI with unit, integration, and end-to-end smoke tests.

### Phase 2: Complete one school workflow

- Add classes, enrollments, assessments, score entry, grading policies, and publication states.
- Build import preview, strict validation, duplicate handling, audit history, and rollback.
- Add accessible student and class reports.
- Test the administrator, teacher, and student or guardian journeys end to end.

### Phase 3: Operational credibility

- Add structured logs, error monitoring, metrics, health checks, and runbooks.
- Add background jobs for imports and reports.
- Define performance budgets and run representative load tests.
- Automate backups and record a restore exercise.

### Phase 4: Differentiation

- Add explainable interventions, standards tracking, and longitudinal profiles.
- Add offline score entry and conflict resolution if low-connectivity use is central to the project.
- Publish a case study with measured results, tradeoffs, threat model, diagrams, and a public synthetic-data demo.

## 22. Evidence recruiters should be able to inspect

The finished repository should make engineering quality easy to verify:

- a live demo with role-specific synthetic accounts;
- a short architecture overview and diagrams;
- meaningful commit and pull-request history;
- architecture decision records showing tradeoffs;
- an OpenAPI contract and database migrations;
- a threat model and privacy notes;
- CI results for tests, accessibility, security, and builds;
- performance and load-test results with stated assumptions;
- monitoring screenshots or a local observability demo;
- a backup restore record;
- a case study connecting user needs to implementation choices;
- a limitations section that is specific and candid.

## Final recommendation

Do not attempt every feature in this document. Build a small production-style system in depth. The most convincing senior-engineer portfolio version would combine secure multi-role access, a sound academic data model, dependable import and gradebook workflows, explainable analytics, strong tests, accessible reporting, and documented operations. Each claim in the README should link to code, tests, measurements, or a working demo that proves it.

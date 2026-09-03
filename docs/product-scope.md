# Product scope

## Working name

Student Performance Dashboard

## Product statement

The application helps a school administrator set up an academic term and helps a teacher record, review, and publish assessment results. Students and guardians can view published results. The first release uses synthetic data and is designed as a portfolio demonstration, not as a production service holding real student records.

## Problem being addressed

The current dashboard can analyze flat student records in one browser. It cannot safely support several users, preserve a student's identity across classes and terms, distinguish draft results from published results, or explain who changed a record.

The first production-style release will solve one complete workflow: an administrator configures a class, a teacher records results, and a student or guardian views a published report.

## Primary users

### School administrator

The administrator manages the school's academic structure and user access.

They can:

- create academic years and terms;
- create grade levels, classes, and subjects;
- invite teachers;
- create students and enroll them in classes;
- review imports and audit events;
- configure grading policies;
- lock or reopen a reporting period.

### Teacher

The teacher manages assessments and scores for assigned classes and subjects.

They can:

- view assigned classes;
- create assessments;
- enter scores manually;
- preview and commit a CSV import;
- review calculated results and risk flags;
- publish results;
- create and review interventions.

### Student

The student can view their own published results and reports. Draft scores and private staff notes are not visible.

### Guardian

The guardian can view published results for students explicitly linked to their account. The first release may use seeded guardian links rather than a full guardian-verification workflow.

## First-release workflows

### 1. School setup

1. An administrator creates an academic year and terms.
2. The administrator creates a class and subjects.
3. The administrator assigns a teacher to a class and subject.
4. The administrator creates students and enrolls them in the class.

### 2. Assessment and score entry

1. A teacher opens an assigned class.
2. The teacher creates an assessment with a title, category, date, maximum score, and weight.
3. The teacher enters scores or imports them from CSV.
4. The application distinguishes a numeric zero from missing, excused, and incomplete work.
5. The teacher reviews validation errors and calculated grades.

### 3. Publication

1. A teacher submits results for review or publishes them when the school policy permits direct publication.
2. Published results become visible to the relevant student and guardian accounts.
3. Amendments to published scores require a reason and create an audit event.

### 4. Reporting

1. A teacher views a class report with metric definitions and denominators.
2. A student or guardian views a student report containing published assessments and term totals.
3. An authorized user can export a report without exposing records outside their permitted scope.

## Functional scope for version 1

- Email and password sign-in with server-managed sessions.
- School-level tenant isolation.
- Roles for administrator, teacher, student, and guardian.
- Academic years, terms, grade levels, classes, and subjects.
- Stable student profiles and term-specific enrollments.
- Teacher assignments.
- Assessments and score entry.
- Configurable, versioned grade bands and category weights.
- CSV import preview, mapping, validation, duplicate handling, and commit.
- Dashboard summaries derived from persisted assessment data.
- Explainable rule-based risk flags.
- Draft and published result states.
- Student and class reports in accessible HTML.
- Audit history for sensitive mutations.
- Synthetic demo accounts and data.

## Non-goals for version 1

- Holding real student data in the public portfolio deployment.
- Native mobile applications.
- Predictive machine-learning models.
- Automated disciplinary or promotion decisions.
- Real-time collaborative editing.
- Multiple microservices.
- Full learning-management-system functionality.
- Attendance, behavior, messaging, and billing systems.
- Government or vendor-specific interoperability standards.
- Claims of compliance with a law or certification scheme.
- PDF generation, offline editing, and scheduled email reports. These remain later milestones.

## Domain rules that must be visible to users

- Missing work is not the same as a score of zero.
- Only published results are visible to students and guardians.
- Every calculated total identifies the grading-policy version used.
- A risk flag states the evidence and rule that produced it.
- A risk flag requires human review and does not make an automatic decision.
- Class comparisons show the sample size and suppressed results when a configured minimum group size is not met.

## Portfolio success criteria

The project is ready to present when a reviewer can:

- run the application from a clean checkout using documented commands;
- sign in with synthetic accounts for each role;
- complete the administrator-to-teacher-to-student workflow;
- inspect the API contract, schema migrations, authorization tests, and audit history;
- see a rejected import and understand each row-level error;
- trace a displayed grade and risk flag to its source data and policy;
- review passing unit, integration, accessibility, and end-to-end checks in CI;
- inspect architecture decisions, a threat model, and measured performance results;
- confirm that the public demo contains no real student data.

## First implementation milestone

The first milestone establishes persistence without trying to deliver the complete version 1 scope.

It includes:

- TypeScript configuration for the frontend;
- a TypeScript API in the same repository;
- PostgreSQL and version-controlled migrations;
- synthetic seed data corresponding to the current dashboard sample;
- a read-only `GET /api/v1/students` endpoint;
- frontend loading, empty, and error states;
- API integration tests;
- CI checks for linting, types, tests, and production builds.

Authentication and mutations follow after this read path works end to end.


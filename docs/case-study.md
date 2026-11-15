# From spreadsheet results to published school reports

## Problem and scope

Teachers need to record assessment scores, correct mistakes, compare class performance, and share results with students and guardians. A chart alone does not handle who may edit a score, what missing work means, or which result a family should see while a teacher makes corrections.

This project implements that workflow using a fictional junior high school. It is a portfolio demonstration, not a report of a school deployment or evidence that learning outcomes improved.

## Contribution

The repository is maintained under Nyantakyi-Francis. The work covers the product scope, React interface, analytics and spreadsheet handling, Fastify API, PostgreSQL model and migrations, session and assignment checks, grading and publication rules, deployment, and automated verification. Development was AI-assisted. The code, commit history, design decisions, and test evidence are available for review; this case study makes no claim that every line was written without assistance.

The original browser dashboard remains available without sign-in. The school workspace adds staff score entry, validated CSV imports, publication, linked learner reports, and administrator account management.

## Decision: keep sample editing separate from school records

The sample dashboard needs to be easy to try. Browser storage is sufficient for a visitor filtering charts or editing fictional records on one device. It cannot enforce shared permissions or provide a reliable school record.

School records therefore use PostgreSQL through an authenticated API. Each request resolves the active school membership; teacher access also depends on a class and subject assignment. Student and guardian access depends on explicit student links. The frontend does not substitute sample records when a school request fails.

This creates some duplicated display and data-loading paths. It also keeps the no-account demonstration useful without treating localStorage as an authorization boundary. The integration suite checks foreign school IDs and unassigned classes; browser tests check that sample edits never appear as school data.

## Decision: publish a stable report instead of exposing a changing draft

A teacher must be able to correct work without changing a report that has already been released. The API saves draft scores with a version check. Competing saves return a conflict so an older screen cannot silently overwrite newer work.

Publication stores the assessment's scores, feedback, source version, and grading policy together. A later draft edit leaves that publication intact. A reason is required for amendments, and families see the updated result only after republication.

This uses extra database tables and makes correction a deliberate workflow. In return, the report has a traceable source and keeps its grading rules when an administrator creates a new policy. Integration tests cover competing saves, policy retention, and unchanged publications after draft edits.

## Data rules that affect users

A recorded zero counts toward an average. Missing, excused, and incomplete work have no numeric score. Stable student IDs keep namesakes separate and preserve a student's identity across terms. CSV preview validates every row before an explicit transactional save; invalid data cannot partially replace valid scores.

Staff overview charts are advisory and may include drafts. Released reports use the policy stored with each publication. The interface keeps these distinctions brief; the workflow and API documentation contain the calculation details.

## Evidence and limits

The repository includes unit/API tests, PostgreSQL integration tests, and desktop/mobile Chromium workflows with automated accessibility checks. [Deployment notes](deployment.md) distinguish checks run locally from checks run against the hosted application. [The walkthrough](walkthrough.md) shows the teacher-to-student path.

The demonstration has no real student records and no evaluated school users. Shared demo accounts are intentionally public and have restricted roles. Administrator credentials remain private. Account invitations and recovery use manual link delivery. Large datasets, manual screen-reader use, other browser engines, automated backups, and dependency remediation still need work before a school could rely on it.

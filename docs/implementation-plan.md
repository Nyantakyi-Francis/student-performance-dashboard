# School workflow implementation plan

Goal: complete the synthetic administrator → teacher → student/guardian workflow while preserving the browser sandbox.

## Milestones and acceptance criteria

1. Deployment and baseline: same-origin `/api` configuration, current setup instructions, reproducible code checks. Hosted verification must distinguish deployed behavior from local evidence.
2. Teacher writes: assigned teachers create assessments and save draft scores; zero, missing, excused and incomplete remain distinct; stale versions conflict; all writes are scoped and audited.
3. Grading: immutable policy versions define pass and risk thresholds; published calculations retain their policy and source assessment version; visible metrics explain denominators.
4. Publication and reports: staff publish snapshots; students see only their linked records and guardians see only explicitly linked students; later draft changes cannot silently alter published reports.
5. Imports: CSV parsing, mapping, server validation, row errors, preview and explicit atomic commit; retries do not duplicate writes and stale previews fail.
6. Accounts: administrator-issued invitations and recovery tokens, single use and expiry; school membership deactivation revokes sessions; no email is sent automatically.
7. Accessibility and typing: chart tables, keyboard-contained dialogs, typed new workflow components, automated accessibility and desktop/mobile workflow checks.

## Verification

Run lint, frontend/API type checks, unit tests, both builds, PostgreSQL integration tests and desktop/mobile Playwright tests. Use an isolated synthetic database, never the existing hosted database. Record actual outcomes and remaining external deployment requirements in this document.

## Boundaries

Synthetic data only. No hosted migration, release, real student data, automatic account messages, PDF generation or frontend directory restructuring is required to validate the local workflow. Prepare deployment changes for review before applying external changes.

## Results on 13 November 2026

Milestones 2?7 are implemented and verified locally. The frontend/API preview is deployed, and the hosted database migrations are applied and verified. Synthetic account setup and the authenticated hosted workflow still need verification. See [release requirements](deployment.md).

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass: API and typed frontend workflow |
| `npm test` | Pass: 15 frontend utility/client tests and 11 API/domain tests |
| `npm run build`, `npm run api:build` | Pass |
| `node scripts/build-web.mjs` | Pass: hosted build uses same-origin API base |
| PostgreSQL integration suite | Pass: 25 tests, including two-school access, competing saves, atomic imports, publication snapshots, recovery and independent membership rate budgets |
| `npm run test:e2e` | Pass: 12 tests across desktop Chromium and mobile Chromium, final run 3 minutes |
| Fresh migration | Pass on isolated PostgreSQL 18.6; all 21 tables have RLS and no anon/authenticated table privileges, even with permissive initial default grants |
| Migration parity | Drizzle and Supabase workflow migration files have matching SHA-256 hashes |
| Accessibility | Zero Axe WCAG A/AA violations in tested sandbox, teacher, administrator and learner states at desktop/mobile sizes; dialog Tab/Shift+Tab/Escape and visible keyboard focus checked |
| Browser health | Meaningful page/title, no framework overlay, and no page exceptions in the teacher workflow; sandbox console checks clear |
| `git diff --check` | Pass |

The browser flow exercised teacher creation → draft save → refresh → rejected CSV → preview → atomic commit → publication → linked student/guardian report, plus administrator invitation → recipient password setup → learner sign-in. It also checked cancellation of navigation with unsaved scores, sandbox persistence and separation, assignment changes, loading/error/empty/retry states and sign-out.

Browser-plugin availability: the Browser plugin skill was not available. The repository Playwright suite drove the interactions; the available browser accessibility connector provided additional sandbox audits, semantic snapshots, focus checks and console checks. Screenshots and traces were saved outside the repository in the system temporary directory (`student-dashboard-evidence` and `student-dashboard-playwright`); CI retains failure artifacts through its existing upload step.

The full browser run exposed a real proxy-related rate-limit issue: several users consumed the same IP budget. Authenticated budgets now use verified membership IDs; login/recovery retain separate normalized-IP limits. A regression test exhausts one membership and proves another still works. Error handlers are registered before child routes so rate-limit failures retain the documented JSON contract.

Remaining limits: manual screen-reader testing, non-Chromium browsers, large-school performance, dependency advisory remediation and coordinated hosted deployment. Account messages use verified manual delivery. Existing school structure is seeded; broader academic setup, assessment categories, PDF generation and complete legacy frontend TypeScript conversion remain later work.

## Vercel follow-up

The user authorized the Vercel migration and coordinated synthetic release. The standard function adapter, pooled PostgreSQL client and shared production rate limiter are implemented. Local desktop/mobile browser verification passed again. Hosted previews have been created; Supabase connectivity recovered. The application backup restored successfully, migrations passed on the restored copy, and all three pending migrations were applied to the hosted database. Original academic records are unchanged and all 22 hosted tables retain RLS without browser-role table access. Hosted account setup and workflow checks remain pending. Production has not been promoted. See deployment.md for current evidence and release steps.

## Portfolio release follow-up: 15 November 2026

User-facing implementation notes were removed or replaced with task-specific wording. Public teacher/student/guardian accounts use ordinary sign-in and permission checks. The production database configuration and Vercel wildcard query forwarding were corrected. A startup failure now returns safe JSON. The README, current screenshots, case study and walkthrough recording are included. See [deployment evidence](deployment.md) for actual checks and the final deployment. Earlier status entries above describe the 13 November run.

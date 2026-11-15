# Deployment and verification

## Portfolio release: 15 November 2026

Public application: https://student-performance-dashboard-three.vercel.app/

Verified production build: `dpl_9AecFiVrpVDtgFfAS9f9LNEY6C3o` (`student-performance-dashboard-59d8x2no1.vercel.app`).

The React frontend and Fastify API run in the same Vercel project (`prj_QLwyRk8llV3caAFODIBba377QlY9`, team `nyantakyi-francis-projects`). PostgreSQL remains on Supabase. The public teacher, student, and guardian shortcuts use normal password sign-in and the existing permission checks. They do not grant administrator access. The sample school contains fictional records only.

The release is built from the local working tree. No Git commit or push is implied by the deployment. The final source, documentation, screenshots, and video remain available in the checkout for review.

## Problems corrected

The previous production build was marked READY but failed when its API started. `DATABASE_URL`, `CLIENT_ORIGIN`, and `NODE_ENV` had been configured for previews only. The production environment now uses the same verified database connection, exact public origin, and secure-cookie configuration.

The wildcard `/api/:path*` rewrite also added a query parameter such as `path=v1/dashboard-data`. The dashboard's strict input schema correctly rejected this unexpected field. The Vercel adapter now removes only the exact routing value before forwarding the request to Fastify. School filters, unknown application fields, and unmatched/duplicate routing values remain available for validation. Four regression tests cover this boundary.

Startup failures now return a safe JSON 503 with `no-store`. The client gives a short retry or connection message instead of exposing response parsing details. The user-facing storage and implementation notes were removed; calculation explanations remain where they help users understand grades.

## Verification evidence

| Check | Result |
| --- | --- |
| Unit/API tests | 31 passed, including routing and connection-error regressions |
| PostgreSQL integration tests | 25 passed on an isolated local PostgreSQL 18.6 database |
| Desktop/mobile Chromium suite | 12 passed; workflow cases rerun after the final wording changes |
| Lint and API/frontend/function type checks | Passed |
| Frontend and API builds | Passed |
| Hosted teacher workflow | Sign-in, class overview, assessment creation, zero-score save, refresh, invalid CSV rejection, valid preview/save, publication |
| Hosted administrator workflow | Private administrator sign-in, password-confirmed invitation, recipient password setup and linked learner report |
| Hosted student/guardian workflow | Only linked student reports, matching published score and feedback, successful logout and subsequent JSON 401 |
| Cookie and origin checks | Secure, HttpOnly, SameSite=Lax, Path=/api; untrusted mutation origin rejected |
| Hosted accessibility | Zero Axe WCAG A/AA findings in tested desktop sample/teacher/student and mobile guardian states; no horizontal page overflow |
| Visual checks | Current desktop/mobile screenshots and a short workflow recording |

The browser checks use Playwright. The Browser plugin and its interaction skill are unavailable in this session; the accessibility-only browser tools cannot perform these signed-in workflows. Local browser suites use a dedicated `_test` database and separate API processes for desktop/mobile sign-in budgets. The public-domain check uses a fresh browser context without a deployment-protection bypass.

## Hosted records and rollback

Before provisioning accounts, an application backup was created outside Git under `.codex/backups/student-performance-dashboard/2026-11-15T00-13-54-182Z-portfolio`. It contains a custom-format public-schema dump and academic-record fingerprints. Public accounts were added transactionally. Existing passwords and membership decisions are preserved; conflicting public account credentials cause the seed to stop.

The original 8 students, 36 assessments, and 96 scores are preserved. Hosted workflow verification adds separate reading assessments and publications to the fictional school. A timestamp-labelled temporary test assessment was removed after its check; the named reading examples remain available for reviewers. Audit history retains the operations.

The previously live deployment was `dpl_DKVtQQKgjYiakLC8k2xs3VRhtUsV`. Retain that deployment and the application backup when reviewing rollback options. The final production build is staged with automatic domain assignment temporarily disabled, tested, and then promoted; automatic assignment is restored afterward. Temporary share links used for testing are revoked after the public-domain check. The deployment upload is checked against all 64 runtime source files, including Unicode labels, before release. An earlier upload decoded Unicode punctuation incorrectly; the corrected transfer uses ASCII-escaped JSON and verifies the reconstructed files against the checkout. A browser transport failure left an empty draft during verification; that isolated temporary draft was removed before the final workflow run.

## Configuration and provisioning

`vercel.json` builds Vite with `scripts/build-web.mjs`, which forces the public API base to `/`. `api/index.ts` adapts requests to Fastify and reuses a small PostgreSQL connection pool. Credentials stay server-side. The pool uses three connections per instance, a five-second idle timeout, and disabled prepared statements with Supabase's transaction pooler.

`CLIENT_ORIGIN` allows the exact public origin. Runtime-provided Vercel hostnames allow their own deployment origins; request headers cannot add origins. API responses use `no-store`. Production instances share atomic PostgreSQL rate-limit counters; local development and tests use process-local limits.

`npm run demo:seed` requires an explicitly supplied `DATABASE_URL` and the existing fictional demo school. It creates the intentionally public teacher/student/guardian accounts described in the README. `VITE_PUBLIC_DEMO=true` shows their sign-in shortcuts. Optionally supply `PORTFOLIO_ADMIN_PASSWORD` to provision a private `admin@portfolio.example` account; never publish that value. Public accounts have no administrator role.

The four Supabase migrations were applied and verified on 13 November after backup/restore testing. All 22 application tables had RLS enabled and no direct anon/authenticated table privileges at that verification. This release adds no migrations and does not reset academic fixtures. See the earlier backup manifests for the migration evidence.

## Remaining limits

This release is a shared fictional-data demonstration. It has no school pilot or evidence of educational outcomes. Manual screen-reader testing, other browser engines, large-school measurements, automated backups, automated account email, broader school administration, and PDF generation beyond printing remain unfinished. Existing dependency advisories, including XLSX without an npm-provided fix, require remediation before real-student use.

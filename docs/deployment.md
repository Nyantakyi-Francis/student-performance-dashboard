# Vercel deployment

## Current status: 13 November 2026

The frontend and Fastify API now deploy together to the existing Vercel project, student-performance-dashboard, under nyantakyi-francis-projects. PostgreSQL remains on Supabase. The production domain has not been changed.

All three pending migrations were applied through the Supabase CLI after the application backup was restored and tested locally. Supabase migration history now contains all four project migrations. All 22 hosted application tables have RLS enabled; anon/authenticated have no direct table privileges. Original academic records are unchanged, including the 8 demo students and 96 scores.

The current [protected preview](https://student-performance-dashboard-gr7q3h9jr.vercel.app) is READY. A real Chromium browser verified the rendered sandbox, visible login form, no page exceptions, /health JSON HTTP 200 and /api/v1/auth/session JSON HTTP 401 with UNAUTHENTICATED. Both API routes return no-store. An earlier synthetic invalid-login probe returned a safe JSON HTTP 500 while Supabase was unavailable; this observation predates the successful migration. After migration, the same probe returned JSON HTTP 401 with INVALID_CREDENTIALS, as expected for an account that does not exist.

Supabase connectivity recovered before migration. The transaction and session poolers are reachable. A custom-format backup covers the public application schema, Supabase migration history and existing Drizzle history. It is stored outside Git under the operator's .codex/backups/student-performance-dashboard directory, with before/after verification manifests. It is an application backup, not a complete backup of Supabase-managed authentication or storage schemas. The restored copy matched every original application table's record fingerprint. All three migrations were then successfully tested on that restored copy before the hosted push. No hosted accounts were created by migration.

## Configuration

vercel.json builds Vite with scripts/build-web.mjs, which forces the public API base to /. The standard Node function api/index.ts adapts requests to Fastify. /health rewrites to the same function. The adapter reuses one app and connection pool per warm instance. Database credentials are server-only sensitive variables in the preview environment. No credentials are uploaded with source files.

An attempted Vercel Services beta preview built but failed at runtime. The compiled output lost its ESM package context; forcing source compilation still failed during function invocation. The final configuration uses standard Vercel Functions instead.

The API uses a maximum of three PostgreSQL connections per instance, a five-second idle timeout, disabled prepared statements and Supabase's existing transaction pooler. In production, atomic PostgreSQL rate_limit_buckets counters share request limits across instances. Keys are hashed; expired counters are removed in bounded batches. This uses the existing database without another paid service.

CLIENT_ORIGIN lists exact trusted origins. Vercel-provided deployment hostnames allow their own previews. Request headers cannot add trusted origins. Only deployments with VERCEL_URL enable Fastify's proxy trust; Vercel overwrites forwarded IP headers. Cookies remain Secure in production, HttpOnly and SameSite=Lax. API responses use no-store.

## Remaining release work

1. Bootstrap synthetic accounts if missing; preserve any existing credentials.
2. Verify preview login, refresh, draft save, CSV rejection/commit, publication, linked learner reports and logout. Check cookie attributes, exact-origin checks and the JSON rate-limit contract.
3. Configure the production environment from the verified setup, deploy the verified source and repeat hosted smoke checks. Retain the previous deployment and database backup.

Production promotion remains pending until these checks pass. Real student data is outside this release. Manual screen-reader testing, non-Chromium coverage, backup automation and account message delivery still need validation.

## Local verification

Lint, API/frontend/function type checks, both builds and the hosted frontend build pass. There are 26 unit tests, 25 PostgreSQL integration tests and 12 desktop/mobile browser tests. The new rate-limit test sends concurrent requests through two independent connection pools, confirms one shared atomic budget, checks route isolation and resets an expired window.

Existing production dependency advisories remain in the dependency graph, including XLSX without an npm-provided fix. This deployment does not claim readiness for real student data.

The isolated migrated PostgreSQL database has 22 application tables, all with RLS enabled and no anon/authenticated table privileges. Both mirrored migration pairs have matching SHA-256 hashes.

GitHub CI initially ran both browser viewports against one API process and exhausted its shared IP login budget on a fast runner. CI now runs desktop and mobile separately, restarting the test API between them. Production rate limits are unchanged.

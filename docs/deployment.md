# Vercel deployment

## Current status: 13 November 2026

The frontend and Fastify API now deploy together to the existing Vercel project, student-performance-dashboard, under nyantakyi-francis-projects. PostgreSQL remains on Supabase. The production domain has not been changed.

The current [protected preview](https://student-performance-dashboard-gr7q3h9jr.vercel.app) is READY. A real Chromium browser verified the rendered sandbox, visible login form, no page exceptions, /health JSON HTTP 200 and /api/v1/auth/session JSON HTTP 401 with UNAUTHENTICATED. Both API routes return no-store. A synthetic invalid-login probe reached the API and returned a safe JSON HTTP 500 while Supabase remained unavailable.

Supabase's transaction pooler on port 6543 returns (EAUTHQUERY) authentication query failed: connection to database not available. Its session pooler on port 5432 times out. This prevents inspecting the hosted records, taking a backup, applying migrations and testing hosted login. No hosted database schema, accounts or data have been changed. The project owner has been asked to check whether Supabase is paused.

## Configuration

vercel.json builds Vite with scripts/build-web.mjs, which forces the public API base to /. The standard Node function api/index.ts adapts requests to Fastify. /health rewrites to the same function. The adapter reuses one app and connection pool per warm instance. Database credentials are server-only sensitive variables in the preview environment. No credentials are uploaded with source files.

An attempted Vercel Services beta preview built but failed at runtime. The compiled output lost its ESM package context; forcing source compilation still failed during function invocation. The final configuration uses standard Vercel Functions instead.

The API uses a maximum of three PostgreSQL connections per instance, a five-second idle timeout, disabled prepared statements and Supabase's existing transaction pooler. In production, atomic PostgreSQL rate_limit_buckets counters share request limits across instances. Keys are hashed; expired counters are removed in bounded batches. This uses the existing database without another paid service.

CLIENT_ORIGIN lists exact trusted origins. Vercel-provided deployment hostnames allow their own previews. Request headers cannot add trusted origins. Only deployments with VERCEL_URL enable Fastify's proxy trust; Vercel overwrites forwarded IP headers. Cookies remain Secure in production, HttpOnly and SameSite=Lax. API responses use no-store.

## Complete after Supabase is available

1. Inspect hosted schema, migration history and record provenance. Confirm synthetic data before write operations.
2. Take a backup and prove a restore into an isolated local database.
3. Apply missing migrations through the existing migration history. Supabase files 20261113000000_school_workflow.sql and 20261113010000_shared_rate_limits.sql mirror Drizzle 0002 and 0003. Do not apply initial Drizzle migrations over an existing Supabase schema.
4. Confirm RLS on all 22 application tables and no table privileges for anon/authenticated. Bootstrap synthetic accounts only if missing; preserve existing credentials.
5. Verify the preview: login, refresh, draft save, CSV rejection/commit, publication, linked learner reports and logout. Check cookie attributes, exact-origin checks and the JSON rate-limit contract.
6. Configure the production environment from the verified setup, deploy the verified source and repeat hosted smoke checks. Retain the previous deployment and database backup.

Production promotion remains pending until these checks pass. Real student data is outside this release. Manual screen-reader testing, non-Chromium coverage, backup automation and account message delivery still need validation.

## Local verification

Lint, API/frontend/function type checks, both builds and the hosted frontend build pass. There are 26 unit tests, 25 PostgreSQL integration tests and 12 desktop/mobile browser tests. The new rate-limit test sends concurrent requests through two independent connection pools, confirms one shared atomic budget, checks route isolation and resets an expired window.

Existing production dependency advisories remain in the dependency graph, including XLSX without an npm-provided fix. This deployment does not claim readiness for real student data.

The isolated migrated PostgreSQL database has 22 application tables, all with RLS enabled and no anon/authenticated table privileges. Both mirrored migration pairs have matching SHA-256 hashes.

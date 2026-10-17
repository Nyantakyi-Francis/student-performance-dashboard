# Local development and verification

Use Node.js 24 and npm. All records and accounts in this guide are synthetic.

## Database setup

Run `npm ci` at the repository root. Use an existing PostgreSQL 17+ instance or run `docker compose up -d`. The compose service binds only to localhost and creates separate `student_dashboard` and `student_dashboard_test` databases on its first initialization. An existing Docker volume needs the test database created separately.

Copy `apps/api/.env.example` to `apps/api/.env`. Keep credentials out of Git. The example matches the compose service. The API database account must be the table owner or an explicitly provisioned server role with the necessary access and `BYPASSRLS`; it must never be used in the browser. RLS denies browser/Data API roles; school and teaching-assignment scopes are enforced in API queries.

For a new local database, run from the root:

```sh
npm run db:migrate
npm run db:seed
npm run db:seed:accounts
```

The academic seed is repeatable. The account seed creates `admin@demo.example` and `teacher@demo.example` at school code `accra-demo-jhs`. Passwords come from `DEMO_ADMIN_PASSWORD` and `DEMO_TEACHER_PASSWORD` in the API environment and must have 12-128 characters. Re-running the account seed does not reset passwords or replace existing assignment decisions. A new teacher membership initially receives Grade 7 / English access.

Existing Supabase installations that applied `supabase/migrations` should keep using that migration history: review `npm run supabase:dry-run`, then apply the pending migration through that path. Do not run Drizzle's initial migration over tables already created by Supabase. Both directories contain the same session/access migration. No hosted database is migrated automatically by this change.

## Start the application

Run these commands in separate terminals:

```sh
npm run api:dev
npm run dev
```

Open the Vite URL. The default Browser sandbox works without PostgreSQL or an account. Database view requires sign-in. Local Vite proxies `/api` to `http://127.0.0.1:3001`, so cookies use the frontend origin. The API origin allowlist includes the two standard Vite localhost origins; update it when changing the frontend port.

Sandbox edits and its unfinished entry form stay mounted when switching modes. Committed sandbox records survive refresh in the existing `student-performance-dashboard:v2` storage key. Unsaved form fields survive mode switching but are not persisted across a full refresh. Database responses, passwords, and session tokens are never written to localStorage. A database request failure shows an error and retry action without falling back to sandbox records.

Administrators can read their school's dashboard and roster, assign teachers to active classes/subjects, and remove assignments. Teachers see only assigned class rosters and scores for assigned subjects. Both roles have a read-only database dashboard. Student/guardian accounts and server-side student/score editing remain later work.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run api:build
npm run api:smoke
```

`typecheck` covers the TypeScript API; the frontend remains JavaScript with runtime API validation. `api:smoke` signs in using the seeded administrator and `DEMO_ADMIN_PASSWORD`.

Integration tests require an explicitly selected database with a name ending in `_test`. They apply migrations and remove only their own randomly named fixtures. They do not truncate tables. Set `TEST_DATABASE_URL` in your terminal environment; do not point it at a database containing real records.

PowerShell example with the local compose credentials:

```powershell
$env:TEST_DATABASE_URL = 'postgres://student_dashboard:local-synthetic-password@127.0.0.1:5432/student_dashboard_test'
npm run test:integration
```

Browser tests use the same test database and the two synthetic accounts. Before the first browser run, set `DATABASE_URL` to that test URL in the terminal, set `DEMO_ADMIN_PASSWORD` and `DEMO_TEACHER_PASSWORD` to synthetic values, then run migrations and both seeds against it. Shell environment values take precedence over the API `.env` file. Run:

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts a dedicated API on port 3101 and Vite on port 4178. Both ports must be free. Desktop Chromium and mobile Chromium flows cover sandbox preservation, login/logout, read-only records, assignment changes, loading/error/empty/retry states, and refresh. API integration tests cover cross-school access, session expiry/revocation, rate limits, CSRF checks, and invalid assignments. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an already-installed Chromium binary.

GitHub Actions runs these checks with PostgreSQL 17, creates synthetic accounts, and uploads browser failure artifacts. The workflow is defined locally; its first hosted run occurs after pushing to GitHub.

## Deployment

Use HTTPS and configure `CLIENT_ORIGIN` to exact trusted frontend origins. Production cookies are Secure, HttpOnly, SameSite=Lax, scoped to `/api`, and expire after eight hours. Prefer a same-origin `/api` reverse proxy and build the frontend with `VITE_API_BASE_URL=/`. A same-site API subdomain also works with an explicit HTTPS `VITE_API_BASE_URL` and credentialed CORS.

Unrelated Vercel and Render domains are cross-site: the Lax cookie will not authenticate cross-site fetches. Configure the proxy or same-site domains before enabling database view there. Do not weaken cookie policy to work around deployment layout. No deployment or hosted credentials were changed by this implementation.

For multiple API instances, use a shared rate-limit store before scaling; the current limiter is per process. Provision account invitation, password reset, monitoring, audit review, and recovery procedures before considering real student data. The public demo remains synthetic-only.

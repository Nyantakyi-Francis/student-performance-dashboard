# Session and database-read threat model

## Scope

The browser sandbox contains fictional data. Protected API reads and teacher-assignment administration use PostgreSQL, server-managed sessions, and two roles: administrator and teacher. Student/guardian access and score publication are not implemented.

## Assets and trust boundaries

Password hashes and session hashes stay in PostgreSQL. The browser receives a random opaque session token in an HttpOnly cookie. The API resolves the active membership, school, and role for every request. Its database credential crosses the RLS boundary and must stay server-only. All API queries and assignment writes must independently enforce school scope.

## Threats and implemented controls

- Cross-school record disclosure: derive the school from the session; reject conflicting school IDs/slugs; scope every join; integration tests use two schools and foreign object IDs.
- Teacher access outside assignments: check assigned classes for roster reads and class/subject pairs for assessment reads. Administrators alone may create/remove assignments. Assignment targets must belong to the administrator's school and be active.
- Raw credential disclosure: passwords use salted, asynchronous scrypt (N=32768, r=8, p=3); session tokens use 32 random bytes and only their SHA-256 hashes are stored. Responses omit credential fields and logs redact cookies and authorization headers.
- Account guessing: generic login failures, equivalent password derivation for unknown users, and per-IP login rate limits. The global request limiter is process-local; shared deployments need a common store.
- Session reuse: login rotates the current browser session; expiry, logout, inactive users, inactive memberships, and inactive schools reject subsequent reads. Assignment revocation is checked on every subsequent query. An already-rendered view is not remotely erased until the next request or sign-out.
- CSRF and credentialed CORS: allow exact configured origins only; mutations require a custom verification header and login/POST requires JSON. Production uses Secure, HttpOnly, SameSite=Lax cookies. Keep frontend and API same-origin or same-site.
- Direct Supabase Data API access: RLS is enabled without browser policies and table privileges are revoked from public, anon, and authenticated roles. The API owns authorization; a leaked privileged database credential bypasses this boundary.
- Accidental data mixing: only sandbox state enters browser persistence. Database errors clear database records instead of showing sandbox data. Sign-out clears database state and cancels pending dashboard loads.
- Administrative misuse: assignment changes and successful session login/logout create audit events in the same transaction. Audit records contain actor, school, action, target ID, and timestamp rather than raw student records.

## Residual risks and limits

No password-reset/invitation flow, MFA, distributed limiter, or external audit review service exists yet. There is no claim that this demonstration is ready for real student records. Browser XSS can still issue authorized requests despite HttpOnly cookies; avoid unsafe HTML and review dependencies. CSV/Excel import/export remains a sandbox feature and needs a separate file-processing review before moving to server mutations. RLS here denies direct browser access; it does not replace API assignment checks for a privileged connection.

## Verification

The PostgreSQL integration suite exercises authorization, expiry, logout, cookie flags, request verification, rate limiting, audit writes, and foreign assignments. Browser tests exercise real cookie sign-in and assignment changes plus controlled failure states. Hosted deployment behavior, account recovery, and multi-instance operation require separate deployment checks.

Implementation references: [Node.js crypto](https://nodejs.org/api/crypto.html), [Fastify hooks](https://fastify.dev/docs/latest/Reference/Hooks/), and the repository's session/RBAC decision in ADR 0004.

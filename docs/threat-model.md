# School workflow threat model

## Scope

The synthetic database workflow supports administrators, teachers, students and guardians. Staff writes, CSV imports, publication snapshots, linked reports and manual account provisioning use PostgreSQL and server-managed sessions. Browser sandbox data remains separate.

## Assets and trust boundaries

Password hashes and session hashes stay in PostgreSQL. The browser receives a random opaque session token in an HttpOnly cookie. The API resolves the active membership, school, and role for every request. Its database credential crosses the RLS boundary and must stay server-only. All API queries and assignment writes must independently enforce school scope.

## Threats and implemented controls

- Cross-school record disclosure: derive the school from the session; reject conflicting school IDs/slugs; scope every join; integration tests use two schools and foreign object IDs.
- Teacher access outside assignments: check assigned classes for roster reads and class/subject pairs for assessment reads. Administrators alone may create/remove assignments. Assignment targets must belong to the administrator's school and be active.
- Raw credential disclosure: passwords use salted, asynchronous scrypt (N=32768, r=8, p=3); session tokens use 32 random bytes and only their SHA-256 hashes are stored. Responses omit credential fields and logs redact cookies and authorization headers.
- Account guessing: generic login failures, equivalent password derivation for unknown users, and separate per-IP login/recovery limits. Authenticated request budgets use verified membership IDs so different school users behind one proxy do not consume each other's budget; anonymous traffic uses normalized IPs. Limiting is process-local, so multiple API instances need a common store.
- Session reuse: login rotates the current browser session; expiry, logout, inactive users, inactive memberships, and inactive schools reject subsequent reads. Assignment revocation is checked on every subsequent query. An already-rendered view is not remotely erased until the next request or sign-out.
- CSRF and credentialed CORS: allow exact configured origins only; mutations require a custom verification header and login/POST requires JSON. Production uses Secure, HttpOnly, SameSite=Lax cookies. Keep frontend and API same-origin or same-site.
- Direct Supabase Data API access: RLS is enabled without browser policies and table privileges are revoked from public, anon, and authenticated roles. The API owns authorization; a leaked privileged database credential bypasses this boundary.
- Accidental data mixing: only sandbox state enters browser persistence. Database errors clear database records instead of showing sandbox data. Sign-out clears database state and cancels pending dashboard loads.
- Administrative misuse: assignment changes and successful session login/logout create audit events in the same transaction. Audit records contain actor, school, action, target ID, and timestamp rather than raw student records.

## Residual risks and limits

MFA, distributed rate limiting, automated account-message delivery and external audit review are not implemented. This demonstration is not ready for real student records. Browser XSS can still issue authorized requests despite HttpOnly cookies. RLS denies direct browser access; it does not replace API checks for a privileged connection. Reports and workspace lists are currently bounded by the synthetic dataset rather than server pagination and require measured scaling work for large schools.

## Write, report and account controls

- Assessment and score writes recheck class/subject assignment and school scope, lock scope records, validate roster membership and use a transaction. Assessment versions reject competing edits. Locked periods reject writes.
- Score imports have file/row/body limits. CSV header mapping happens in the browser, but the server independently checks normalized score states, points, duplicates and enrollment scope. Preview stores no score changes. Commit rechecks access and version, expires after 15 minutes, and is idempotent.
- Publications save immutable snapshots with policy/source versions. Students and guardians have no access to staff endpoints. Reports include only explicit school-scoped learner links; teacher reports also restrict subjects/classes. New drafts cannot silently replace published results.
- Invitation and recovery tokens use 32 random bytes, store only hashes, expire and can be used once. Administrative issuance requires the current password; recovery revokes all sessions. Existing accounts cannot be overwritten by an invitation. Public recovery requests use generic responses and endpoint rate limits.
- Tokens are returned once for manual verified delivery. The browser puts them in a URL fragment, removes the fragment when consumed and never writes it to localStorage. An administrator can still misuse legitimate access; recipient verification and audit review remain operational responsibilities.
- Audit events include mutation type, actor, target and amendment/publication reason. Users must not enter credentials or private notes in free-text reasons. No raw CSV file or score list is placed in audit events.

## Verification

PostgreSQL integration tests exercise scoped writes, competing saves, invalid imports, preview expiry/retries, immutable publications, linked reports, invitation/recovery expiry and session revocation, in addition to the existing access suite. Browser tests exercise staff writes, CSV rejection/commit, publication, learner reports and invitation acceptance. Hosted deployment and multi-instance operation require separate checks.

Implementation references: [Node.js crypto](https://nodejs.org/api/crypto.html), [Fastify hooks](https://fastify.dev/docs/latest/Reference/Hooks/), and the repository's session/RBAC decision in ADR 0004.

# API reference

All database routes require a valid `dashboard_session` cookie. The cookie is HttpOnly, uses `/api`, expires after eight hours, and is Secure in production. Responses use `Cache-Control: no-store`. Do not store tokens in localStorage. Browser fetches include `credentials: include`.

POST and DELETE requests require `X-Dashboard-Request: 1`. POST bodies use `Content-Type: application/json`. Cross-origin requests must match `CLIENT_ORIGIN` exactly. Collection and dashboard reads use the school membership resolved from the cookie; an explicit conflicting school selector is rejected.

| Method and path | Access | Behavior |
| --- | --- | --- |
| GET `/health` | Public | Process liveness, without testing PostgreSQL readiness |
| POST `/api/v1/auth/login` | Public, rate-limited | JSON `{email,password,schoolSlug}`; rotates current cookie session |
| GET `/api/v1/auth/session` | Signed in | `{data:{membershipId,schoolId,schoolName,schoolSlug,userId,displayName,role}}` |
| POST `/api/v1/auth/logout` | Idempotent | JSON `{}`; deletes the server session and clears the cookie |
| GET `/api/v1/students` | Admin/teacher | Cursor-paginated scoped roster, optional `limit` (1?100), `after`, `schoolId` |
| GET `/api/v1/dashboard-data` | Admin/teacher | Scoped dashboard data, optional matching `schoolId` or `schoolSlug` |
| GET `/api/v1/admin/access` | Administrator | School teachers, active classes/subjects, and assignment IDs |
| POST `/api/v1/admin/teaching-assignments` | Administrator | JSON `{membershipId,classGroupId,subjectId}`; duplicate grants are idempotent |
| DELETE `/api/v1/admin/teaching-assignments/:id` | Administrator | Removes only an assignment in the signed-in school |

Student-list responses contain `{data: [...], page: {limit, nextCursor}}`. Follow `nextCursor` as `after` until it is null. Invalid queries return 400. Dashboard responses contain `{data:{students,subjects,grades,terms}}`; no permitted assessment data produces empty arrays. A student-term record has stable `id`, `studentId`, `termId`, `name`, `gender`, `grade`, `term`, and `scores`. Scores are percentages or null. A term label includes the academic year and the record key uses the term ID.

Subject totals normalize each recorded assessment to a percentage, multiply by its nonnegative weight, then divide by the total recorded weight. Missing/excused/incomplete scores and zero-weight assessments are excluded; no recorded weighted score yields null. Draft and submitted records are visible to authorized staff. This is a staff dashboard calculation, not a published official report or a versioned grading policy.

Errors use `{error:{code,message,requestId,fields:[]}}`. Codes include `UNAUTHENTICATED` (401), `INVALID_CREDENTIALS` (401), `FORBIDDEN` (403), `ORIGIN_DENIED` (403), `CSRF_REJECTED` (403), `VALIDATION_ERROR` (400), `INVALID_ASSIGNMENT` (400), `ASSIGNMENT_NOT_FOUND` (404), `RATE_LIMITED` (429), and `INTERNAL_ERROR` (500). SQL and stack details are not returned. Cross-school assignment IDs are not disclosed by delete responses.

Student profile creation and enrollment editing remain outside the current API. Assessment/score writes, publication, account provisioning and reports are described below. Public self-registration and arbitrary role escalation are not supported.

## School workflow endpoints

| Method and path | Access | Behavior |
| --- | --- | --- |
| GET `/api/v1/workspace` | Staff | Permitted classes, subjects, terms, assessments and policy |
| POST `/api/v1/assessments` | Assigned staff | Create draft; class/term year and date must agree |
| GET `/api/v1/assessments/:id` | Assigned staff | Assessment version and roster with score states |
| POST `/api/v1/assessments/:id/scores` | Assigned staff | `{version,reason,rows:[{enrollmentId,status,points,feedback}]}`; atomic versioned save |
| POST `/api/v1/grading-policies` | Administrator | Immutable `{passMark,goodMark,excellentMark,minimumScores}` version |
| POST `/api/v1/assessments/:id/publish` | Assigned staff | `{version,policyVersion,reason}`; snapshot and audit reason |
| POST `/api/v1/assessments/:id/import-preview` | Assigned staff | Score-save shape, at most 500 rows; preview ID or row errors, no score writes |
| POST `/api/v1/imports/:id/commit` | Preview owner | Recheck access/version and commit once; JSON `{}` |
| GET `/api/v1/reports` | Authenticated | Latest published snapshots and scoped totals |
| GET `/api/v1/admin/accounts` | Administrator | Memberships, recovery requests, students and 100 recent audit events |
| POST `/api/v1/admin/invitations` | Administrator, current password | `{email,displayName,role,studentIds,password}`; token for manual delivery |
| POST `/api/v1/admin/accounts/:id/recovery` | Administrator, current password | `{password}`; recovery token for verified manual delivery |
| POST `/api/v1/admin/accounts/:id/deactivate` | Administrator | JSON `{}`; revoke another membership and sessions |
| POST `/api/v1/auth/recovery-request` | Public, rate limited | `{email,schoolSlug}`; same response for known/unknown identities |
| POST `/api/v1/auth/redeem` | Public, rate limited | `{token,password}`; invitation acceptance or password recovery |

Every POST uses JSON and `x-dashboard-request: 1`. Score saves/previews permit 512 KB bodies; other requests retain the 16 KB limit. Preview expiry is 15 minutes. Stale versions yield HTTP 409 `VERSION_CONFLICT`; changed policy yields `POLICY_CHANGED`; locked periods yield `TERM_LOCKED`. Non-scored states require null points. Scored points must be finite and within the maximum. Wrong rosters and duplicates reject the whole save.

General requests allow 120 per minute per verified membership, or per normalized IP for anonymous requests. Login retains a separate 10-per-minute IP limit; recovery request and token redemption each allow five per 15 minutes per IP. Rate-limit failures use the stable `RATE_LIMITED` JSON envelope. Limiting is in memory and requires shared storage before running multiple API instances.

Published totals group by term, subject and policy version. They show assessment count, recorded count and weight denominator. Draft staff analytics remain advisory and separate from published calculations. New drafts and policies never rewrite existing publication snapshots.

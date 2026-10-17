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

The API has no student/score mutation, role-escalation, public registration, password-reset, or student/guardian reporting endpoints. Administrator assignment management is the only academic-access mutation in this release.

# School workflow

Use synthetic records only. The browser sandbox and database workspace have separate datasets.

## Staff

1. Sign in under School workspace with a seeded administrator or teacher account.
2. Open Assessment workspace → Create an assessment. Choose a permitted class, subject and term. The assessment date must lie within the term. Locked or archived terms reject writes.
3. Set maximum points and an assessment weight. A weight of zero excludes the assessment from totals.
4. Enter points with an explicit state. `scored` requires points, including zero. `missing`, `excused` and `incomplete` require blank points. Feedback is visible in published reports.
5. Save draft scores. A version conflict means another save won; reload and reapply the intended edits. Changing assessment selection or closing a tab warns about unsaved scores.
6. Enter a publication reason, review the policy, and publish. Previously published assessments require an amendment reason when editing. Learners continue seeing the last publication while a new draft is being corrected.

## Imports

CSV parsing and header mapping happen in the browser; the API validates every normalized row against the authorized roster and score rules. It stores a preview without writing scores. Files are limited to 256 KB and 500 rows; normalized requests to 512 KB. There is no server Excel import.

Use headers `studentNumber,status,points,feedback`. Map student number and points, plus optional state/feedback columns. A blank state defaults to missing for blank points and scored otherwise. The preview displays the first 20 source rows, total count and validation errors. Duplicate students, wrong rosters and out-of-range points prevent commit. Imports update only listed rows.

Previews expire after 15 minutes and belong to the initiating staff membership. Commit rechecks access, term state and assessment version, saves all rows in a transaction, and creates an audit event. Repeat commits are idempotent. A stale preview must be validated again.

## Grading and publication

An assessment percentage is `points / maximum points × 100`. Subject totals multiply each recorded percentage by its weight, sum those values, and divide by the sum of positive recorded weights. Non-scored states and zero-weight assessments are excluded. The minimum recorded-assessment requirement must be met; otherwise the report says insufficient evidence.

Administrators create immutable policy versions containing pass, good and excellent thresholds and a minimum evidence count. Defaults are 50%, 60% and 80%, with one recorded assessment required. Thresholds must strictly increase. Reports group totals by term, subject and policy version so incompatible versions are never silently mixed. They show recorded counts, total assessment counts, weight denominators and source versions. Risk flags require staff review and do not decide promotion or discipline.

A publication stores a snapshot with its source version, policy, score states and feedback. Reports use the latest publication per assessment. Changing draft scores or creating another policy leaves earlier snapshots unchanged. Staff can view class results through the published-report view; browser printing supports paper copies.

## Accounts

Students have one linked student; guardians have one or more. Staff do not use learner links. Administrators supply links when inviting an account. Cross-school links are rejected. Existing emails cannot be overwritten by invitations.

Invitation links expire after 24 hours, recovery links after 30 minutes. Tokens are random, hashed in the database and single use. The recipient opens the link, switches to School workspace, and sets a password in Account help. The fragment is removed from the address bar and tokens are not stored in browser storage. Passwords need 12–128 characters.

Recovery requests return the same response for known and unknown emails. Eligible requests appear in the administrator account table. After verifying the recipient's identity through a trusted channel, an administrator reauthenticates and issues a link. Recovery changes the user's password and revokes all their sessions across schools. It never activates a deactivated membership. New links invalidate older links of the same kind. No email provider is configured and no account messages are sent automatically.

Deactivating a school membership revokes its sessions. Administrators cannot deactivate themselves. Inactive memberships cannot sign in or use saved recovery links. Reactivation, existing-account cross-school invitations, and a guardian relationship-verification service are not included.

## Demo accounts

Run the academic seed and account seed in a synthetic database. Accounts are `admin@demo.example`, `teacher@demo.example`, `student@demo.example`, and `guardian@demo.example`, school code `accra-demo-jhs`. Passwords come from `DEMO_ADMIN_PASSWORD`, `DEMO_TEACHER_PASSWORD`, `DEMO_STUDENT_PASSWORD` and `DEMO_GUARDIAN_PASSWORD`. For compatibility, omitted learner passwords use the synthetic teacher password. Set separate values for shared demonstrations.

The teacher initially has Grade 7 / English access. Both learner accounts link to Ama Mensah (`ADJHS-2025-001`). Reports begin empty until staff publish assessments. Rerunning the account seed preserves passwords, memberships and access decisions. The academic seed replaces synthetic fixtures; do not rerun it over edited demo results you need to preserve.

## Public review access

The hosted portfolio has separate public reviewer accounts at teacher@portfolio.example, student@portfolio.example and guardian@portfolio.example. Use the role buttons in School workspace or the intentionally public credentials in the README. These are ordinary school-scoped memberships, not an authentication bypass. The teacher is assigned Grade 7 English; the learner and guardian are linked to Ama Mensah. Administrator credentials remain private. `npm run demo:seed` provisions these accounts without resetting school data or passwords.

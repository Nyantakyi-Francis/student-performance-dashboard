# ADR 0004: Use opaque server-managed sessions and assignment-aware RBAC

- Status: Accepted
- Date: 2026-08-30

## Context

The application will handle student records for administrators, teachers, students, and guardians. Authorization depends on both a broad role and relationships such as teaching assignment or guardian link.

## Decision

Use opaque session tokens delivered in secure, HTTP-only cookies. Store only a token hash in the database and support expiration and revocation.

Use role-based access control as the first permission layer, followed by resource checks:

- school membership for all protected access;
- teaching assignment for teacher access to classes, assessments, and scores;
- identity link for student access;
- verified guardian link for guardian access.

Authorization is enforced by the API for every operation. Frontend route guards are a usability feature only.

## Consequences

- Sessions can be revoked without waiting for a signed token to expire.
- Database access is required during session validation, subject to safe caching later.
- Authorization tests must cover two schools and every role.
- Cookie use requires an explicit CSRF assessment and appropriate controls.
- Sensitive audit events will record authentication, permission, import, export, and publication actions.

## Alternatives considered

### Long-lived JWT access tokens in browser storage

Rejected because revocation is harder and browser storage increases exposure to script-based token theft.

### Role checks without resource relationships

Rejected because a teacher role alone must not grant access to every class in a school.


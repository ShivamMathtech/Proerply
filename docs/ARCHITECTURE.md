# Architecture and invariants

## Frontend

`services/contracts.ts` declares Auth, Course, Search, Enrollment, LearningProgress, Quiz, Payment, Reminder, Chat, Profile, Certificate, Notification, and Admin interfaces. A single factory selects the browser demo or HTTP adapter based on `VITE_APP_MODE`. React pages use these services through TanStack Query; Zustand stores transient toast UI. Login/registration uses React Hook Form and Zod, with native browser constraints on other forms and authoritative Pydantic validation on the API.

The versioned demo store keeps separate activity for each local mock user. It detects invalid/missing/outdated store shapes and falls back to seeded state. Writes catch storage failures and show a warning. Demo data is never automatically uploaded to the backend. Payment fields are never persisted. Password-reset navigation temporarily keeps only a short-lived reset token in sessionStorage and removes it after use; passwords are not stored.

`route-registry.json` is the learner-screen source of truth. Each numbered entry specifies its component, path, title, layout, access requirement, and optional variant/example. `/my-learning`, `/achievements`, `/admin`, `/admin/courses/:courseId`, `/screens`, and `/about` are additional routes. `22_BG` is implemented as `BrandBackground` and has an inspectable `/brand` alias. `/screens` is generated from the same registry.

Design tokens are centralized in `styles.css` through CSS custom properties and Tailwind theme definitions. Accessible native buttons, labels, fieldsets, inputs, selects, dialogs, video controls, focus outlines, progress semantics, status/error text, skip links, and reduced-motion rules form the component system. Original CSS illustrations avoid network/image dependencies.

## Backend

FastAPI routes are split across `auth.py`, `learner.py`, `studio.py`, `payments.py`, and `calls.py`. `domain.py` owns enrollment, course editing, and achievement rules. Serializers publish consistent camelCase shapes matching the frontend. `schemas.py` validates requests and rejects unknown fields. SQLite uses foreign keys and rollback journaling. PostgreSQL is supported through SQLAlchemy and psycopg.

Relational tables cover roles, users, profiles, sessions, password resets, categories, instructors, courses, lessons, enrollments, progress, quizzes, questions, answer options, attempts, orders, payment events, reminders, conversations, members, messages, notifications, badges, achievements, certificates, audits, and call signaling.

## Security and consistency

- Role and ownership checks are server-side. Course editors can manage only their assigned courses; private messages and reminders require ownership/membership.
- Opaque random session tokens are stored as SHA-256 hashes; the cookie is HttpOnly, scoped to `/api`, and Secure in production. Requests that mutate protected state require the session CSRF token and an allowed Origin when Origin is supplied.
- Passwords use Argon2id. Password recovery limits attempts, expires after ten minutes, invalidates used codes/tokens, and revokes account sessions on reset.
- Unknown request fields cannot set role, user ownership, quiz scores, prices, or payment status. Protected values come from database records.
- Enrollment uniqueness is `(user_id, course_id)`. Progress uniqueness is `(user_id, lesson_id)`. Certificates and awarded badges also have uniqueness constraints. Savepoints make repeated insert attempts safe.
- Quiz correctness is not included in learner API responses. Attempts are scored server-side. Editing an assessment increments its revision, so an old passing attempt does not qualify for a new certificate against the revised quiz. Existing certificates retain issuance snapshots.
- Completion eligibility requires enrollment, all current lessons completed, and a passing attempt against the current quiz revision. Lesson completion is a learner attestation, not proctoring or proof of video watch time.
- Paid enrollment requires a verified signed provider event matched to a server-side order. The frontend cannot claim that a payment succeeded.
- Avatar input allows only bounded PNG/JPEG/WebP data URLs and rejects SVG/invalid signatures. No arbitrary HTML is rendered from lesson or message content.
- Request bodies are limited to 1 MB. Login, recovery, messages, quizzes, calls and checkout have in-process rate limits. Passwords/session/reset tokens are not logged.

## Operating scope

This is a working local and demo application with an extensible production-oriented structure. It is not a claim of audited production readiness. Rate-limit state is per process, mail delivery has no durable retry queue, the chat UI shows recent messages via polling, and no billing tax/refund/subscription or institutional accreditation workflow is included. Provider/hardware integrations require your configuration and acceptance testing.

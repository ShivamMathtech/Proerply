# Implementation and scope

## Delivered application

Proerply is an original responsive implementation of the supplied functional requirements. No reference UI-kit images were attached, so the design uses a navy/royal-blue palette, generous spacing, CSS course illustrations and shared responsive components. The full mapping of the 41 numbered learner screens is in [SCREENS.md](SCREENS.md) and in the app at `/screens`. Administrator and instructor tools are additional routes.

The frontend uses React, Vite, strict TypeScript, Tailwind, React Hook Form, Zod, TanStack Query, Zustand and Lucide icons. Shared layout/components implement desktop navigation, a mobile drawer and bottom navigation, responsive grids, form labels, loading/error/empty states and notification toasts. Forms and tables reflow or use contained scrolling on narrow screens.

`services/contracts.ts` defines the frontend boundary. `services/demo.ts` persists a versioned, browser-local demo. `services/api.ts` sends authenticated requests to FastAPI only when `VITE_APP_MODE=api`. A backend outage is an error, not a reason to substitute mock data. Browser demo accounts are simulations and have no security boundary.

The backend uses FastAPI, SQLAlchemy, Alembic and SQLite by default, with PostgreSQL support. Authentication uses hashed opaque server sessions with an HttpOnly cookie, CSRF protection, expiration, rotation and revocation. These server sessions intentionally replace a JWT implementation. Passwords use Argon2id; recovery codes and reset tokens are hashed and bounded by expiration/attempt limits. Roles and resource ownership are checked on the server.

## Functional boundaries

| Area | Included behavior | Configuration or scope limit |
|---|---|---|
| Course content | Six sample courses, 24 original reading lessons/exercises and 24 assessment questions | Sample catalog ratings/counts are illustrative; no copyrighted video library or review-submission system is bundled |
| Learning | Free enrollment, paid-course checkout, playlists, progress, assessment feedback/retries, badges and completion certificates | A certificate is app completion evidence, not accreditation; video playback requires your licensed media URL |
| Payments | Clearly labeled demo checkout; server-priced Stripe hosted checkout with signed webhook fulfillment | One-time USD purchases only; no subscriptions, discounts, tax engine, refunds, payouts or chargeback automation |
| Accounts | Registration, login/logout, recovery, profile editing, small image upload and public-profile controls | Demo recovery is simulated; real recovery needs SMTP outside local development |
| Reminders | Create/edit/delete/complete reminders, in-app due notifications and optional browser notification | App tab must remain open; there is no background push service or native alarm |
| Messaging | Simulated demo replies; private database-backed API conversations and participant access checks | Polling and bounded recent-message lists; no attachments, group chat, typing indicators or push delivery |
| Calls | Demo camera preview; authenticated two-person WebRTC offer/answer/end signaling | HTTPS, camera/microphone permission and STUN/TURN configuration are needed for dependable remote calls; no recording |
| Studio | Create/edit courses, lessons and quizzes; price and publish controls; instructor profiles; category creation; badge rules; analytics; roles; payment records; message moderation | Course removal is handled by unpublishing; physical deletion is not implemented. Category rename/delete is not provided. Demo moderation is limited to the current simulated account's conversations |
| Deployment | Standalone frontend demo, Vercel rewrites, separate API container, optional PostgreSQL Compose setup | Hosting, provider credentials and live deployment are not included |

Admin/instructor forms edit real persisted records in API mode. Instructors are restricted to their own courses. Administrators can manage roles and content; an administrator cannot remove their own administrator role through the role editor. The server rejects lesson/question IDs owned by another course. Editing assessment content advances its revision for future certificate eligibility; previously issued certificate snapshots remain intact.

## Data and operational limits

The SQLite database is created by Alembic, not shipped with private runtime data. The seed is repeatable and does not overwrite an existing user's password or an edited course. Demo users are allowed only in development with explicit seeding configuration. Production seeding creates shared reference definitions without privileged demo users or demo courses.

API endpoints impose list limits. The current interface is intended for a starter catalog and bounded recent conversations; large-scale browsing/history requires extending pagination in the UI. Request throttling is in-process, so multiple workers require a shared rate limiter. Email delivery is synchronous, without a durable retry queue. Plan backups, monitoring and provider alerts before a public launch.

The included `frontend/dist` is a prebuilt demo for a static web server with history fallback. Opening `dist/index.html` through `file://` is not supported. Use the launch script or `npm run preview` after installing frontend dependencies. Rebuild after changing code or any `VITE_*` setting.

The package contains source, lockfile, environment examples, migrations, tests, launchers and documentation. It deliberately excludes `node_modules`, Python virtual environments, `.env` files, local databases and generated test caches. Fresh dependency installation needs internet access. Once served locally, the browser-only demo does not need a backend or external assets.

See [VERIFICATION.md](VERIFICATION.md) for checks performed and [INTEGRATIONS.md](INTEGRATIONS.md) for service setup.

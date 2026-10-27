# Verification record

Verified for this ZIP on 27 October 2026 in a Linux development environment. This records the checks actually performed; it is not a claim of production deployment or universal device compatibility.

## Automated checks

| Check | Result | What it covers |
|---|---|---|
| Frontend `npm test` | **56 passed** | 41 registered screen renders, 11 demo-service tests, three API-adapter tests, one camera lifecycle test |
| Frontend `npm run build` | **Passed** | Strict TypeScript check and Vite production bundle |
| Frontend `npm run audit:routes` | **Passed** | All 41 required IDs, paths, page components and access declarations |
| Backend `python -m pytest -q` | **16 passed** | Authentication, authorization, ownership, enrollment, assessments, persistence, reset, payments and signaling |
| Alembic upgrade from a fresh SQLite database | **Passed** | Initial relational schema creates successfully |
| Repeatable development seed | **Passed** | Six courses and local demo accounts; existing records are preserved |
| `python -m alembic check` | **Passed** | No pending model/schema changes |
| SQLite `PRAGMA integrity_check` | **ok** | Freshly migrated and seeded local database |

There are **72 passing automated tests** in total. Screen-render tests check that each registered component renders its expected page without crashing. They do not exhaustively test every interaction on every screen.

Demo tests cover absence of API calls, filtering, paid enrollment and idempotence, certificate prerequisites, assessment scoring, retry behavior, local persistence, user isolation, recovery from corrupt stored JSON, role-aware editing, and reset. An additional regression test verifies that checkout, reminders and chat work when `crypto.randomUUID` is absent on an HTTP preview origin.

API tests use disposable SQLite databases. They check Argon2 password storage, input rejection, CSRF, session rotation/revocation, instructor access boundaries, duplicate enrollments, certificate rules, reminder ownership, private chat delivery, public-profile privacy, course/question ID ownership, single-use reset tokens, forged payment rejection, disabled-provider behavior, idempotent verified payment fulfillment, seed repeatability, call-participant authorization, request size limits, origin checks and throttling. The payment fulfillment test supplies an already verified event to the fulfillment function; it does not perform a live Stripe transaction.

The API-adapter tests verify credentialed requests, obtaining CSRF before protected mutations, logout after session refresh, and no automatic demo fallback on API failure. The camera test uses a mocked media stream and verifies that access starts only after a click and tracks stop on unmount; it does not activate real hardware.

The backend test run reports one upstream Starlette/AnyIO deprecation warning. It does not fail the suite. The package manager also reports an environment-specific proxy configuration warning during local commands.

## Interactive browser checks

The app was opened in a real Chromium browser through the development preview. Checks included:

- Desktop home dashboard, navigation, lesson playlist and lesson completion.
- Saved React lesson progress still present after navigation/reload.
- Layout inspection in 390 px mobile and 768 px tablet iframe viewports, with no horizontal overflow on the inspected pages. A vertical scrollbar reduces the usable document width on some pages.
- Mobile navigation opening, course discovery and course details.
- Mobile simulated checkout, successful enrollment, and navigation to the unlocked design-course curriculum.
- A detected HTTP-preview UUID issue was fixed with a `crypto.getRandomValues` fallback; the checkout journey then succeeded and a regression test was added.

Responsive rules are implemented across the shared layout and page components. This was a representative browser smoke check, not a visual inspection of all 41 screens at every possible resolution. Mobile testing used desktop Chromium with narrow viewports, not physical iOS/Android devices.

## Included but not executed here

- The Playwright suite in `frontend/tests/journey.spec.ts` includes learning/certificate, checkout and reminder/profile/chat journeys. Run `npx playwright install chromium` followed by `npm run test:e2e` on your own machine. The suite was **not executed** in this environment.
- Windows `.bat` launchers were reviewed; they were **not executed on Windows**.
- Docker and PostgreSQL configuration was provided; runtime checks used **SQLite**.
- No Vercel deployment was created. SPA rewrite and build configuration are included.
- No live SMTP delivery, Stripe test/live payment, external video playback, browser notification permission, hardware camera/microphone, or two-participant WebRTC call was tested.
- No penetration test, load test, assistive-technology audit or formal WCAG certification was performed.

## Reproduce the core checks

```bash
cd frontend
npm ci
npm test
npm run audit:routes
npm run build
```

In a separate terminal after backend setup:

```bash
cd backend
python -m pytest -q
python -m alembic upgrade head
python -m app.seed
python -m alembic check
```

Use the backend virtual environment's Python. Keep development seeding disabled in production, and never run test/seed experiments against an existing production database. The ZIP excludes runtime databases, credentials, installed dependencies, temporary browser-QA pages and test caches.

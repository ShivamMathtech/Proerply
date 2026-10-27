# Proerply

**Learn Today. Build Tomorrow.** A responsive React + TypeScript learning application with a browser-only demo and a separately deployable FastAPI backend.

## Start here on Windows

1. Extract this ZIP completely. Do not run it from inside the ZIP viewer.
2. Install **Node.js 22.12+** (Node 22 LTS recommended).
3. Double-click **`start-demo.bat`**.
4. Open **http://localhost:5173**. The script installs dependencies; the demo needs no Python, database, API key, or backend.

For real local accounts and database persistence, install **Python 3.12** and double-click **`start-fullstack.bat`**. It installs dependencies, creates the database through Alembic, seeds the local accounts, and opens separate frontend/API windows. Close those windows to stop the services.

### Local development accounts

| Role | Email | Local API password |
|---|---|---|
| Learner | learner@proerply.demo | DemoPass123! |
| Instructor | instructor@proerply.demo | DemoPass123! |
| Administrator | admin@proerply.demo | DemoPass123! |

Browser demo mode starts as Alex Morgan. `/login` also offers one-click role entry. Demo authentication is intentionally a mock: it accepts a known demo email and any password of at least eight characters, stores no password, and offers no security boundary. Never use real credentials in the demo.

API mode uses Argon2id password hashes and revocable server sessions. Local seeded accounts are created only when `SEED_DEMO_USERS=true` outside production. The seed command never replaces existing account passwords or overwrites edited courses. Change `SEED_PASSWORD` before first seeding if desired.

## Deploy the standalone demo to Vercel

The safest first deployment is the frontend only:

1. Put the extracted `proerply` project in your Git repository and import it into Vercel.
2. Set **Root Directory: `frontend`**.
3. Select the Vite preset. Use **Install: `npm ci`**, **Build: `npm run build`**, **Output: `dist`**.
4. Set **`VITE_APP_MODE=demo`**. No other environment variables are required.
5. Deploy. Direct links such as `/courses/design` and `/learning/react/playlist` work through the included SPA rewrite.

If your Vercel root is the entire `proerply` directory, the root `vercel.json` is also configured: it installs/builds the frontend and serves `frontend/dist`. Do not combine root-directory settings from these two options.

Demo is the default whenever `VITE_APP_MODE` is absent. API mode is selected only by the exact value `api`. An unavailable API never silently switches a user into demo mode. Changing a `VITE_*` environment variable requires a new build/deployment.

**No Vercel deployment was performed for this ZIP.** The production build and configuration were verified locally. See [deployment details](docs/DEPLOYMENT.md).

## Included features

- All **41 numbered screens**, centralized in `frontend/src/route-registry.json`; inspect them in the app at `/screens`.
- Desktop sidebar, tablet layout, mobile bottom navigation, responsive forms and cards.
- Four-step onboarding, login/registration, reset-code flow, notification preferences, profile editing and image upload.
- Six original sample courses, 24 reading lessons, 24 quiz questions, five categories, three instructor profiles.
- Course discovery, keyword/instructor search, category/level/rating/duration/price filters, sorting and search history.
- Free enrollment, labeled simulated checkout, and optional Stripe hosted checkout in API mode.
- Course playlists, lesson completion, optional licensed-video playback with position persistence, quizzes, answer review and retries.
- Rule-based badges and certificates; print certificates or save them as PDF using the browser print dialog.
- Reminder CRUD, in-app notification scheduling, demo conversations, real database-backed private messaging, public profile privacy controls.
- Local camera preview in demo mode; authenticated two-person WebRTC signaling in API mode.
- Admin/instructor studio: course/lesson/quiz editors, prices, publishing, user roles, category creation, instructor profiles, badge rules, analytics, payment records and message moderation.
- SQLite migrations and repeatable seeding; PostgreSQL connection support and optional Docker Compose.

## Project structure

```text
proerply/
  frontend/          React, Vite, strict TypeScript, Tailwind, services, tests
  backend/           FastAPI, SQLAlchemy, Alembic, seed, API tests
  docs/              Architecture, deployment, API, screen registry, verification
  scripts/           Windows launch helpers and Unix demo launcher
  start-demo.bat
  start-fullstack.bat
  docker-compose.yml
  vercel.json
```

## Manual frontend setup

```bash
cd frontend
npm ci
npm run dev
```

Additional commands:

```bash
npm run build
npm run preview
npm run test
npm run audit:routes
```

For API mode copy `frontend/.env.example` to `frontend/.env.local` and set:

```dotenv
VITE_APP_MODE=api
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

For demo mode, leave `VITE_APP_MODE=demo`. The API URL is ignored in demo mode. Use the same hostname for both frontend and backend locally (`localhost` is recommended); mixing `localhost` and `127.0.0.1` can prevent session cookies from working.

## Manual backend setup — Windows PowerShell

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Copy `.env.example` only if `.env` does not already exist. On macOS/Linux use `python3 -m venv .venv` and `.venv/bin/python` instead.

- API documentation: **http://localhost:8000/docs**
- Health check: **http://localhost:8000/api/v1/health**
- Default database: `backend/data/proerply.db`
- Local reset-code mailbox without SMTP: `backend/data/dev-mailbox/*.json` (never committed or served publicly)

The backend uses secure server sessions rather than JWTs. Session identifiers are opaque, hashed in the database, and sent in an HttpOnly cookie. Mutations also require a CSRF header. `/auth/refresh` rotates the session and `/auth/logout` revokes it. A successful password reset revokes every session for that account.

## Testing

```bash
# frontend/
npm test
npm run audit:routes
npm run build

# backend/ with its environment activated
python -m pytest -q
python -m alembic check
```

The included Playwright suite can be run on your computer:

```bash
# frontend/
npx playwright install chromium
npm run test:e2e
```

See [VERIFICATION.md](docs/VERIFICATION.md) for checks actually run and their limits. The Playwright suite is provided but was not executed in the build environment; browser QA used the available interactive browser.

## Integrations and important boundaries

- **Email:** SMTP is optional locally; configure it for real reset delivery. Development mode clearly reports that no email is sent and writes a local mailbox file.
- **Payments:** demo payments are simulated. API mode requires Stripe keys and a signed webhook. The success URL alone cannot create enrollment. Card details are entered only on Stripe's hosted page. The demo add-card screen uses a fixed test number and stores no card number/CVV.
- **Video lessons:** no copyrighted videos are bundled. Original reading content remains usable with no video. Add an HTTPS URL for media you have permission to use in the instructor editor.
- **Calls:** demo calls are a local camera preview. API calls use real WebRTC offer/answer signaling. Configure STUN/TURN and HTTPS before relying on cross-network calls. No call recording is implemented.
- **Reminders:** browser notifications run while an app tab is open and permission is granted; they are not an operating-system background scheduler.
- **Certificates:** certificates indicate completion in this app, not accreditation. Existing certificates preserve the name/course title at issuance even if a course is edited later.
- **Demo persistence:** local to this browser/device. Changing modes does not import demo data into the server.
- **Scale:** API list limits and in-process rate limiting suit a local/small deployment. Use distributed rate limiting, backups, monitoring, and a durable mail worker before a high-traffic production launch.

No UI-kit image was attached to the requirements. The visual implementation follows the requested navy/royal-blue direction with original CSS illustrations, rather than claiming a pixel-for-pixel match to unseen screens.

Read [INTEGRATIONS.md](docs/INTEGRATIONS.md), [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md), and [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for configuration and known scope limits.

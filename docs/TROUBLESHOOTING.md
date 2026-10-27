# Troubleshooting

| Problem | What to check |
|---|---|
| `vite` is not recognized | Run `npm ci` inside `frontend` before `npm run dev`. Use the local npm script, not a global Vite installation. |
| Rollup platform error on Windows | Delete copied `node_modules`, keep `package-lock.json`, and run `npm ci` on Windows. ZIP delivery intentionally excludes installed packages. |
| npm timeout | Check your network/proxy and registry settings, then retry `npm ci`. Do not disable TLS verification. |
| Vercel blank screen | Start in `VITE_APP_MODE=demo`, select the correct root/output directories, and redeploy after environment changes. Review the build log. |
| Vercel deep link gives 404 | Ensure the selected root contains its matching `vercel.json`; the SPA rewrite must point to `/index.html`. |
| Backend unavailable | In API mode, start FastAPI and verify `/api/v1/health`. Demo mode intentionally makes no backend request. |
| CORS error | Set `CORS_ORIGINS` to the exact frontend origin, including scheme and port, with no trailing slash. Restart FastAPI. |
| Login does not stick | Use `localhost` for both local apps. Cross-site hosted cookies require HTTPS/SameSite configuration and may be blocked by browser privacy settings. |
| CSRF error after refreshing | Reload the page so the API adapter obtains the current CSRF token. Do not bypass server CSRF checks. |
| Database not initialized | From `backend`, run `python -m alembic upgrade head`, then `python -m app.seed`. |
| No seeded accounts | Copy the development environment example; set `SEED_DEMO_USERS=true` and a `SEED_PASSWORD` of at least 12 characters before running the seed. Never enable this in production. |
| Existing seed password unchanged | Seeding preserves users. Use the password-reset flow or create a separate account; it does not silently overwrite existing passwords. |
| Python package install fails | Prefer Python 3.12 x64. Recreate `.venv` with Python 3.12 rather than mixing interpreter versions. |
| Port 5173 or 8000 occupied | Stop the previous app in its terminal, or choose a new port and update `VITE_API_BASE_URL`, `FRONTEND_URL`, and `CORS_ORIGINS` consistently. |
| No reset email | In development without SMTP, inspect `backend/data/dev-mailbox/`; no real email is sent. Production needs a configured SMTP provider. |
| Payment cannot start | API mode requires backend Stripe and webhook credentials. Frontend demo checkout is available without these credentials. |
| Payment pending on return | Wait for the verified provider webhook and refresh status. A redirect never directly marks an order paid. |
| No course video | Sample courses are original reading lessons. Add an authorized HTTPS video URL through the instructor editor. |
| No certificate | Finish every current lesson and pass the current assessment at the required score. Editing a quiz invalidates earlier attempts for new eligibility; issued certificates remain historical snapshots. |
| Camera access denied | Check HTTPS/localhost, browser permission, camera use by other apps, and device availability. Demo mode is only a local preview. |
| Remote call never connects | Check that the other participant joined, signaling succeeded, and STUN/TURN is configured for both networks. |
| Browser changes disappear | Private browsing, storage restrictions, or clearing site data can erase demo data. API mode is required for synchronized persistence. |
| Database stored on a sync/network drive | Use a local disk for SQLite. Do not live-sync an open SQLite database; use a consistent backup or PostgreSQL for a server deployment. |

Before resetting anything, back up your data. The development ZIP does not ship a database, live account data, `.env`, installed dependencies, or credentials.

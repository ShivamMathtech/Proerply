# Deployment

## Standalone Vercel demo

Use `frontend` as the Vercel root directory with the Vite preset, `npm ci`, `npm run build`, and output `dist`. Set `VITE_APP_MODE=demo`. The included `frontend/vercel.json` provides the SPA history rewrite. Root-level deployment also works through the separate root `vercel.json`; choose one root and follow its commands consistently.

Node 22.12+ is required. Do not upload `node_modules`, `.venv`, `.env`, or local databases to Git. Build a clean checkout using the committed frontend lockfile. Use `npm ci` to reproduce dependencies on Windows; do not copy Linux-installed `node_modules` onto Windows.

Test a direct refresh on `/courses/react` after deployment. If it returns 404, check that Vercel is reading the `vercel.json` inside the selected root directory. A ZIP is a source delivery, not a Vercel project import URL; extract it and push the files to your repository first.

## Connected backend

Host FastAPI as a separate Python process/container. Do not place the continuously running API in the Vite static output folder. The Dockerfile runs migrations and the seed command before Uvicorn; run migrations once as a release task when scaling to multiple instances.

Typical server configuration:

```dotenv
APP_ENV=production
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/proerply
FRONTEND_URL=https://learn.example.com
CORS_ORIGINS=https://learn.example.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
SEED_DEMO_USERS=false
SEED_PASSWORD=
```

Use real domains and secret values supplied by your hosting provider. Percent-encode special characters in database URL credentials. Keep all payment, SMTP and TURN secrets on the backend. The only frontend configuration is:

```dotenv
VITE_APP_MODE=api
VITE_API_BASE_URL=https://api.example.com/api/v1
```

Prefer frontend/backend custom domains under the same registrable domain. For cross-site hosting, `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` are required; browsers that block third-party cookies may still reject the session. A same-site custom-domain setup is more reliable. Restrict CORS to the exact frontend origins. CORS and CSRF checks are both enabled.

Create an administrator explicitly on the server after migrations:

```bash
python -m app.seed
python -m app.create_user --email you@your-domain.com --name "Your Name" --role admin
```

The command prompts for a password without echoing it. A production seed creates only roles, categories and badge definitions. It creates no demo privileged accounts or courses. Register instructors or create them with `app.create_user --role instructor`, then create courses in the studio.

For a local PostgreSQL demonstration, set `POSTGRES_PASSWORD` and optionally `SEED_PASSWORD` in your shell or an untracked root `.env`, then run `docker compose up --build`. The API binds to localhost:8000; run the frontend separately in API mode. Docker/PostgreSQL execution was not available for live testing in this build environment.

## Reliability

Use HTTPS, database backups, health probes, secret management and provider webhook monitoring. The bundled rate limiter is per process; replace it with a shared limiter when using multiple workers. Add a durable email queue if reset delivery needs guaranteed retries. WebRTC signaling expires after one hour. Large-scale chat needs cursor-based loading/subscriptions beyond the included polling interface.

## Primary references used

- Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite
- Vercel rewrites: https://vercel.com/docs/rewrites
- FastAPI security concepts: https://fastapi.tiangolo.com/tutorial/security/
- Stripe Checkout fulfillment: https://docs.stripe.com/checkout/fulfillment

# UniPro FastAPI backend

REST API for internship listings, SmartMatch KPIs, CV extract, applications, and auth.

Authentication is **Supabase Email OTP**. Passwords are hashed and stored only in
Supabase `auth.users`. This API validates Supabase access tokens and reads the
public `users` profile table (id, email, role — never a password).

## Structure

```
backend/
  Dockerfile
  requirements.txt
  supabase/migrations/
    001_auth_users_trigger.sql
  app/
    main.py
    config.py
    database.py
    models.py
    schemas.py
    auth.py
    matching.py
    seed.py
    routers/
      auth.py
      jobs.py
      match.py
      applications.py
      cv.py
      saved.py
```

## Supabase Dashboard (one-time)

1. **Authentication → Providers → Email:** enable **Confirm email**.
2. **Authentication → Email Templates → Confirm signup:** send a 6-digit code with `{{ .Token }}` (not the magic link).
3. **Authentication → URL Configuration:** add your Vite origin (e.g. `http://localhost:3000`).
4. Copy into env:
   - Project URL + anon key → frontend `VITE_SUPABASE_*`
   - **JWT Secret** (Settings → API) → backend `JWT_SECRET`
   - Postgres URI (Settings → Database) → backend `DATABASE_URL`

## Apply the auth SQL migration

In the Supabase SQL Editor, paste and run:

[`supabase/migrations/001_auth_users_trigger.sql`](supabase/migrations/001_auth_users_trigger.sql)

This creates `public.users`, the `handle_new_user` trigger on `auth.users`, and RLS policies.

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes (prod) | Supabase Postgres URI, e.g. `postgresql+psycopg2://postgres:...@db.<ref>.supabase.co:5432/postgres` |
| `JWT_SECRET` | yes | Supabase **JWT Secret** (not the anon key) |
| `JWT_AUDIENCE` | no | Default `authenticated` |
| `CORS_ORIGINS` | no | Default `http://localhost:3000` |
| `SEED_ON_STARTUP` | no | Set `false` when using Supabase (users FK → `auth.users`) |
| `GEMINI_API_KEY` | no | Enables Gemini-backed CV extract |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | no | Optional; auth is handled by the frontend |

## Quick start (point at Supabase)

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\activate
pip install -r requirements.txt

$env:DATABASE_URL="postgresql+psycopg2://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
$env:JWT_SECRET="YOUR_SUPABASE_JWT_SECRET"
$env:SEED_ON_STARTUP="false"
$env:CORS_ORIGINS="http://localhost:3000"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs  

### Local Docker Postgres (jobs seed only)

```bash
docker compose up --build
```

Use only for offline listing seed. For real login, use Supabase Auth + set `DATABASE_URL` / `JWT_SECRET` from your project.

## Auth flow

1. Frontend `supabase.auth.signUp({ email, password, options: { data: { role, full_name } } })`
2. Trigger inserts `public.users` with the same UUID
3. User enters the 6-digit email OTP → `verifyOtp({ type: 'signup' })` → session
4. Frontend calls `GET /auth/me` with `Authorization: Bearer <access_token>`
5. FastAPI verifies the JWT with the project JWT secret (`aud=authenticated`) and loads `public.users` by `sub`

## Sample curl

```bash
# Replace TOKEN with a Supabase session access_token from the browser
curl -s http://localhost:8000/auth/me ^
  -H "Authorization: Bearer TOKEN"

curl -s http://localhost:8000/jobs
```

## Matching KPIs

- **HSCR** = `|required ∩ candidate| / |required|` (1.0 if required empty)
- **SGI** = `1 - HSCR`
- **SSSA** = cosine similarity of embeddings when both present; otherwise hashed bag-of-skills vectors, with Jaccard on skill sets as a final fallback (see `app/matching.py`)

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/auth/me` | Bearer = Supabase access token |
| GET | `/jobs` | open internships (frontend Job shape) |
| GET | `/jobs/{id}` | single job |
| POST | `/cv/extract` | ephemeral extract (no DB write) |
| POST | `/cv/analyze` | student auth; multipart CV → skills + embedding only (file discarded) |
| POST | `/match` | student auth; upsert matches |
| GET | `/matches` | stored matches |
| POST | `/applications` | `{ "internship_id": "..." }` |
| GET | `/applications` | list |
| PATCH | `/applications/{id}` | `{ "status": "..." }` |
| POST/DELETE/GET | `/saved/...` | saved internships |
| GET | `/health` | liveness |

`POST /auth/register` and `POST /auth/login` have been removed — use Supabase Auth on the client.

## Railway

See [`../RAILWAY.md`](../RAILWAY.md) for production Docker, env vars, Supabase Auth URL allowlist, and post-deploy smoke checks.

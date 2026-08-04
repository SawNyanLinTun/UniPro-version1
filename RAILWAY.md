# Railway deploy guide (UniPro)

Single database: **Supabase only**. Railway hosts compute (API + web).

Do **not** commit `.env` files. Set secrets in the Railway dashboard.

## Services

Create one Railway project with **two services** from the same GitHub repo:

| Service | Root directory | Dockerfile |
|---------|----------------|------------|
| **api** | `backend` | [`backend/Dockerfile`](backend/Dockerfile) |
| **web** | `.` (repo root) | [`Dockerfile`](Dockerfile) |

Use the included [`backend/railway.toml`](backend/railway.toml) and [`railway.toml`](railway.toml).

## API variables

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | yes | Supabase **pooler** URI (session/transaction). Example shape that worked in Bangkok/office networks: `postgresql+psycopg2://postgres.<ref>:***@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require` |
| `JWT_SECRET` | yes | Supabase **JWT Secret** (Settings → API), not the anon key |
| `JWT_AUDIENCE` | no | Default `authenticated` |
| `CORS_ORIGINS` | yes | Exact Railway web URL, e.g. `https://web-xxx.up.railway.app` (comma-separate if multiple) |
| `INIT_DB_ON_STARTUP` | yes | `false` |
| `SEED_ON_STARTUP` | yes | `false` |
| `GEMINI_API_KEY` | no | Omit for now; CV analyze uses heuristic skills; embeddings skipped |

## Web variables (needed at **Docker build** time)

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | yes | anon / publishable key |
| `VITE_API_URL` | yes | Public API URL, e.g. `https://api-xxx.up.railway.app` (no trailing slash) |

On Railway: mark these as available for the build, or pass as Docker build args matching the `ARG` names in the root `Dockerfile`. Redeploy **web** after the API public URL is known.

## Supabase Auth URL allowlist (after first deploy)

1. Supabase → **Authentication → URL Configuration**
2. Add Site URL = your Railway **web** origin
3. Add Redirect URLs for that origin (and `http://localhost:3000` for local)

## Deploy order

1. Push repo to GitHub (confirm `.gitignore` ignores `.env`)
2. Create **api** service → set API env → deploy → copy public URL
3. Create **web** service → set `VITE_*` including `VITE_API_URL` → deploy
4. Set `CORS_ORIGINS` on api to the web URL → redeploy api
5. Update Supabase Auth URLs
6. Run the smoke checklist below

## Smoke checklist (post-deploy)

- [ ] `GET https://<api>/health` → `{"status":"ok"}`
- [ ] `GET https://<api>/jobs` → JSON array (seeded internships)
- [ ] Open web → Register → OTP email → signed in
- [ ] SmartMatch → upload CV while signed in → skills returned; `cv_stored` false
- [ ] Continue to match → results; rows appear in Supabase `matches`
- [ ] Table Editor: `internships` exists; **no** `jobs` table

## Local Docker smoke (optional)

```bash
# API (from backend/)
docker build -t unipro-api .
docker run --rm -p 8000:8000 --env-file .env -e PORT=8000 unipro-api

# Web (from repo root) — replace placeholders
docker build -t unipro-web \
  --build-arg VITE_SUPABASE_URL=https://YOUR_REF.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=YOUR_ANON \
  --build-arg VITE_API_URL=http://localhost:8000 \
  .
docker run --rm -p 3000:80 -e PORT=80 unipro-web
```

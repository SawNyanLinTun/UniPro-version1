# Cloudflare Pages deploy guide (UniPro frontend)

This covers the **frontend only** (Vite/React SPA). The FastAPI backend
(`backend/`) uses SQLAlchemy + psycopg2 + pypdf and needs a real Python
runtime, so it stays on Railway (see [`RAILWAY.md`](RAILWAY.md)) — Cloudflare
Workers cannot run it as-is. Point the Pages site at your Railway API via
`VITE_API_URL`.

The app uses `HashRouter` (routes like `/#/browse`), so it's a plain static
build with no server-side rewrite rules needed — Cloudflare Pages serves it
out of the box.

## 1. Connect the repo

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Pick this repository and the branch to deploy (e.g. `main`).
3. Build settings:
   | Setting | Value |
   |---|---|
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `/` (repo root — leave `backend/` untouched) |

   (`wrangler.toml` at the repo root already declares these, so the Pages
   project should pick them up automatically.)

## 2. Environment variables (build time)

These are inlined into the JS bundle at build time by Vite, so set them
under **Settings → Environment variables** for both **Production** and
**Preview**, then trigger a new deployment after changing any of them:

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | yes | anon / publishable key |
| `VITE_API_URL` | yes | Public URL of the Railway API, e.g. `https://api-xxx.up.railway.app` (no trailing slash) |
| `GEMINI_API_KEY` | no | Used client-side by `services/geminiService.ts`; omit to skip AI recommendations |

## 3. After first deploy

1. Copy the `*.pages.dev` URL Cloudflare assigns (or your custom domain once
   attached under **Custom domains**).
2. Update the API's `CORS_ORIGINS` (Railway `api` service) to include this
   URL, then redeploy the API.
3. Supabase → **Authentication → URL Configuration**: add the Pages URL as
   a Site URL / Redirect URL.

## 4. Custom domain (optional)

**Workers & Pages → your project → Custom domains → Set up a domain.**
Cloudflare manages the DNS/SSL automatically if the domain's nameservers
are already on Cloudflare.

## Local check before connecting

```bash
npm ci
npm run build
npx wrangler pages dev dist
```

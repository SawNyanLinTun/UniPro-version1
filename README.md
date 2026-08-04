# UniPro

University-to-internship platform for students in Thailand, with AI-assisted **SmartMatch**, 
internship browse/apply flows, saved jobs, and a scholarship ledger UI.

## Features

| Area | What it does |
|------|----------------|
| Home | Landing / value proposition |
| Browse | Open internship listings |
| SmartMatch | CV skill extract + match scores (HSCR / SGI / SSSA) |
| Scholarship Ledger | Scholarship ledger UI |
| Saved / Applications / Profile | Auth-gated student flows |
| About | Platform story |
| i18n + theme | Language + light/dark controls |


## Tech stack

**Frontend:** Vite 6 · React 19 · TypeScript · React Router 6 · Tailwind CSS 4 · Supabase JS · Lucide · 

**Backend:** FastAPI · Uvicorn · SQLAlchemy 2 · PostgreSQL (Supabase) · python-jose · pypdf · Gemini embeddings 

**Infra:** Supabase (Auth + Postgres) · Docker / docker-compose · Railway (`api` + `web`) · nginx for production web




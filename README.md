![beenvoice Logo](public/beenvoice-logo.png)

# beenvoice-web

Web application and API for **beenvoice** — invoicing for freelancers and small businesses. Includes the Next.js dashboard, tRPC API, better-auth, PostgreSQL persistence, PDF/email delivery, time tracking, and an MCP automation endpoint.

**Repository:** [git.soconnor.dev/soconnor/beenvoice-web](https://git.soconnor.dev/soconnor/beenvoice-web)  
**Architecture:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)  
**Mobile companion:** [beenvoice-app](https://git.soconnor.dev/soconnor/beenvoice-app) (separate repo; often checked out beside this one in a workspace)

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js 16 App Router, React 19 |
| API | tRPC 11 + SuperJSON |
| Database | PostgreSQL 17, Drizzle ORM |
| Auth | better-auth (email/password, optional Authentik OIDC, Expo mobile) |
| UI | shadcn/ui, Tailwind CSS v4 |
| Email / PDF | Resend, `@react-pdf/renderer` |
| Runtime | Bun |

## Features

- Clients, businesses, invoices (line items, tax, status workflow)
- Time clock with one running timer per user; clock-out can append invoice lines
- Expenses, payments, recurring invoices, invoice templates
- PDF export and email delivery (Resend)
- Public invoice links (`/i/[token]`)
- CSV import, reports, platform branding / admin settings
- MCP API (`/api/mcp`) for automation via API keys (`bv_…`)
- Optional Authentik OIDC SSO

## Prerequisites

- [Bun](https://bun.sh) 1.x
- Docker & Docker Compose (for PostgreSQL locally or full-stack deploy)
- Git

## Local development

### 1. Clone and install

```bash
git clone https://git.soconnor.dev/soconnor/beenvoice-web.git
cd beenvoice-web
bun install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` for local dev. Minimum:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
DB_DISABLE_SSL=true
AUTH_SECRET=your-dev-secret          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Email and SSO are optional for local work — leave `RESEND_*` and `AUTHENTIK_*` blank unless you need them.

### 3. Database

Start Postgres (dev compose exposes port 5432):

```bash
docker compose -f docker-compose.dev.yml up -d
```

Apply schema (pick one):

```bash
bun run db:push      # fast iteration during development
# bun run db:migrate # same migrations the Docker image runs in production
```

### 4. Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), register at `/auth/register`, then sign in.

## Docker deployment (app + database)

The production compose file runs the Next.js app and PostgreSQL.

**Container startup** runs `bun migrate.ts && bun run start` (see `Dockerfile`). Drizzle only applies **pending** migrations — safe to run on every restart; already-applied migrations are skipped.

The Docker **build** uses a low-memory profile (React Compiler off, webpack memory optimizations, 2GB Node heap cap). Give Docker/Colima at least **3–4GB RAM** for builds. If it still OOMs, raise VM memory (`colima start --memory 6`) — avoid `--no-cache` unless debugging.

### 1. Configure

```bash
cp .env.example .env
```

Set at least:

```env
AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://your-public-hostname
NEXT_PUBLIC_APP_URL=https://your-public-hostname
```

`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must match the URL users actually use in the browser (scheme + host + port). If they point at `localhost` but you access the app via another hostname, sign-up and sign-in will fail (often with a vague **"REQUIRED"** toast).

`NEXT_PUBLIC_*` values are embedded at **image build** time. Rebuild after changing `NEXT_PUBLIC_APP_URL`, white-label defaults, or `NEXT_PUBLIC_AUTHENTIK_ENABLED`:

```bash
docker compose build --no-cache app
```

`BETTER_AUTH_URL` and `AUTH_SECRET` are read at **container runtime** from `.env` — you can change them without rebuilding, then restart the app container.

### 2. First start (or after code changes)

```bash
docker compose up -d --build
```

`--build` is important. A plain `docker compose up -d` reuses the existing image and **does not** pick up new code from `git pull`.

App listens on `${WEB_PORT:-3000}`. Postgres stays on the internal compose network.

### 3. Updating an existing deploy

```bash
git pull
docker compose up -d --build   # rebuild image, restart app, run any new migrations
```

| Command | New code? | Migrations run? |
|---------|-----------|-----------------|
| `git pull` only | No | No |
| `docker compose up -d` (no `--build`) | No — old image | Only if the app container restarts (same image) |
| `docker compose up -d --build` | Yes | Yes — on app container start |
| `docker compose restart app` | No | Yes — migrate runs again (no-op if up to date) |

To verify migration files match the journal before deploy: `bun run db:verify-journal`.

### 4. Sign-ups

Registration is **enabled** by default. To block new email/password accounts:

```env
DISABLE_SIGNUPS=true
```

Use the literal strings `true` or `false` (or omit the variable). Do not rely on bare boolean coercion from shell/compose — the app parses these explicitly.

### 5. Optional services

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY`, `RESEND_DOMAIN` | Invoice and password-reset email |
| `AUTHENTIK_ISSUER`, `AUTHENTIK_CLIENT_ID`, `AUTHENTIK_CLIENT_SECRET` | OIDC SSO (also set `NEXT_PUBLIC_AUTHENTIK_ENABLED=true` and rebuild) |
| `CRON_SECRET` | Protects `/api/cron/generate-recurring` |
| `DISABLE_SIGNUPS=true` | Block new registrations |

## Project structure

```
beenvoice-web/
├── src/app/              # Routes (dashboard, auth, /api/*)
├── src/server/api/       # tRPC routers
├── src/server/db/        # Drizzle schema, pool, migrate.ts
├── src/components/       # UI (ui/, forms/, layout/, branding/)
├── src/lib/              # auth, PDF, email, branding helpers
├── drizzle/              # SQL migrations
├── Dockerfile            # Production image (migrate + next start)
├── docker-compose.yml    # App + Postgres (deploy)
├── docker-compose.dev.yml # Postgres only (local dev)
└── docs/                 # Architecture and UI guides
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for routers, schema, auth flows, and MCP.

## Scripts

```bash
# App
bun run dev              # next dev --turbo
bun run build            # production build
bun run start            # next start
bun run check            # eslint + tsc

# Database
bun run db:push          # push schema (local dev)
bun run db:migrate       # run drizzle migrations
bun run db:generate      # generate new migration SQL
bun run db:studio        # Drizzle Studio

# Formatting
bun run lint
bun run lint:fix
bun run format:write
bun run typecheck

# Docker helpers (Postgres only — uses Colima on macOS)
bun run docker:up        # colima start + docker-compose.dev.yml up -d
bun run docker:down      # stop dev Postgres + colima
```

Full-stack deploy uses `docker compose up` (see [Docker deployment](#docker-deployment-app--database)), not `bun run docker:up`.

## API surface

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `/api/trpc` | Session cookie or API key | Primary API (web + mobile) |
| `/api/auth/*` | Varies | better-auth + custom register/reset REST |
| `/api/mcp` | API key only | JSON-RPC automation tools |
| `/i/[token]` | Public token | Client invoice view |
| `/api/i/[token]/pdf` | Public token | Invoice PDF download |

Business logic lives in `src/server/api/routers/` with Zod validation.

## Customization

- **Runtime branding:** Dashboard → Administration (platform settings)
- **Build-time defaults:** `NEXT_PUBLIC_BRAND_*` in `.env` (rebuild Docker image to apply)
- **Theme / fonts:** `src/styles/globals.css`, appearance settings in the app
- **Logo component:** `src/components/branding/logo.tsx`

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Stack, routers, schema, auth, Docker, MCP |
| [docs/README.md](./docs/README.md) | Index of UI and product guides |
| [AGENTS.md](./AGENTS.md) | Conventions for AI-assisted development |

## License

MIT — see [LICENSE](LICENSE).

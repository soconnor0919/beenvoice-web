# beenvoice-web architecture

Dense reference for the Next.js web application and API. Package manager: **Bun**. Database: **PostgreSQL** via Drizzle ORM.

**Repository:** [git.soconnor.dev/soconnor/beenvoice-web](https://git.soconnor.dev/soconnor/beenvoice-web)

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router (`src/app/`) |
| API | tRPC 11 (`/api/trpc`), SuperJSON transformer |
| ORM | Drizzle + `pg` pool |
| Auth | better-auth (email/password, optional Authentik OIDC, Expo plugin for mobile) |
| UI | shadcn/ui, Tailwind CSS v4, Radix primitives |
| Email | Resend |
| PDF | `@react-pdf/renderer` |

## Request flow

```
Browser / Mobile / MCP client
        │
        ├─► /api/auth/*     → better-auth handler (session cookies)
        ├─► /api/trpc/*     → createContext() → appRouter
        │                      ├─ Bearer / x-api-key → api-key auth
        │                      └─ else → better-auth session
        ├─► /api/mcp        → API key only → JSON-RPC tools → tRPC caller
        ├─► /api/i/[token]/pdf → public invoice PDF
        └─► /dashboard/*    → RSC + client components (session required in UI)
```

**Context** (`src/server/api/trpc.ts`): `protectedProcedure` requires `ctx.session.user`. API-key auth sets `authSource: "api-key"`; `apiKeys.*` mutations require session (cannot manage keys with a key).

## Directory layout

```
src/
├── app/                    # Routes (pages + route handlers)
│   ├── api/
│   │   ├── auth/           # better-auth catch-all + custom register/reset REST
│   │   ├── trpc/[trpc]/    # tRPC HTTP adapter
│   │   ├── mcp/            # MCP over HTTP (API key)
│   │   ├── i/[token]/pdf/  # Public PDF
│   │   └── cron/           # Recurring invoice generation (CRON_SECRET)
│   ├── auth/               # sign-in, register, forgot/reset password
│   ├── dashboard/          # Authenticated app shell
│   └── i/[token]/          # Public invoice view
├── components/             # Shared UI (ui/, forms/, layout/, data/)
├── hooks/
├── lib/                    # auth.ts, pdf-export, email templates, branding
├── server/
│   ├── api/
│   │   ├── root.ts         # appRouter composition
│   │   ├── trpc.ts         # procedures, context, timing middleware (dev)
│   │   ├── api-keys.ts
│   │   └── routers/        # one file per domain
│   └── db/
│       ├── schema.ts       # all tables (prefix beenvoice_)
│       ├── index.ts        # drizzle + pool
│       └── migrate.ts
├── trpc/                   # react.tsx (client), server.ts (RSC)
├── env.js                  # @t3-oss/env-nextjs validation
└── styles/globals.css
drizzle/                    # SQL migrations (0000–0014+)
```

## tRPC routers

Root: `src/server/api/root.ts`. All routers use Zod input validation.

| Namespace | File | Key procedures |
|-----------|------|----------------|
| `clients` | `routers/clients.ts` | getAll, getById, create, update, delete |
| `businesses` | `routers/businesses.ts` | getAll, getById, getDefault, create, update, delete, setDefault, getEmailConfig, updateEmailConfig |
| `invoices` | `routers/invoices.ts` | getAll, getBillable, getById, create, update, delete, updateStatus, bulk*, previewPdf, public token, **getByPublicToken** (public), sendReminder |
| `payments` | `routers/payments.ts` | getByInvoice, create, delete |
| `expenses` | `routers/expenses.ts` | getAll, getById, create, update, delete |
| `invoiceTemplates` | `routers/invoiceTemplates.ts` | CRUD by template type |
| `recurringInvoices` | `routers/recurring-invoices.ts` | CRUD, pause/resume, generateNow; cron helper `generateDueRecurringInvoices` |
| `timeEntries` | `routers/time-entries.ts` | getAll, getRunning, clockIn, updateRunning, clockOut, create, update, delete, getSummary |
| `dashboard` | `routers/dashboard.ts` | getStats |
| `email` | `routers/email.ts` | sendInvoice |
| `settings` | `routers/settings.ts` | profile, theme, animation prefs, export/import data, admin account roles |
| `apiKeys` | `routers/apiKeys.ts` | list, create, revoke (session-only) |

### Time clock semantics

- **One running entry per user** — partial unique index on `(createdById)` where `endedAt IS NULL`.
- `clockIn` — optional client, invoice, rate, backdated `startedAt`; resolves rate from input → client default → business default.
- `clockOut` — optional description update; computes hours; if `invoiceId` set, appends line item; else tries latest open invoice for client.
- Outcomes: `linked_to_invoice`, `saved_no_invoice`, `saved_no_client`, `zero_hours`.

## Database schema

Single file: `src/server/db/schema.ts`. Table names use `pgTableCreator` → prefix `beenvoice_`.

### Auth & platform

| Table | Notes |
|-------|-------|
| `beenvoice_user` | Core user; role for admin features |
| `beenvoice_account` | OAuth/credential accounts (better-auth) |
| `beenvoice_session` | Sessions; unique token |
| `beenvoice_verification_token` | Email verification / reset |
| `beenvoice_api_key` | `bv_` prefix keys; SHA-256 hash stored |
| `beenvoice_sso_provider` | OIDC/SAML config per user |
| `beenvoice_platform_setting` | Singleton (`id = global`) branding/PDF/appearance |

### Domain

| Table | FKs | Notes |
|-------|-----|-------|
| `beenvoice_client` | `createdById` → user | defaultHourlyRate, currency |
| `beenvoice_business` | `createdById` | Resend config, `isDefault` |
| `beenvoice_invoice` | client, business?, user | status draft/sent/paid; `publicToken` |
| `beenvoice_invoice_item` | invoice (cascade) | position ordering |
| `beenvoice_invoice_payment` | invoice, user | payment method enum |
| `beenvoice_expense` | business?, client?, invoice? | billable flags |
| `beenvoice_invoice_template` | user | notes/terms templates |
| `beenvoice_recurring_invoice` | client, business?, user | schedule, `nextDueAt` |
| `beenvoice_recurring_invoice_item` | recurring (cascade) | |
| `beenvoice_time_entry` | client?, invoice?, user | `endedAt` null = running |

Migrations: `bun run db:generate` → `drizzle/`; apply with `db:push` (dev) or `db:migrate` (prod script).

## Authentication

**Server** — `src/lib/auth.ts`:

- `betterAuth` + `drizzleAdapter` (users, sessions, accounts, verification)
- Plugins: `@better-auth/expo` (mobile SecureStore cookies), `nextCookies()`, optional `genericOAuth` (Authentik)
- Email/password with bcrypt (12 rounds); `DISABLE_SIGNUPS=true` blocks registration (custom `/api/auth/register` and better-auth `disableSignUp`)
- `trustedOrigins`: `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `beenvoice://`, `exp://`, plus Authentik origin when configured

**Web client** — `src/lib/auth-client.ts`: `createAuthClient` + `genericOAuthClient`.

**Routes**:

- `src/app/api/auth/[...all]/route.ts` — better-auth handler
- Custom REST: `register`, `forgot-password`, `reset-password`, `validate-reset-token` (used by mobile and legacy flows)

**Session cookies**: `better-auth.session_token` or `__Secure-better-auth.session_token` in production.

## Mobile API contract

The Expo app (`beenvoice-app`) does **not** use API keys. It:

1. Calls the same tRPC endpoints with `Authorization` cookie header from `authClient.getCookie()`.
2. Stores session per account in SecureStore via `@better-auth/expo` (`storagePrefix`: `beenvoice:guest` or `beenvoice:auth:{accountId}`).
3. Requires `trustedOrigins` and matching `BETTER_AUTH_URL` for the host the device can reach.

Ensure `src/lib/auth.ts` keeps the `expo()` plugin enabled.

## MCP (machine clients)

`POST /api/mcp` — JSON-RPC 2.0, protocol `2025-11-25`.

- **Auth**: API key only (`Authorization: Bearer bv_…` or `x-api-key`). Session cookies rejected.
- **Tools**: ~50 tools mirroring tRPC (invoices, clients, time clock, expenses, etc.)
- Implemented in `src/app/api/mcp/route.ts`; delegates to `createCaller(createContext)`.

API keys: format `bv_<base64url>`; stored as SHA-256 hash (`src/server/api/api-keys.ts`).

## Environment variables

Validated in `src/env.js`. See `.env.example`.

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | prod | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | yes | Public URL of API (no trailing path) |
| `NEXT_PUBLIC_APP_URL` | yes | Browser-facing URL |
| `DB_DISABLE_SSL` | local | `true` for Docker dev DB |
| `RESEND_API_KEY`, `RESEND_DOMAIN` | optional | Email; blank disables send |
| `AUTHENTIK_*` | optional | OIDC SSO |
| `DISABLE_SIGNUPS` | optional | `true` blocks registration; use string `true`/`false` (parsed in `src/env.js`) |
| `CRON_SECRET` | cron route | Protects `/api/cron/generate-recurring` |
| `NEXT_PUBLIC_BRAND_*` | optional | Build-time white-label defaults |

## Docker

| File | Use |
|------|-----|
| `docker-compose.yml` | Deploy: `app` + `db` (Postgres internal); copy `.env.example` → `.env` |
| `docker-compose.dev.yml` | Local dev: Postgres only, port `${POSTGRES_PORT:-5432}` |

App image built from `Dockerfile`. Container `CMD`: `bun migrate.ts && bun run start` (migrations then `next start` on port 3000). Docker builds run `next build` on Node 22 (not Bun) to avoid arm64 worker crashes; runtime stays on Bun. Docker builds disable React Compiler and use `experimental.webpackMemoryOptimizations` to reduce peak RAM.

Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public hostname before deploy. Rebuild the image when changing `NEXT_PUBLIC_*` build-time vars.

## Scripts

```bash
bun run dev          # next dev --turbo
bun run build        # production build
bun run db:push      # push schema (dev)
bun run db:migrate   # run migrations
bun run db:studio    # Drizzle Studio
bun run check        # eslint + tsc
```

## Public / unauthenticated surfaces

- `invoices.getByPublicToken` (tRPC publicProcedure)
- `/i/[token]` page and `/api/i/[token]/pdf`
- Auth REST endpoints for register/reset

## Related docs

- [forms-guide.md](./forms-guide.md), [UI_UNIFORMITY_GUIDE.md](./UI_UNIFORMITY_GUIDE.md)
- [data-table-responsive-guide.md](./data-table-responsive-guide.md)
- [email-features.md](./email-features.md)
- Mobile companion: `../beenvoice-app/docs/ARCHITECTURE.md`

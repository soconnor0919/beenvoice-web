# Coolify deployment — Beevoice + MinIO

Beevoice stores receipt files in S3-compatible storage when `S3_BUCKET`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are set. MinIO is the usual choice on self-hosted Coolify.

## Why `getaddrinfo ENOTFOUND minio` happens

Docker DNS resolves service names **only inside the same Docker network**.

| Setup | Does `http://minio:9000` work? |
|-------|-------------------------------|
| Single Compose stack (app + minio together) | Yes — Compose service name `minio` |
| Beevoice **Application** + MinIO **separate Compose** | **No** — each resource has its own network by default |
| Application + MinIO with shared destination network + correct hostname | Yes — hostname is usually **`minio-<resource-uuid>`**, not bare `minio` |
| Application + MinIO via **public domain** (`SERVICE_URL_MINIO_9000`) | Yes — no Docker DNS needed |

Setting `S3_ENDPOINT=http://minio:9000` on a standalone Beevoice Application fails because the app container is not on the MinIO stack's network. Node returns `ENOTFOUND minio`.

Also avoid `http://localhost:9000` inside the app container — that points at the app itself, not MinIO.

---

## Quick fix — keep Beevoice as Application + separate MinIO compose

Use this if you are **not** migrating to a single Compose stack today.

### Path A — public MinIO URL (recommended, works without shared Docker network)

This is the most reliable fix when Beevoice is a Coolify **Application** (Dockerfile) and MinIO is a separate Compose resource.

1. **Update the MinIO stack** to the latest `docker-compose.coolify-minio.yml` from this repo (includes `SERVICE_FQDN_MINIO_9000`) and **redeploy** the MinIO resource.
2. In the **MinIO Compose resource** → assign a domain for **port 9000** (e.g. `s3.yourdomain.com`). Coolify generates TLS via Traefik/Caddy.
3. Open the MinIO resource **Environment** tab and copy **`SERVICE_URL_MINIO_9000`** (e.g. `https://s3.yourdomain.com`).
4. On the **Beevoice Application** → Environment:

```env
S3_ENDPOINT=https://s3.yourdomain.com
S3_BUCKET=beenvoice-receipts
S3_ACCESS_KEY=<same as MINIO_ROOT_USER>
S3_SECRET_KEY=<same as MINIO_ROOT_PASSWORD>
S3_REGION=us-east-1
```

5. **Redeploy Beevoice** (restart is not enough after env changes on some Coolify versions — trigger a full redeploy).

`S3_FORCE_PATH_STYLE` defaults to on when `S3_ENDPOINT` is set (required for MinIO behind a reverse proxy). Only set `S3_FORCE_PATH_STYLE=false` if you use AWS S3 with virtual-hosted-style buckets.

### Path B — internal Docker DNS (same destination, no public MinIO domain)

Use when you want MinIO API traffic to stay on the Docker network.

1. Put Beevoice Application and MinIO Compose in the **same Coolify project** and **same destination** (server/network).
2. **MinIO Compose resource** → **Advanced** → enable **Connect to Predefined Network** → **redeploy MinIO**.
3. **Beevoice Application** → **Advanced** → enable **Connect to Predefined Network** (same destination) → **redeploy Beevoice**.
4. Find the MinIO resource **UUID** (in the Coolify URL, e.g. `.../service/abc123def456`, or env `COOLIFY_RESOURCE_UUID` on the MinIO container).
5. Set on Beevoice Application:

```env
S3_ENDPOINT=http://minio-<MINIO_RESOURCE_UUID>:9000
```

Example: resource UUID `k8w2o0g4s0g8` → `S3_ENDPOINT=http://minio-k8w2o0g4s0g8:9000`.

**Do not use bare `minio`** unless you verified it resolves from inside the Beevoice container (recent Coolify versions may also register the short service name when both sides use Connect to Predefined Network — if `wget http://minio:9000/minio/health/live` fails, use the `minio-<uuid>` form or Path A).

6. Match credentials and bucket:

```env
S3_BUCKET=beenvoice-receipts
S3_ACCESS_KEY=<MINIO_ROOT_USER>
S3_SECRET_KEY=<MINIO_ROOT_PASSWORD>
S3_REGION=us-east-1
```

---

## Recommended long-term — one Compose stack

Deploy **[`docker-compose.coolify.yml`](../docker-compose.coolify.yml)** as **one** Coolify **Docker Compose** resource (app + Postgres + MinIO + minio-init). This is the lowest-friction production layout on Coolify.

1. Coolify → **New Resource** → **Docker Compose**
2. Point at this repo; compose file: **`docker-compose.coolify.yml`**
3. Set env vars from [`.env.example`](../.env.example): `AUTH_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_*`, etc.
4. Assign a domain to the **`app`** service (Coolify fills `SERVICE_URL_APP` / `BETTER_AUTH_URL` automatically).
5. **Do not** override `S3_ENDPOINT` — the compose file sets `S3_ENDPOINT=http://minio:9000` on the shared network.
6. Redeploy.

Alternative: [`docker-compose.yml`](../docker-compose.yml) works the same way; `docker-compose.coolify.yml` adds Coolify magic vars (`SERVICE_FQDN_APP`) and omits host port bindings for db/MinIO.

### Migrating from Application + external Postgres + MinIO

| Current | Action |
|---------|--------|
| Beevoice Application | Remove after Compose stack is live |
| Separate Postgres | Dump/restore into stack `db`, or keep external DB and delete the `db` service from the compose file |
| MinIO compose | Remove after data migrated or re-point receipts (new bucket) |
| Env vars | Move `AUTH_SECRET`, Resend, Authentik, etc. to the Compose resource env |

---

## Compose file reference

| File | Purpose |
|------|---------|
| [`docker-compose.coolify.yml`](../docker-compose.coolify.yml) | **Recommended** — full stack for one Coolify Compose resource |
| [`docker-compose.yml`](../docker-compose.yml) | Full stack (local/VPS); also valid on Coolify |
| [`docker-compose.coolify-minio.yml`](../docker-compose.coolify-minio.yml) | MinIO + bucket init only; pair with Beevoice Application (Path A or B above) |

Do **not** add `networks: coolify: external: true` unless you know the exact external network name on your server. Coolify v4 uses **destinations**; network names are often UUID-based. Prefer the UI **Connect to Predefined Network** toggle over hard-coding `coolify` in compose.

---

## Checklist (Application + separate MinIO)

- [ ] MinIO stack redeployed with current `docker-compose.coolify-minio.yml`
- [ ] **Path A:** domain on port 9000 + `S3_ENDPOINT` = `SERVICE_URL_MINIO_9000`  
      **or Path B:** Connect to Predefined Network on **both** resources + `S3_ENDPOINT=http://minio-<uuid>:9000`
- [ ] `S3_ENDPOINT` is **not** `http://minio:9000`, **not** `localhost`
- [ ] `S3_ACCESS_KEY` / `S3_SECRET_KEY` match `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- [ ] `S3_BUCKET` exists (`minio-init` creates `beenvoice-receipts` by default)
- [ ] Redeployed Beevoice after env or network changes

## Verify from the Beevoice container

```bash
# Shell into Beevoice app container on the Coolify server
docker exec -it <beenvoice-container> sh

# Path A — public URL (include scheme; path is /minio/health/live on API port)
wget -qO- "https://s3.yourdomain.com/minio/health/live" || curl -sf "https://s3.yourdomain.com/minio/health/live"

# Path B — internal host from S3_ENDPOINT (no scheme/port in HOST)
wget -qO- "http://minio-<uuid>:9000/minio/health/live" || curl -sf "http://minio-<uuid>:9000/minio/health/live"
```

If this fails with "bad address" or timeout, fix networking / `S3_ENDPOINT` before debugging app code. On first S3 use, the app logs a hint if DNS fails or if `S3_ENDPOINT` still uses bare `minio` in production.

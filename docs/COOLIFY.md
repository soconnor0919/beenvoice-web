# Coolify deployment — Beevoice + MinIO

Beevoice stores receipt files in S3-compatible storage when `S3_BUCKET`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are set. MinIO is the usual choice on self-hosted Coolify.

## Why `getaddrinfo ENOTFOUND minio` happens

Docker DNS resolves service names **only inside the same Docker network**.

| Setup | Does `http://minio:9000` work? |
|-------|-------------------------------|
| Single `docker-compose.yml` stack (app + minio together) | Yes — Compose service name `minio` |
| Beevoice **Application** + MinIO **separate Compose** resource | **No** — each Coolify resource gets its own network by default |
| Both resources share a Coolify **destination** network + correct hostname | Yes — but hostname is often **not** bare `minio` |

Setting `S3_ENDPOINT=http://minio:9000` on a standalone Beevoice Application fails because the app container is not on the MinIO stack's internal network. Node's DNS lookup returns `ENOTFOUND minio`.

Also avoid `http://localhost:9000` inside the app container — that points at the app itself, not MinIO.

---

## Recommended: Option C — one Compose stack (simplest)

Deploy the repo's full [`docker-compose.yml`](../docker-compose.yml) as **one** Coolify **Docker Compose** resource (app + Postgres + MinIO + minio-init).

1. Coolify → **New Resource** → **Docker Compose**
2. Point at this repo; compose file: `docker-compose.yml`
3. Set env vars from [`.env.example`](../.env.example) (`AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, etc.)
4. **Do not** override `S3_ENDPOINT` — the compose file sets `S3_ENDPOINT=http://minio:9000` for the app service automatically
5. Redeploy

All services share one Compose network; `minio` resolves correctly.

---

## Option A — separate resources, shared Coolify network

Use when Beevoice stays a standalone **Application** (Dockerfile) and MinIO is a separate Compose resource.

### 1. Same Coolify project and destination

Put both resources in the **same Coolify project** and deploy them to the **same destination** (same Docker network / server).

### 2. Connect the Beevoice app to that network

On the **Beevoice Application** resource:

1. Open **Advanced** (or network settings)
2. Enable **Connect to Predefined Network**
3. Select the **same destination/network** as the MinIO stack
4. **Redeploy** the app (required after toggling network)

The MinIO stack does **not** need this option — only the service that **initiates** connections (Beevoice) needs it.

### 3. Set `S3_ENDPOINT` to the real internal hostname

Bare `minio` usually still fails across separate Coolify resources. Use the hostname Coolify assigns on the shared network:

1. Open the **MinIO Compose** resource in Coolify
2. Find the **internal URL** / connection info (eye icon next to internal connection string)
3. Copy the **hostname** from that URL (not `localhost`, not bare `minio` unless you verified it resolves)

Typical patterns:

| What you see | Use as `S3_ENDPOINT` |
|--------------|----------------------|
| Internal URL host `minio-abc123def456` | `http://minio-abc123def456:9000` |
| Container name `x8k2j4...` (random id) | `http://x8k2j4...:9000` |
| Same compose stack only | `http://minio:9000` |

On the Coolify server you can confirm:

```bash
# List MinIO containers
docker ps --filter name=minio

# See DNS aliases on the shared network (replace CONTAINER and NETWORK)
docker inspect CONTAINER --format '{{json .NetworkSettings.Networks}}' | jq
```

Set on the **Beevoice Application** env:

```env
S3_ENDPOINT=http://<hostname-from-step-3>:9000
S3_BUCKET=beenvoice-receipts
S3_ACCESS_KEY=<same as MINIO_ROOT_USER>
S3_SECRET_KEY=<same as MINIO_ROOT_PASSWORD>
S3_REGION=us-east-1
```

Redeploy Beevoice after changing env.

### 4. Enable on MinIO stack too (only if A still fails)

If the app still cannot resolve the hostname, enable **Connect to Predefined Network** on the **MinIO Compose** resource as well (same destination), redeploy MinIO, then re-check the internal URL — Coolify may expose a `minio-<resource-id>` alias on the shared network.

---

## Option B — internal URL from Coolify UI (quick fix)

Same as Option A step 3, without re-architecting:

1. MinIO resource → copy **internal** hostname (from internal URL field)
2. Beevoice Application → `S3_ENDPOINT=http://<that-hostname>:9000`
3. Enable **Connect to Predefined Network** on Beevoice if not already
4. Redeploy Beevoice

If DNS still fails, the app is not on the network where that hostname is registered — go back to Option A or use Option C.

---

## Option D — public / external MinIO URL (fallback)

If internal Docker DNS cannot be made to work:

```env
S3_ENDPOINT=https://minio.yourdomain.com
```

Expose MinIO API (port 9000) via Coolify proxy or a public domain. Less ideal (traffic leaves the Docker network, TLS/path-style config may need tuning) but avoids internal DNS entirely.

---

## Separate MinIO-only Compose file

[`docker-compose.coolify-minio.yml`](../docker-compose.coolify-minio.yml) deploys only MinIO + bucket init for a dedicated Coolify Compose resource. Pair it with a Beevoice Application using Option A or B.

Do **not** add `networks: coolify: external: true` unless you know the exact external network name on your Coolify server. Coolify v4 uses **destinations**; network names are often UUID-based. Prefer the UI **Connect to Predefined Network** toggle over hard-coding `coolify` in compose.

---

## Checklist

- [ ] Beevoice and MinIO in the same Coolify **project**
- [ ] Same **destination** / server
- [ ] Beevoice Application: **Connect to Predefined Network** enabled (when MinIO is a separate resource)
- [ ] `S3_ENDPOINT` uses internal hostname from Coolify UI — not `localhost`, not unverified `minio`
- [ ] `S3_ACCESS_KEY` / `S3_SECRET_KEY` match MinIO `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- [ ] `S3_BUCKET` exists ( `minio-init` in compose creates `beenvoice-receipts` by default)
- [ ] Redeployed after env or network changes

## Verify from the Beevoice container

```bash
# Shell into Beevoice app container on Coolify server
docker exec -it <beenvoice-container> sh

# Replace HOST with your S3_ENDPOINT hostname (no scheme/port)
wget -qO- "http://HOST:9000/minio/health/live" || curl -sf "http://HOST:9000/minio/health/live"
```

If this fails with "bad address" or timeout, fix networking before debugging app code.

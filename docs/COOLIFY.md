# Coolify deployment — beenvoice + Garage

beenvoice stores receipt files in S3-compatible storage when `S3_BUCKET`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are set. [Garage](https://garagehq.deuxfleurs.fr/) is the default on self-hosted Coolify (~50–100 MB RAM vs MinIO's ~500 MB+).

## Why `getaddrinfo ENOTFOUND garage` happens

Docker DNS resolves service names **only inside the same Docker network**.

| Setup | Does `http://garage:3900` work? |
|-------|--------------------------------|
| Single Compose stack (app + garage together) | Yes — Compose service name `garage` |
| beenvoice **Application** + Garage **separate Compose** | **No** — each resource has its own network by default |
| Application + Garage with shared destination network + correct hostname | Yes — hostname is usually **`garage-<resource-uuid>`**, not bare `garage` |
| Application + Garage via **public domain** (`SERVICE_URL_GARAGE_3900`) | Yes — no Docker DNS needed |

Setting `S3_ENDPOINT=http://garage:3900` on a standalone beenvoice Application fails because the app container is not on the Garage stack's network. Node returns `ENOTFOUND garage`.

Also avoid `http://localhost:3900` inside the app container — that points at the app itself, not Garage.

---

## Quick fix — keep beenvoice as Application + separate Garage compose

Use this if you are **not** migrating to a single Compose stack today.

### Path A — public Garage URL (recommended, works without shared Docker network)

This is the most reliable fix when beenvoice is a Coolify **Application** (Dockerfile) and Garage is a separate Compose resource.

1. **Update the Garage stack** to the latest `docker-compose.coolify-garage.yml` from this repo (includes `SERVICE_FQDN_GARAGE_3900`) and **redeploy** the Garage resource.
2. In the **Garage Compose resource** → assign a domain for **port 3900** (e.g. `s3.yourdomain.com`). Coolify generates TLS via Traefik/Caddy.
3. Open the Garage resource **Environment** tab and copy **`SERVICE_URL_GARAGE_3900`** (e.g. `https://s3.yourdomain.com`).
4. On the **beenvoice Application** → Environment:

```env
S3_ENDPOINT=https://s3.yourdomain.com
S3_BUCKET=beenvoice-receipts
S3_ACCESS_KEY=<same as GARAGE_DEFAULT_ACCESS_KEY / S3_ACCESS_KEY on Garage stack>
S3_SECRET_KEY=<same as GARAGE_DEFAULT_SECRET_KEY / S3_SECRET_KEY on Garage stack>
S3_REGION=garage
```

5. **Redeploy beenvoice** (restart is not enough after env changes on some Coolify versions — trigger a full redeploy).

`S3_FORCE_PATH_STYLE` defaults to on when `S3_ENDPOINT` is set (required for Garage behind a reverse proxy). Only set `S3_FORCE_PATH_STYLE=false` if you use AWS S3 with virtual-hosted-style buckets.

### Path B — internal Docker DNS (same destination, no public Garage domain)

Use when you want S3 API traffic to stay on the Docker network.

1. Put beenvoice Application and Garage Compose in the **same Coolify project** and **same destination** (server/network).
2. **Garage Compose resource** → **Advanced** → enable **Connect to Predefined Network** → **redeploy Garage**.
3. **beenvoice Application** → **Advanced** → enable **Connect to Predefined Network** (same destination) → **redeploy beenvoice**.
4. Find the Garage resource **UUID** (in the Coolify URL, e.g. `.../service/abc123def456`, or env `COOLIFY_RESOURCE_UUID` on the Garage container).
5. Set on beenvoice Application:

```env
S3_ENDPOINT=http://garage-<GARAGE_RESOURCE_UUID>:3900
```

Example: resource UUID `k8w2o0g4s0g8` → `S3_ENDPOINT=http://garage-k8w2o0g4s0g8:3900`.

**Do not use bare `garage`** unless you verified it resolves from inside the beenvoice container (recent Coolify versions may also register the short service name when both sides use Connect to Predefined Network — if `wget http://garage:3900` fails, use the `garage-<uuid>` form or Path A).

6. Match credentials and bucket:

```env
S3_BUCKET=beenvoice-receipts
S3_ACCESS_KEY=<S3_ACCESS_KEY on Garage stack>
S3_SECRET_KEY=<S3_SECRET_KEY on Garage stack>
S3_REGION=garage
```

---

## Recommended long-term — one Compose stack

Deploy **[`docker-compose.coolify.yml`](../docker-compose.coolify.yml)** as **one** Coolify **Docker Compose** resource (app + Postgres + Garage). This is the lowest-friction production layout on Coolify.

1. Coolify → **New Resource** → **Docker Compose**
2. Point at this repo; compose file: **`docker-compose.coolify.yml`**
3. Set env vars from [`.env.example`](../.env.example): `AUTH_SECRET`, `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, etc.
4. Assign a domain to the **`app`** service (Coolify fills `SERVICE_URL_APP` / `BETTER_AUTH_URL` automatically).
5. **Do not** override `S3_ENDPOINT` — the compose file sets `S3_ENDPOINT=http://garage:3900` on the shared network.
6. Redeploy.

Alternative: [`docker-compose.yml`](../docker-compose.yml) works the same way; `docker-compose.coolify.yml` adds Coolify magic vars (`SERVICE_FQDN_APP`) and omits host port bindings for db/Garage.

### Migrating from Application + external Postgres + Garage (or legacy MinIO)

| Current | Action |
|---------|--------|
| beenvoice Application | Remove after Compose stack is live |
| Separate Postgres | Dump/restore into stack `db`, or keep external DB and delete the `db` service from the compose file |
| Garage / MinIO compose | Remove after data migrated (rclone) or re-point receipts (new bucket) |
| Env vars | Move `AUTH_SECRET`, Resend, Authentik, etc. to the Compose resource env |

**Migrating from MinIO:** Garage uses port **3900** (not 9000) and Garage-format access keys (`GK…`). Update `S3_ENDPOINT`, `S3_REGION=garage`, and credentials. Receipt blobs in the old MinIO volume are not auto-migrated.

---

## Compose file reference

| File | Purpose |
|------|---------|
| [`docker-compose.coolify.yml`](../docker-compose.coolify.yml) | **Recommended** — full stack for one Coolify Compose resource |
| [`docker-compose.yml`](../docker-compose.yml) | Full stack (local/VPS); also valid on Coolify |
| [`docker-compose.coolify-garage.yml`](../docker-compose.coolify-garage.yml) | Garage only; pair with beenvoice Application (Path A or B above) |

Do **not** add `networks: coolify: external: true` unless you know the exact external network name on your server. Coolify v4 uses **destinations**; network names are often UUID-based. Prefer the UI **Connect to Predefined Network** toggle over hard-coding `coolify` in compose.

---

## Checklist (Application + separate Garage)

- [ ] Garage stack redeployed with current `docker-compose.coolify-garage.yml`
- [ ] **Path A:** domain on port 3900 + `S3_ENDPOINT` = `SERVICE_URL_GARAGE_3900`  
      **or Path B:** Connect to Predefined Network on **both** resources + `S3_ENDPOINT=http://garage-<uuid>:3900`
- [ ] `S3_ENDPOINT` is **not** `http://garage:3900`, **not** `localhost`
- [ ] `S3_ACCESS_KEY` / `S3_SECRET_KEY` match the Garage stack env
- [ ] `S3_BUCKET` exists (Garage `--default-bucket` creates `beenvoice-receipts` on first start)
- [ ] Redeployed beenvoice after env or network changes

## Verify from the beenvoice container

```bash
# Shell into beenvoice app container on the Coolify server
docker exec -it <beenvoice-container> sh

# Path A — public URL (403/404 on root is fine — confirms DNS + TLS)
wget -qO- "https://s3.yourdomain.com" || curl -sf "https://s3.yourdomain.com"

# Path B — internal host from S3_ENDPOINT
wget -qO- "http://garage-<uuid>:3900" || curl -sf "http://garage-<uuid>:3900"
```

If this fails with "bad address" or timeout, fix networking / `S3_ENDPOINT` before debugging app code. On first S3 use, the app logs a hint if DNS fails or if `S3_ENDPOINT` still uses bare `garage` in production.

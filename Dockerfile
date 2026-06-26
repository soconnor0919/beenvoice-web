# syntax=docker/dockerfile:1
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=install /usr/src/app/node_modules node_modules
COPY . .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG BETTER_AUTH_URL=http://localhost:3000

# Low-memory Docker build profile:
# - disable React Compiler (saves compile RAM; prod image still runs fine without it)
# - skip eslint/tsc inside `next build` (run `bun run check` in CI instead)
# - cap Node heap at 2GB (raise Docker/Colima memory if this still OOMs)
ENV DOCKER_BUILD=1 \
    DISABLE_REACT_COMPILER=1 \
    NODE_ENV=production \
    SKIP_ENV_VALIDATION=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=2048 \
    BETTER_AUTH_URL=${BETTER_AUTH_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    AUTH_SECRET=docker-build-placeholder-secret-do-not-use \
    DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
RUN bun run build

FROM base AS release
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=build /usr/src/app/.next ./.next
COPY --from=build /usr/src/app/public ./public
COPY --from=install /usr/src/app/node_modules node_modules
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /usr/src/app/drizzle ./drizzle
COPY --from=build /usr/src/app/src/server/db/migrate.ts ./migrate.ts

RUN chmod -R a+rX drizzle public migrate.ts

USER bun
EXPOSE 3000
CMD ["sh", "-c", "bun migrate.ts && bun run start"]

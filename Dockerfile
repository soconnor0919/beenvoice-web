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

ENV NODE_ENV=production \
    SKIP_ENV_VALIDATION=1 \
    NODE_OPTIONS=--max-old-space-size=4096 \
    BETTER_AUTH_URL=${BETTER_AUTH_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    AUTH_SECRET=docker-build-placeholder-secret-do-not-use \
    DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
RUN bun run build

FROM base AS release
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

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

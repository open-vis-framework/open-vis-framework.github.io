# Build context is the REPO ROOT (not apps/platform) — `turbo prune` needs
# to see the whole workspace. See docker-compose.yml's `build.context`.
#
# See docs/adr/0003-dockerize-same-server.md for why this exists.

FROM node:22-slim AS base
RUN corepack enable

# 1. Prune the monorepo down to just what `platform` needs (its own
#    package.json + whichever workspace packages it depends on — none yet,
#    but this keeps working as packages/* gets added later).
FROM base AS pruner
WORKDIR /repo
COPY . .
RUN pnpm dlx turbo@2.10.10 prune platform --docker

# 2. Install dependencies from the pruned lockfile only (better layer
#    caching: this layer only invalidates when deps actually change, not
#    on every source edit).
FROM base AS deps
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN pnpm install --frozen-lockfile

# 3. Build, using the pruned full source on top of the installed deps.
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo/ .
COPY --from=pruner /repo/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
# webpack, not the default Turbopack `build` script: Turbopack's
# standalone-output file tracer has known bugs with pnpm's
# content-addressable store in a monorepo (hit one directly building
# this image — see git history / docs/adr/0003 if it resurfaces).
# webpack's tracing path is more mature for this exact scenario.
RUN pnpm --filter platform run build:webpack

# 4. Runtime image: only the standalone output + static assets, running
#    as a non-root user.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/platform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/platform/.next/static ./apps/platform/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/platform/public ./apps/platform/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/platform/server.js"]

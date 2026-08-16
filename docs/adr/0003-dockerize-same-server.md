# ADR 0003: Dockerize apps/platform, deploy via plain Docker Compose on the same server

- Status: partially superseded
- Date: 2026-08-16
- Supersedes the deploy *mechanism* in `docs/adr/0002-self-hosted-platform.md`
  (does not reverse its "self-host, don't pay for managed hosting" stance)
- Deploy-mechanism portions superseded by `docs/adr/0005-adopt-inveniordm.md`
  once `apps/platform` is retired: InvenioRDM (`platform/`) gets its own
  Docker Compose + deploy workflow. The "same server, Docker Compose,
  Traefik stays untouched" *pattern* this ADR established carries over;
  the "self-host, no managed hosting" stance is unchanged.

## Context

ADR 0002's deploy mechanism (pm2 + a glibc-workaround build + hand-edited
shared Traefik config + acme.sh/DuckDNS DNS-01 + SSH-from-CI) works but has
accumulated risk right as real product features (auth, database, file
uploads) are about to be built on top of it:
- The server (Debian 10 "buster") is EOL — no security patches since June
  2024.
- glibc 2.28 on that box can't run Next.js 16's default Turbopack build,
  forcing a `build:webpack` workaround specific to this one server.
- TLS cert renewal has no reload hook wired up (cert expires Nov 2026).
- Nothing about the current setup is portable — moving to a different
  server means re-deriving pm2 config, Node version pinning, and Traefik
  routing from scratch.

**Coolify was considered and rejected.** The original plan was to
self-host via Coolify (a Docker-based PaaS with its own reverse
proxy/TLS, git-push-to-deploy, and a management UI). Two problems:
1. Coolify's built-in reverse proxy would conflict with the existing,
   already-working Traefik instance that serves 3 other unrelated live
   projects on this box (GeoNet, mlg, romani-project) — Coolify would
   need to run *without* managing the proxy to coexist, which forfeits
   most of its automatic TLS/routing value.
2. Installing Coolify itself (its own control-plane containers, database,
   etc.) adds real maintenance surface to an already-fragile shared box,
   for value that in this constrained configuration mostly reduces to
   "a nicer dashboard" — everything else Coolify would provide (Docker
   builds, git-triggered deploys, portability) is achievable with plain
   Docker Compose plus the SSH-deploy pipeline that already exists and
   already works.

A **new dedicated server** was also considered (would let Coolify run in
its normal, fully-featured mode) but rejected in favor of staying on the
existing box — no new cost, no new infrastructure to provision.

The EOL OS itself remains unresolved. An in-place Debian 10→12 upgrade was
discussed; deferred for now (see Consequences) as an accepted, known risk
— not blocking this work, but not forgotten either.

## Decision

- `apps/platform` gets a multi-stage `Dockerfile` (Next.js `output:
  "standalone"`) and a root `docker-compose.yml` — the single source of
  truth for the app + Postgres, used identically by developers locally
  and by the existing SSH-deploy GitHub Actions workflow in production.
- **Same server, no Coolify.** Deploy mechanism becomes: GitHub Actions →
  SSH (reusing the existing `DEPLOY_SSH_KEY` CI-only key, unchanged) →
  `git pull && docker compose build && docker compose up -d` (+ a
  migration step), replacing the current `pnpm build:webpack && pm2
  restart` script in `.github/workflows/deploy-platform.yml`.
- The Docker container binds the same host port (3001) that pm2 currently
  occupies, so **the existing Traefik route needs zero changes** for
  cutover — same domain, same port, same `tls: {}` router entry from ADR
  0002.
- `build:webpack` and the glibc workaround are retired once Dockerized —
  the container's own base image has a modern glibc, so this is no longer
  a server-specific problem.
- `apps/web` is unaffected — stays on GitHub Pages.
- New product surface (Postgres via Drizzle, Auth.js, disk-backed upload
  storage) — see `docs/ROADMAP.md` for the phased build-out.

## Consequences

- No new server, no new hosting bill, no Coolify to install/maintain —
  but also no deploy dashboard, no one-click managed Postgres/backups.
  Accepted trade for staying simple on a box that's already carrying a
  fair amount of hand-maintained infrastructure.
- **The EOL OS is still unresolved.** This was explicitly re-raised during
  this decision and explicitly deferred by the project owner. Docker
  itself needs to actually install on Debian 10's archived apt repos
  (verified as Phase 1 of the roadmap, before any feature code is
  written) — if that fails, the "same server" decision here would need
  to be revisited.
- Disk-backed upload storage lives on this one server's disk: no offsite
  copy, no horizontal scaling, backups are our job. Behind a `Storage`
  interface so swapping to S3/MinIO later is contained — deferred until
  actually needed.
- Everything about this deployment is still tied to one specific,
  fragile, shared, EOL server. Dockerizing improves *portability*
  (the stack itself could move to any Docker host with one `git clone`
  + `docker compose up`) but does not, by itself, reduce the operational
  risk of *this specific* server failing. That risk is tracked, not
  solved, by this ADR.

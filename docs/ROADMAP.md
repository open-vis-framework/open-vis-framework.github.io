# Roadmap

Living plan for the product backend. This is the document to read first if
you're picking this project up cold (fresh clone, new agent session) — the
ADRs in `docs/adr/` explain *why* each decision was made; this is *what's
done and what's next*, kept up to date as phases land.

Current phase: **migrating from `apps/platform` (Next.js) to `platform/`
(InvenioRDM)** — see `docs/adr/0005-adopt-inveniordm.md` for why. The old
Next.js app remains live at `https://open-vis-framework.duckdns.org` and
gets bug fixes only until cutover (Migration Phase 8 below); no new
features land on it. "Phases 0-9" below are the completed history of that
app, kept for context; "Migration Phase N" is the current work.

## InvenioRDM migration (current work — see ADR 0005)

- [x] **Migration Phase 0 — Docs**: this section, ADR 0005, `CLAUDE.md`
      layout update.
- [x] **Migration Phase 1 — Local scaffold** (go/no-go gate, passed):
      `invenio-cli init rdm` into `platform/`, `invenio-cli install`,
      `invenio-cli services setup` + `invenio-cli run` locally with demo
      data — serving at `https://127.0.0.1:5000`. Toolchain installed via
      Homebrew: Python 3.14, `uv`, `pipx`, Node 24 (kept keg-only/unlinked
      — doesn't affect `apps/*`'s pinned Node 22 via `.nvmrc`),
      ImageMagick. Two real bugs hit and fixed: (1) InvenioRDM's Postgres
      wants host port 5432, already held by `apps/platform`'s local dev
      Postgres — Compose created the container but silently never bound
      the host port (no error, just a hang); remapped to 5433 in
      `platform/docker-services.yml` + `platform/invenio.cfg`. (2) The
      cookiecutter scaffolds into a dir named after `project_shortname`,
      not `platform/` — after the rename, `platform/docker/pgadmin/servers.json`
      referenced a stale container name; fixed to use the stable Compose
      service alias (`db`).
- [x] **Migration Phase 2 — Server proof-of-concept** (go/no-go gate,
      passed): full InvenioRDM stack (db/cache/mq/search/web-ui/web-api/
      worker/scheduler — 8 containers, `frontend`/pgadmin/flower/
      opensearch-dashboards skipped as non-essential for this check) built
      and run on the production server via `docker-compose.full.yml`,
      routed through Traefik on a scratch subdomain
      (`ovf-invenio.duckdns.org`, real Let's Encrypt cert via the existing
      acme.sh/DuckDNS setup — see `docs/ops/access.md`). Resource
      footprint: ~4.4GB/11GB RAM used total (alongside `apps/platform` +
      the 3 unrelated projects), ~3.2GB attributable to the Invenio stack
      itself (search/worker are the heaviest at ~1GB+ each) — comfortable
      headroom. All 4 other live domains spot-checked unaffected after
      both the container startup and the Traefik config edit. Confirmed
      `SITE_UI_URL`/`TRUSTED_HOSTS`/`PROXYFIX_CONFIG` correctly produce
      HTTPS-aware redirects/cookies (`Set-Cookie: ...; Secure`) behind
      Traefik. One real finding: the cookiecutter's uwsgi services default
      to the binary uwsgi protocol (`socket = ...`), meant to sit behind
      the bundled nginx `frontend` (which speaks `uwsgi_pass`) — routing
      Traefik directly to the app container needed `http-socket` instead.
      This POC therefore has no static-asset styling (nginx normally
      serves `/static`) and no `/api` path-split routing — both explicitly
      deferred to **Migration Phase 7**, which needs to decide for real
      whether the production deploy keeps nginx-in-front (full fidelity,
      more moving parts) or goes Traefik-direct like this POC (simpler,
      needs its own static-serving + `/api` routing answer). POC is left
      running for now — see `docs/ops/access.md` for teardown notes when
      it's no longer needed.
- [ ] **Migration Phase 3 — Visualization Sheet metadata mapping**: ADR
      0004's six sections → InvenioRDM native fields + `ovf:*` custom
      fields; native file uploads for the file case.
- [ ] **Migration Phase 4 — Auth**: `invenio-oauthclient` for Google,
      GitHub, ORCID. New OAuth app registrations needed (see
      `docs/ops/access.md`).
- [ ] **Migration Phase 5 — Branding/UI**: default Invenio theme first;
      functional correctness, not visual parity with the old Tailwind UI.
- [ ] **Migration Phase 6 — Search & browse**: native OpenSearch-backed
      facets (license, AI involvement, keywords) replacing the old
      `ilike` browse query.
- [ ] **Migration Phase 7 — Deploy pipeline**: new GitHub Actions workflow
      for `platform/`'s heavier Docker build.
- [ ] **Migration Phase 8 — Cutover & retirement**: flip Traefik, delete
      `apps/platform`, update `pnpm-workspace.yaml`/`turbo.json`/`ci.yml`,
      mark ADR 0002/0003/0004 fully superseded.

No data migration needed — only test/seed data exists in `sheets` today
(confirmed before starting this migration), so cutover is a clean
replacement, not a backfill.

## Phases (completed — `apps/platform`, Next.js, pre-migration history)

- [x] **Phase 0 — Docs**: this file, ADR 0003, `docs/ops/access.md`.
- [x] **Phase 1 — Verify Docker installs on the existing server** (go/no-go
      gate, passed — Docker's own apt repo still serves buster even though
      Debian's own mirrors are archived; had to repoint the base OS's
      `sources.list` at `archive.debian.org` too, for a couple of Docker's
      transitive deps).
- [x] **Phase 2 — Dockerize `apps/platform`**: `Dockerfile`,
      `docker-compose.yml`, `output: "standalone"`. Two real bugs hit and
      fixed, both documented inline in `next.config.ts`/`Dockerfile`:
      Turbopack's standalone-output tracer panics on pnpm's store in this
      monorepo (switched the Docker build to `build:webpack`), and
      `next.config.ts`'s `__dirname` isn't available when the server's old
      glibc forces Next onto its WASM SWC fallback (switched to
      `process.cwd()`).
- [x] **Phase 3 — Postgres + Drizzle**: schema + migrations, local dev
      Postgres via Docker Compose.
- [x] **Phase 4 — Auth.js**: Credentials (email+password) + Google + GitHub +
      ORCID (custom OIDC provider, verified via a real authorization
      redirect including auto-negotiated PKCE). Google/GitHub/ORCID need
      real OAuth app registrations before those specific buttons work —
      external, not code, still outstanding (see `docs/ops/access.md`).
      Real bug hit: Auth.js requires JWT session strategy whenever a
      Credentials provider is present (`UnsupportedStrategy` otherwise) —
      fixed in `src/auth.ts`.
- [x] **Phase 5 — Upload workflow**: `src/lib/storage.ts` (disk-backed,
      behind a `Storage` interface), auth-gated submit form.
- [x] **Phase 6 — Public browse/detail pages**: no login required.
- [x] **Phase 7 — Cut over the deploy path**: `deploy-platform.yml` now
      builds/runs via Docker Compose; old pm2 process retired. Verified by
      hand on the server before automating.
- [x] **Post-launch bugfix**: `platform_uploads` Docker volume was created
      owned by `root`, but the container runs as non-root `nextjs` — every
      upload failed with `EACCES`. Fixed in both the Dockerfile (`chown`
      the mount point before `USER` switches, so fresh volumes get correct
      ownership automatically) and the already-existing production volume.
      Caught by a real user report, not by CI — the earlier verification
      only exercised `storage.ts` directly, never the actual container.
- [x] **UI pass**: basic Tailwind styling across all pages (was
      unstyled/plain-browser-default). Two shared components
      (`components/form.tsx`, `components/container.tsx`).
- [x] **Phase 9 — Visualization Sheets**: replaced the generic
      `artifacts` placeholder with the real data model from the project
      abstract. See `docs/adr/0004-visualization-sheets.md` for the full
      taxonomy (core metadata, data provenance, visual encoding & design,
      AI involvement disclosure, limitations) and the multi-author /
      file-or-URL decisions. Added a shared `Header` (nav + working
      sign-out) and a `/my-sheets` page (authorization: only ever queries
      the logged-in user's own `ownerId`, never a client-supplied id).

## Explicitly out of scope (still)

- Coolify (considered, rejected — see ADR 0003).
- A new/dedicated server (staying on the existing shared box).
- Upgrading the server's EOL OS (deferred, accepted risk — see ADR 0003).
- MinIO/S3 storage (disk-backed volume, behind a `Storage` interface so
  this stays a contained future change if it's ever needed).
- Moderation/review workflow on submissions.
- Sheet versioning/revision history (arXiv-style).
- Structured (non-free-text) sub-fields within sheet sections — e.g. a
  proper repeatable data-sources list instead of one free-text block.

## Local dev

```
cp apps/platform/.env.example apps/platform/.env   # once, fill in secrets
pnpm install
docker compose --env-file apps/platform/.env up -d postgres   # infra only
pnpm --filter platform db:migrate
pnpm --filter platform db:seed     # optional: admin@example.com / admin
pnpm dev                             # turbo run dev — fast HMR
```

**Always pass `--env-file apps/platform/.env`** to `docker compose`
commands — Compose's `${VAR}` substitution inside `docker-compose.yml`
only auto-reads a root-level `.env` by default, and this project
deliberately keeps one `.env` file (under `apps/platform/`, alongside
`.env.example`) rather than duplicating secrets in two places.

`DATABASE_URL` in `apps/platform/.env` points at `localhost:5432` — correct
for host-side tools (`pnpm dev`, `drizzle-kit`). The containerized app
needs the Docker network name instead; `docker-compose.yml` overrides
`DATABASE_URL` (and `UPLOADS_DIR`) for the `platform` service specifically
so this isn't a manual step.

Full-stack parity check before pushing (uses the real Dockerfile that the
server will build too):
```
docker compose --env-file apps/platform/.env up --build
```

Migrations against a server (local or prod), without needing Node/pnpm on
the host at all:
```
docker compose --env-file apps/platform/.env --profile tools run --rm migrate
docker compose --env-file apps/platform/.env --profile tools run --rm seed  # optional
```

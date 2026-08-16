# Roadmap

Living plan for `apps/platform`. This is the document to read first if you're
picking this project up cold (fresh clone, new agent session) — the ADRs in
`docs/adr/` explain *why* each decision was made; this is *what's done and
what's next*, kept up to date as phases land.

Current phase: **shipped and live** at `https://open-vis-framework.duckdns.org`.
See `docs/adr/0003-dockerize-same-server.md` for the deploy architecture and
`docs/adr/0004-visualization-sheets.md` for the data model.

## Phases

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

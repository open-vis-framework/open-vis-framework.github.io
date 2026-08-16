# Roadmap

Living plan for `apps/platform`. This is the document to read first if you're
picking this project up cold (fresh clone, new agent session) — the ADRs in
`docs/adr/` explain *why* each decision was made; this is *what's done and
what's next*, kept up to date as phases land.

Current phase: **Phase 4** (Auth.js). See
`docs/adr/0003-dockerize-same-server.md` for the architecture this roadmap
implements.

## Phases

- [x] **Phase 0 — Docs**: this file, ADR 0003, `docs/ops/access.md`.
- [x] **Phase 1 — Verify Docker installs on the existing server** (go/no-go
      gate, passed — Docker's own apt repo still serves buster even though
      Debian's own mirrors are archived; had to repoint the base OS's
      `sources.list` at `archive.debian.org` too, for a couple of Docker's
      transitive deps).
- [x] **Phase 2 — Dockerize `apps/platform`**: `Dockerfile`,
      `docker-compose.yml`, `output: "standalone"`. Verified locally (both
      `docker build`/`run` and `docker compose up --build`) — still deploys
      to the server the old pm2 way until Phase 7. Two real bugs hit and
      fixed along the way, both documented inline in
      `apps/platform/next.config.ts` and `apps/platform/Dockerfile`:
      Turbopack's standalone-output tracer panics on pnpm's store in this
      monorepo (switched the Docker build to `build:webpack`), and
      `next.config.ts`'s `__dirname` isn't available when the server's old
      glibc forces Next onto its WASM SWC fallback (switched to
      `process.cwd()`).
- [x] **Phase 3 — Postgres + Drizzle**: schema (`users`/`accounts`/`sessions`/
      `verificationTokens`/`artifacts`), migrations, local dev Postgres via
      Docker Compose. Verified: migrations applied locally, all 5 tables
      confirmed, full `docker compose up --build` (app + Postgres over the
      internal Docker network) verified end to end.
- [ ] **Phase 4 — Auth.js**: Credentials (email+password) + Google + GitHub +
      ORCID (custom OIDC provider). Needs external OAuth app registrations
      (see that phase in the plan / ADR — not code, manual account setup).
- [ ] **Phase 5 — Upload workflow**: auth-gated submit form → disk-backed
      storage → metadata row. Plumbing over polish, intentionally.
- [ ] **Phase 6 — Public browse/detail pages**: no login required.
- [ ] **Phase 7 — Cut over the deploy path**: update
      `.github/workflows/deploy-platform.yml` to build/run via Docker Compose
      instead of pm2; retire the pm2 process on the server once the
      container is confirmed serving correctly.
- [ ] **Phase 8 — Docs wrap-up**: mark this roadmap and ADR 0002 as
      reflecting the shipped state.

## Explicitly out of scope (this round)

- Coolify (considered, rejected — see ADR 0003).
- A new/dedicated server (staying on the existing shared box).
- Upgrading the server's EOL OS (deferred, accepted risk — see ADR 0003).
- MinIO/S3 storage (disk-backed volume for now, behind a `Storage`
  interface so this is a contained future change).
- Moderation/review workflow on submissions (schema leaves room for a
  `status` column later; not built now).
- Polishing the upload form's UI (the workflow/plumbing is what matters).

## Local dev

```
cp apps/platform/.env.example apps/platform/.env   # once, fill in secrets
pnpm install
docker compose --env-file apps/platform/.env up -d postgres   # infra only
pnpm --filter platform db:migrate
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
`DATABASE_URL` for the `platform` service specifically so this isn't a
manual step.

Full-stack parity check before pushing (uses the real Dockerfile that the
server will build too):
```
docker compose --env-file apps/platform/.env up --build
```

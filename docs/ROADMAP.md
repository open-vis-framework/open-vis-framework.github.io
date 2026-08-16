# Roadmap

Living plan for `apps/platform`. This is the document to read first if you're
picking this project up cold (fresh clone, new agent session) — the ADRs in
`docs/adr/` explain *why* each decision was made; this is *what's done and
what's next*, kept up to date as phases land.

Current phase: **Phase 0** (docs). See `docs/adr/0003-dockerize-same-server.md`
for the architecture this roadmap implements.

## Phases

- [x] **Phase 0 — Docs**: this file, ADR 0003, `docs/ops/access.md`.
- [ ] **Phase 1 — Verify Docker installs on the existing server** (go/no-go
      gate — the server's OS is EOL Debian 10 with archived apt repos; if
      Docker can't be installed there, the "same server" decision needs
      revisiting before anything else proceeds).
- [ ] **Phase 2 — Dockerize `apps/platform`**: `Dockerfile`,
      `docker-compose.yml`, `output: "standalone"`. Verified locally only —
      still deploys to the server the old way (pm2) until Phase 7.
- [ ] **Phase 3 — Postgres + Drizzle**: schema (`users`/`accounts`/`sessions`/
      `verificationTokens`/`artifacts`), migrations, local dev Postgres via
      Docker Compose.
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

## Local dev (once Phase 3 lands)

```
cp apps/platform/.env.example apps/platform/.env   # once, fill in secrets
pnpm install
docker compose up -d postgres        # infra only; host:5432 via override file
pnpm --filter platform db:migrate
pnpm dev                             # turbo run dev — fast HMR
```

Full-stack parity check before pushing (uses the real Dockerfile that the
server will build too):
```
docker compose up --build
```

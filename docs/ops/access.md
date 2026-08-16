# Server & access registry

**This repo is public.** This file documents *metadata only* — what exists,
what it's for, where the real credentials live. It must never contain an
actual private key, password, or token. If you're about to paste a secret
into this file, stop — it goes in a password manager or the relevant
platform's encrypted secret store instead (see "Where secrets actually
live" below).

## Servers

| Host | IP | OS | Purpose | User |
|---|---|---|---|---|
| Production VPS | `89.58.55.170` | Debian 10 "buster" (**EOL** since June 2024 — see `docs/adr/0002-self-hosted-platform.md` / `docs/adr/0003-dockerize-same-server.md`) | Shared box: `platform/` (this project's InvenioRDM instance) + 3 unrelated projects (GeoNet, mlg, romani-project) behind one Traefik instance | `admin` |

`platform/` (InvenioRDM) is reachable at
`https://open-vis-framework.duckdns.org` (free DuckDNS domain — swap for
a real domain later if desired; DNS is managed via the DuckDNS account,
see below). As of Migration Phase 8 this replaced the old Next.js
`apps/platform`, which has been deleted (git history preserves it) —
same domain, same cert, repointed Traefik router.

Runs as 8 Docker containers (`platform-{cache,db,mq,search,web-ui,web-api,worker,scheduler}-1`)
via `platform/docker-compose.full.yml` + `platform/docker-compose.prod-override.yml`,
deployed from the real git checkout at `~/open-vis-framework-src/platform/`
by `.github/workflows/deploy-platform.yml`. Traefik routes directly to
`web-ui`/`web-api` (ports 5000/5001) — no nginx in front. Two real
issues found and fixed only *after* the domain was actually live (both
now fixed in the committed `platform/docker/uwsgi/*.ini` files, so
future deploys don't need to rediscover them):
1. uwsgi defaulted to the binary uwsgi protocol (`socket = ...`), which
   needs nginx to translate — fixed via `http-socket` instead, since
   Traefik speaks plain HTTP to the container directly.
2. `/static/*` 404'd entirely (no nginx to serve it), which broke the
   deposit form's JS bundle — "Upload" showed a bare 404. Fixed via
   uwsgi's own `static-map` directive.

One-time init that isn't part of the automated deploy workflow (a fresh
Postgres/OpenSearch volume needs this again): `invenio db init create`,
`invenio index init`, `invenio files location create`,
`invenio roles create admin` + `invenio access allow superuser-access
role admin`, `invenio rdm-records fixtures` (vocabularies — resource
types, licenses, etc.; skipping this causes `InvalidRelationValue`
errors on record creation), `invenio rdm-records custom-fields init`.

The InvenioRDM migration POC used during Migration Phase 2 (scratch
subdomain `ovf-invenio.duckdns.org`) was torn down as part of Phase 8
cutover — its containers, Traefik entries, and `~/ovf-invenio-poc/`
directory are gone. If that subdomain still resolves, nothing is
listening on it anymore.

A new SSH key (`ovf_deploy`, ed25519, no passphrase) was generated
during this migration to replace an earlier interactive key that was no
longer accessible locally; same purpose/name/revocation process as
described below, only the actual keypair differs from whenever this doc
was first written.

## SSH keys in use

| Key name (local) | Purpose | Where it's used |
|---|---|---|
| `ovf_deploy` | Interactive/manual server access (used by an agent or human doing hands-on ops work) | Added to `admin`'s `~/.ssh/authorized_keys` on the production VPS |
| `ovf_ci_deploy` | CI-only, automated deploys | Also in `admin`'s `~/.ssh/authorized_keys`; the **private** half is stored as the `DEPLOY_SSH_KEY` secret in this repo's GitHub Actions settings (Settings → Secrets and variables → Actions) |

Both keys are ed25519, generated specifically for this project (not reused
personal keys) — deliberately separate so either can be revoked without
affecting the other.

**To revoke either key**: remove its line from `~/.ssh/authorized_keys` on
the server. For the CI key, also delete the `DEPLOY_SSH_KEY` GitHub secret
and generate a fresh keypair + update both places together.

**Known gap**: `sudo` on the `admin` account requires a password (not
passwordless) — by design, so automated/CI access can never escalate to
root. Any step needing `sudo` is a manual, human-run step.

## Where secrets actually live

- **SSH private keys**: not in this repo, not in chat history as a record
  of truth. Should live in a password manager (recommended: move them
  there if not already — they were generated and used ad hoc during
  initial setup).
- **`DEPLOY_SSH_KEY`**: GitHub Actions repo secret (encrypted at rest,
  write-only via the UI — can't be read back, only replaced).
- **DuckDNS token**: needed only to change the domain's IP mapping;
  associated with the `vedelsbrunner` GitHub-linked DuckDNS account. Not
  stored in this repo.
- **Database/cache/mq credentials, `SECRET_KEY`, future OAuth client
  secrets**: currently hardcoded dev-only defaults in
  `platform/docker-services.yml` (`SECRET_KEY` is still the literal
  `CHANGE_ME` placeholder in production — see `docs/ROADMAP.md`'s
  Migration Phase 8 entry, a known gap accepted deliberately at cutover
  time, not yet fixed). No git-ignored `.env` mechanism exists for
  `platform/` yet the way the old `apps/platform` had one - needed
  before this is fixed for real.

## Traefik (shared reverse proxy on the production VPS)

- Static config: `/home/admin/mlg/mlg-traefik/traefik.yaml` (owned by the
  "mlg" project, but this is the whole box's Traefik instance — this repo
  only ever *appends* a router/service entry, never edits existing ones).
- Dynamic/routing config: `/home/admin/mlg/mlg-traefik/config.yaml`,
  hot-reloaded (`watch: true`) — no restart needed after edits. Routes for
  `multilingual-world.com`, `mlg-manager.com`, `romani-project.org`
  (unrelated projects) plus `open-vis-framework.duckdns.org` (this
  project) all live in this one file.
- TLS for this project's domain: Let's Encrypt via `acme.sh` (DuckDNS
  DNS-01 challenge, not Traefik's own ACME resolver — avoids needing a
  Traefik restart, which would affect the other 3 domains). Installed
  cert path: `/home/admin/open-vis-framework/certs/`. **Expires ~Nov
  2026, no auto-renewal reload hook wired up yet** — flagged as an open
  follow-up in ADR 0002.

## Before making any change on the production VPS

This box runs 3 other live projects that this repo's tooling has no
visibility into. Any change should be additive (new files, new config
blocks) rather than editing something that predates this project, and
should be verified not to have disrupted the other domains afterward
(`curl -s -o /dev/null -w "%{http_code}" https://<domain>/` for each of
the other 3 is a fast sanity check).

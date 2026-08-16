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
| Production VPS | `89.58.55.170` | Debian 10 "buster" (**EOL** since June 2024 — see `docs/adr/0002-self-hosted-platform.md` / `docs/adr/0003-dockerize-same-server.md`) | Shared box: `apps/platform` (this project) + 3 unrelated projects (GeoNet, mlg, romani-project) behind one Traefik instance | `admin` |

`apps/platform` is reachable at `https://open-vis-framework.duckdns.org`
(free DuckDNS domain — swap for a real domain later if desired; DNS is
managed via the DuckDNS account, see below).

**InvenioRDM migration POC** (see `docs/adr/0005-adopt-inveniordm.md`,
ROADMAP Migration Phase 2): a scratch proof-of-concept stack is also
running on this same server, reachable at `https://ovf-invenio.duckdns.org`.
Not linked from anywhere, not production, no real data — exists to
validate resource footprint and Traefik/reverse-proxy behavior before
committing further to the InvenioRDM migration. Artifacts left on the
server: `~/ovf-invenio-poc/` (app source + certs), a `ovf-invenio-poc`
router/service/cert entry appended to
`/home/admin/mlg/mlg-traefik/config.yaml`, and a Let's Encrypt cert via
acme.sh (same DuckDNS account token, no new credential). Uses uwsgi's
plain `http-socket` mode (not the `socket` uwsgi-protocol default,
which needs nginx in front to translate) since Traefik is routed
directly to the app container, bypassing the cookiecutter's nginx
`frontend` service entirely — static assets are unstyled as a result,
which is expected and untested by design here (Phase 5 handles real
branding/UI). **Tear this POC down** (stop the containers, remove the
Traefik entries, `docker compose down -v`) once Phase 2's evaluation is
complete, whichever way it goes — it's not meant to be long-lived.

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
- **Database credentials, `AUTH_SECRET`, OAuth client secrets** (once
  Phase 3/4 of `docs/ROADMAP.md` land): `apps/platform/.env` on the
  server (git-ignored, never committed — see `apps/platform/.env.example`
  for the shape without values) and mirrored wherever CI needs them for
  the migration step.

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

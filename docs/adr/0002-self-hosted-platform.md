# ADR 0002: apps/platform moved from Vercel to a self-hosted server

- Status: superseded
- Date: 2026-08-16
- Supersedes the Vercel decision in ADR 0001
- Superseded by `docs/adr/0005-adopt-inveniordm.md`: `apps/platform`
  (the Next.js app this ADR is about) was deleted at Migration Phase 8
  cutover, replaced by `platform/` (InvenioRDM). The "self-hosted, same
  server, no managed hosting" *stance* this ADR established carries over
  unchanged to the new deploy target — only the app being deployed and
  the deploy mechanism specifics (see ADR 0003) changed.

## Context

ADR 0001 picked Vercel for `apps/platform` for zero-ops convenience. The
user has an existing server (Debian 10, already running three other live
projects behind a shared Traefik instance) and preferred to self-host
rather than pay for managed hosting.

Relevant facts about that server, discovered during setup:
- **Debian 10 "buster" is EOL** (no security patches since June 2024).
  Acceptable for now; not acceptable once `apps/platform` handles real
  user auth/uploads — revisit before that ships.
- The old glibc (2.28) can't run Next.js 16's default Turbopack build
  (`next build`); use `next build --webpack` on this server specifically.
  `apps/platform`'s `build` script is unchanged (Turbopack) for
  CI/local/anywhere-modern — only the deploy path to this specific server
  uses `build:webpack`.
- Traefik's dynamic routing config is one shared file
  (`/home/admin/mlg/mlg-traefik/config.yaml`, hot-reloaded, `watch: true`)
  serving three other domains. We only ever append to it.
- The other three domains are Cloudflare-proxied (DNS resolves to
  Cloudflare IPs), so Traefik's direct TLS termination (port 443) had
  never actually been exercised by real traffic. Our domain bypasses
  Cloudflare (plain DNS via DuckDNS), which is what surfaced the need for
  an explicit `tls: {}` stanza on our router — Traefik v2 doesn't
  terminate TLS for a router without one, but this had gone unnoticed
  since nothing else needed it.
- No domain existed for the project yet; using `open-vis-framework.duckdns.org`
  (free) rather than buying one, swappable later.

## Decision

- `apps/platform` runs under **pm2** (`open-vis-framework` process, pinned
  to a dedicated Node 22 install via `nvm`, explicit interpreter path —
  the server's other pm2 apps stay on Node 16, untouched).
- TLS via **acme.sh + DuckDNS DNS-01** (not Traefik's own ACME resolver —
  avoids touching Traefik's static config, which would require a restart
  affecting the other three sites). Cert renewal reload hook is not yet
  wired up (hit a permission boundary touching another project's path);
  manual follow-up needed before the cert's Nov 2026 expiry.
- Deploys via **GitHub Actions → SSH** (`.github/workflows/deploy-platform.yml`):
  on push to `main` (paths touching `apps/platform`, shared packages, or
  the lockfile), the runner SSHes in, `git pull`s, rebuilds with
  `build:webpack`, and restarts the pm2 process. A dedicated CI-only SSH
  key is used (separate from the key used for interactive/manual server
  work), so either can be revoked independently.
- `apps/web` is unaffected — still GitHub Pages, still in this same repo.

## Consequences

- No managed hosting bill, but real ops ownership: OS patching, backups,
  and uptime are now on us, not a vendor.
- `pm2 startup` (reboot persistence) isn't configured for *any* app on
  this server, including the pre-existing three — not something this
  change caused, but worth knowing. Needs a one-time `sudo` command to fix.
- Before `apps/platform` handles real user data: address the EOL OS
  (upgrade or migrate) — tracked here, not resolved yet.

# ADR 0001: Monorepo with two deploy targets (web + platform)

- Status: accepted
- Date: 2026-08-16

## Context

This repo is `open-vis-framework.github.io` — GitHub's special repo name for
org Pages, which can only serve static files (no server, no database, no
server-side auth). The product itself ("Open Vis Framework") is planned as a
full web app: accounts, project submissions, moderation/review, uploads —
all of which need a server and a database.

## Decision

- **One repo, two apps, two deploy targets:**
  - `apps/web` — public landing/docs site. Next.js, static export
    (`output: "export"`), deployed to **GitHub Pages** via
    `.github/workflows/deploy-web.yml`. No backend, no accounts.
  - `apps/platform` — the actual product. Next.js, server-rendered,
    deployed to **Vercel** by importing this repo with the Vercel project's
    **Root Directory set to `apps/platform`**. Vercel builds/deploys
    independently of the GitHub Pages workflow; both read from the same
    git history but never interfere with each other.
- **Package manager / build tool:** pnpm workspaces + Turborepo. Keeps the
  two apps' installs/builds isolated but cacheable, and leaves room for a
  `packages/*` directory (shared UI, types, config) once there's real code
  to share — none exists yet, so it's intentionally not scaffolded.
- **Backend (when `apps/platform` needs one):** Supabase (Postgres + Auth +
  Storage) on Vercel, per prior discussion. Not wired up in this scaffold —
  no env vars, no client libraries yet.
- **MVP data model** (for later): `User` (role: contributor / moderator /
  admin), `Project` (status: draft / pending_review / published /
  rejected), `ProjectVersion`, `ModerationAction`. Not implemented yet.

## Consequences

- Contributors need to know *which app* they're touching — `apps/web` for
  anything public-facing/marketing/docs, `apps/platform` for product
  features. CLAUDE.md at the root and in each app should make this obvious.
- Two separate CI concerns: `ci.yml` lints/builds both apps on every push/PR;
  `deploy-web.yml` only redeploys Pages when `apps/web` (or shared
  packages) change.
- Licensing (code + contributed content/metadata) is still undecided —
  tracked as an open TODO, not blocking this scaffold.
- `CODE_OF_CONDUCT.md` and a real `LICENSE` are deferred until the repo is
  ready to accept outside contributions.

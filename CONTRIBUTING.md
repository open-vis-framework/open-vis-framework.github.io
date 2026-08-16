# Contributing

This project is early — the platform itself (`apps/platform`) is a
scaffold with no features yet. Until there's a real `LICENSE` and
`CODE_OF_CONDUCT.md` in place, treat this repo as pre-alpha internal
scaffolding rather than an open call for contributions.

## Setup

```
git clone git@github.com:open-vis-framework/open-vis-framework.github.io.git
cd open-vis-framework.github.io
corepack enable          # ensures the pinned pnpm version is used
pnpm install
pnpm dev                 # runs both apps/web and apps/platform in parallel
```

Requires Node 22+ (see `.nvmrc`).

## Repo layout

See `CLAUDE.md` for the full breakdown of `apps/web` vs `apps/platform` vs
`packages/*`, and `docs/adr/` for why the repo is shaped this way.

## Workflow

- Branch off `main`, open a PR — CI (`.github/workflows/ci.yml`) runs
  lint + build on every push and PR.
- Record any non-obvious architectural decision as a new file in
  `docs/adr/`, numbered sequentially.

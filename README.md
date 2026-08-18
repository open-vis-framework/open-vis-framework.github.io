# Open Vis Framework

An open platform for information visualization projects — people submit
their work with rich metadata and context (data provenance, visual
encoding & design, AI involvement, limitations) as "Visualization
Sheets", browsable and searchable by others.

## Repo layout

```
apps/web        public landing/docs site → GitHub Pages (this repo's Pages site)
platform/       the product itself: an InvenioRDM instance → self-hosted server (Docker + Traefik)
packages/*      shared code, once something needs sharing (empty for now)
docs/adr/       architecture decision records
```

See `docs/adr/0001-monorepo-two-apps.md` for the original repo shape and
`docs/adr/0005-adopt-inveniordm.md` for why the product moved to
InvenioRDM. `CLAUDE.md` has conventions for working in this repo.

## Development

`apps/web`:
```
corepack enable
pnpm install
pnpm dev
pnpm build
pnpm lint
```

`platform/`: see `docs/ROADMAP.md`'s "Local dev" section (InvenioRDM's
own `invenio-cli` tooling, not pnpm).

## Status

See `docs/ROADMAP.md` for what's done and what's still known-incomplete
(auth is local-login only for now; chart type still needs a controlled
multi-value taxonomy before it can be faceted), and
`CONTRIBUTING.md` for the current state of the contribution workflow.

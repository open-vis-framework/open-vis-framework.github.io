# [open] vis

An open platform for information visualization projects — people submit
their work with rich metadata and context (data provenance, visual
encoding & design, AI involvement, limitations) as "Visualization
Sheets", browsable and searchable by others.

## Repo layout

```
apps/web        public landing/docs site → GitHub Pages (this repo's Pages site)
platform/       the product itself: an InvenioRDM instance → self-hosted server (Docker + Traefik)
packages/*      shared code, once something needs sharing (empty for now)
```

`CLAUDE.md` has conventions for working in this repo.

## Development

`./run.sh` sets up and starts both apps for local dev in one go (needs
`pnpm`, `uv`, `invenio-cli`, and a running Docker daemon on `PATH`).
Ctrl-C stops both.

To run either app on its own:

`apps/web`:
```
corepack enable
pnpm install
pnpm dev
pnpm build
pnpm lint
```

`platform/`: InvenioRDM's own `invenio-cli` tooling (not pnpm) — see
`platform/README.md`.

## Status

Known-incomplete: auth is local-login only for now; chart type still
needs a controlled multi-value taxonomy before it can be faceted.

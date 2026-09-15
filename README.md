# [open] vis

An open platform for information visualization projects — people submit
their work with rich metadata and context (data provenance, visual
encoding & design, AI involvement, limitations) as "Visualization
Sheets", browsable and searchable by others.

## Repo layout

```
platform/       the product: an InvenioRDM instance → self-hosted server (Docker + Traefik)
```

`CLAUDE.md` has conventions for working in this repo.

## Development

`./run.sh` sets up and starts the app for local dev in one go (needs
`uv`, `invenio-cli`, and a running Docker daemon on `PATH`). Ctrl-C stops it.

That's InvenioRDM's own `invenio-cli` tooling under the hood — see
`platform/README.md` for the commands run.sh wraps.

## Status

Known-incomplete: auth is local-login only for now; chart type still
needs a controlled multi-value taxonomy before it can be faceted.


# Valentin

test@test.com
test123 

for quick access

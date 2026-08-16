# Open Vis Framework

An open platform for information visualization projects — people submit
their work with rich metadata and context, browsable and searchable by
others. Early scaffold stage; no product features yet.

## Repo layout

```
apps/web        public landing/docs site → GitHub Pages (this repo's Pages site)
apps/platform   the product itself → Vercel (deployed separately)
packages/*      shared code, once something needs sharing (empty for now)
docs/adr/       architecture decision records
```

See `docs/adr/0001-monorepo-two-apps.md` for why it's split this way, and
`CLAUDE.md` for conventions when working in this repo.

## Development

```
corepack enable
pnpm install
pnpm dev      # both apps in parallel
pnpm build
pnpm lint
```

## Status

Scaffold only — see `docs/adr/` for what's decided and `CONTRIBUTING.md`
for the current state of the contribution workflow.

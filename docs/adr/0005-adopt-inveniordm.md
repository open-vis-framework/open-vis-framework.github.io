# ADR 0005: Adopt InvenioRDM for `apps/platform`, replacing the Next.js backend

- Status: accepted
- Date: 2026-08-16
- Supersedes `docs/adr/0004-visualization-sheets.md` (schema) and the
  deploy-mechanism portions of `docs/adr/0002-self-hosted-platform.md` /
  `docs/adr/0003-dockerize-same-server.md` for the product app
  specifically. Does **not** reverse those ADRs' "self-hosted, no
  managed hosting, no new server" stance — that stance is kept.

## Context

OVF's backend modeled a "Visualization Sheet" as ~30 mostly free-text
columns on one `sheets` table (`apps/platform/src/db/schema.ts`), with
no real search — a single `ilike` filter across three columns in
`apps/platform/src/app/browse/page.tsx` — and no path to faceted or
full-text search without hand-building one.

The goal is a metadata-first architecture: structured, extensible,
search-indexable records, aligned with how InvenioRDM (the framework
behind Zenodo and many institutional repositories) already does this.
Three options were weighed:

1. **Bolt a bare OpenSearch container onto the existing Next.js app** —
   smallest change, keeps all shipped work (Auth.js, Drizzle, the
   Tailwind UI), but only gets search, not the rest of InvenioRDM's
   record/versioning/metadata machinery.
2. **Re-architect the Next.js app's own schema** to be metadata-JSON-first
   (versioned document + a `SearchIndex` interface, Postgres full-text as
   an interim engine) — still a from-scratch, hand-rolled implementation
   of ideas InvenioRDM already provides.
3. **Adopt InvenioRDM directly.**

Before deciding, the production server's actual capacity was checked
(previously undetermined) — verified live: **8 vCPU, 11GB RAM (~10GB
available), 284GB free disk** on the same Debian 10 "buster" (EOL since
June 2024) box that also runs 3 unrelated projects (GeoNet, mlg,
romani-project) behind one shared Traefik instance. InvenioRDM's
documented minimum is 4 cores / 8GB RAM, running 4-8 containers
(Postgres, OpenSearch, Redis, RabbitMQ, web, worker), OpenSearch being
the heaviest. The server comfortably clears that minimum with room to
spare for the other tenants.

## Decision

**Adopt InvenioRDM directly**, replacing `apps/platform`'s Next.js
backend rather than adding search on top of it. This is explicitly a
**framework migration, not a refactor** — auth, file storage, the data
model, and the submit/browse/detail UI all become InvenioRDM's own
(Python/Flask) equivalents, customized for the Visualization Sheet
domain via InvenioRDM's official custom-fields extension mechanism
(`RDM_NAMESPACES` / `RDM_CUSTOM_FIELDS` / `RDM_CUSTOM_FIELDS_UI`).

Rejected the two Next.js-side options because they mean hand-building
(and then maintaining) a permanent, weaker approximation of
functionality InvenioRDM already provides and maintains upstream:
faceted/full-text search, record metadata validation, and file storage
are all solved problems in Invenio; re-solving them ourselves has an
ongoing maintenance cost with no corresponding benefit once the project
is willing to take on a framework migration.

**Target shape:**
- New top-level directory **`platform/`** (sibling to `apps/`,
  `packages/`), the InvenioRDM instance scaffolded via
  `invenio-cli init rdm`. It is a Python project and cannot be a pnpm
  workspace member (`pnpm-workspace.yaml` scopes to `apps/*`/`packages/*`),
  so it deliberately lives outside `apps/`.
- `apps/platform` (current Next.js app) keeps serving production traffic
  until cutover, then is deleted — git history preserves it, matching
  the precedent ADR 0004 set ("clean replacement, not migration").
- `apps/web` (static marketing/docs site, GitHub Pages) is entirely
  unaffected.
- Rollout is phased with explicit go/no-go gates (see
  `docs/ROADMAP.md`), matching this project's own established pattern
  (ADR 0003's Phase 1 Docker-install gate) — later phases are
  contingent on earlier ones actually passing on real hardware, not
  assumed to work from documentation alone.

## Consequences

- This is a multi-week effort, not a quick change. `apps/platform`'s
  already-shipped Auth.js (ORCID/Google/GitHub), Drizzle schema, Tailwind
  UI, and hand-rolled `Storage` interface are all retired at cutover —
  sunk work, but the project explicitly chose this tradeoff being
  early-stage with one contributor.
- The repo gains a second language/toolchain (Python) alongside the
  existing pnpm/Turborepo JS stack. CI, the deploy pipeline, and
  `CLAUDE.md`'s conventions all need updates to reflect this
  (`.github/workflows/ci.yml` needs a separate job for `platform/`;
  `pnpm-workspace.yaml`/`turbo.json` stop covering it).
- InvenioRDM's custom-field types are limited to string/array/integer/date
  (no nested objects) — the six-section Visualization Sheet taxonomy from
  ADR 0004 is preserved conceptually but re-expressed as a flatter set of
  namespaced (`ovf:*`) custom fields, the same granularity as the
  current column list.
- The shared box's EOL OS and multi-tenancy risk (already flagged in ADR
  0002/0003) are **not** resolved by this decision — InvenioRDM's heavier
  container set is now also exposed to that risk. Phase 2's go/no-go gate
  exists specifically to catch this before committing further.
- Real unknowns are deliberately left open rather than pre-decided:
  exact reverse-proxy config for Invenio behind Traefik (vs. Invenio's
  own default TLS-terminating setup), and whether Invenio's heavier
  Docker build (Python deps + webpack asset bundling) should run in CI
  or on-server. Both are resolved empirically during Phase 2, not
  assumed here.

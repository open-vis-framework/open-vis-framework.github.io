# Roadmap

Living plan for the product backend. This is the document to read first if
you're picking this project up cold (fresh clone, new agent session) — the
ADRs in `docs/adr/` explain *why* each decision was made; this is *what's
done and what's next*, kept up to date as phases land.

Current phase: **cut over to `platform/` (InvenioRDM)** — see
`docs/adr/0005-adopt-inveniordm.md` for why. The old Next.js
`apps/platform` app has been deleted (Migration Phase 8); its history is
kept below ("Phases 0-9") for context, same as ADR 0004 did for the
schema it replaced. Known-incomplete right now: no OAuth (local login
only), and chart type remains free text rather than a controlled,
multi-valued facet - see the phases below for what to pick up.

## InvenioRDM migration (current work — see ADR 0005)

- [x] **Migration Phase 0 — Docs**: this section, ADR 0005, `CLAUDE.md`
      layout update.
- [x] **Migration Phase 1 — Local scaffold** (go/no-go gate, passed):
      `invenio-cli init rdm` into `platform/`, `invenio-cli install`,
      `invenio-cli services setup` + `invenio-cli run` locally with demo
      data — serving at `https://127.0.0.1:5000`. Toolchain installed via
      Homebrew: Python 3.14, `uv`, `pipx`, Node 24 (kept keg-only/unlinked
      — doesn't affect `apps/*`'s pinned Node 22 via `.nvmrc`),
      ImageMagick. Two real bugs hit and fixed: (1) InvenioRDM's Postgres
      wants host port 5432, already held by `apps/platform`'s local dev
      Postgres — Compose created the container but silently never bound
      the host port (no error, just a hang); remapped to 5433 in
      `platform/docker-services.yml` + `platform/invenio.cfg`. (2) The
      cookiecutter scaffolds into a dir named after `project_shortname`,
      not `platform/` — after the rename, `platform/docker/pgadmin/servers.json`
      referenced a stale container name; fixed to use the stable Compose
      service alias (`db`).
- [x] **Migration Phase 2 — Server proof-of-concept** (go/no-go gate,
      passed): full InvenioRDM stack (db/cache/mq/search/web-ui/web-api/
      worker/scheduler — 8 containers, `frontend`/pgadmin/flower/
      opensearch-dashboards skipped as non-essential for this check) built
      and run on the production server via `docker-compose.full.yml`,
      routed through Traefik on a scratch subdomain
      (`ovf-invenio.duckdns.org`, real Let's Encrypt cert via the existing
      acme.sh/DuckDNS setup — see `docs/ops/access.md`). Resource
      footprint: ~4.4GB/11GB RAM used total (alongside `apps/platform` +
      the 3 unrelated projects), ~3.2GB attributable to the Invenio stack
      itself (search/worker are the heaviest at ~1GB+ each) — comfortable
      headroom. All 4 other live domains spot-checked unaffected after
      both the container startup and the Traefik config edit. Confirmed
      `SITE_UI_URL`/`TRUSTED_HOSTS`/`PROXYFIX_CONFIG` correctly produce
      HTTPS-aware redirects/cookies (`Set-Cookie: ...; Secure`) behind
      Traefik. One real finding: the cookiecutter's uwsgi services default
      to the binary uwsgi protocol (`socket = ...`), meant to sit behind
      the bundled nginx `frontend` (which speaks `uwsgi_pass`) — routing
      Traefik directly to the app container needed `http-socket` instead.
      This POC therefore has no static-asset styling (nginx normally
      serves `/static`) and no `/api` path-split routing — both explicitly
      deferred to **Migration Phase 7**, which needs to decide for real
      whether the production deploy keeps nginx-in-front (full fidelity,
      more moving parts) or goes Traefik-direct like this POC (simpler,
      needs its own static-serving + `/api` routing answer). POC is left
      running for now — see `docs/ops/access.md` for teardown notes when
      it's no longer needed.
- [x] **Migration Phase 3 — Visualization Sheet metadata mapping**
      (placeholder pass, deliberately not final): `platform/site/open_vis_framework/custom_fields.py`
      defines 15 `ovf:*` custom fields, one per ADR 0004 field not
      already covered by an InvenioRDM native field (title, creators,
      description, subjects, rights all map to native fields - no
      custom field needed for those). Every field is a plain `TextCF`
      for now - same granularity as the old free-text columns, no real
      validation yet (e.g. `viz_url` isn't checked as a URL,
      `ai_involvement` isn't a constrained vocabulary despite having
      been a Postgres enum before). `ai_involvement` and `chart_types`
      are marked `use_as_filter=True` so Migration Phase 6 can facet on
      them. Verified locally: `invenio rdm-records custom-fields init`
      succeeds, all 15 fields load into `app.config['RDM_CUSTOM_FIELDS']`.
      Native-field mapping (title/creators/description/subjects/rights)
      and real validation are explicitly deferred to a later, non-
      placeholder pass over this same file - see the TODO at the top of
      `custom_fields.py`.
- [x] **Migration Phase 4 — Auth** (partial, by explicit direction): OAuth
      (Google/GitHub/ORCID via `invenio-oauthclient`) skipped for now —
      needs external OAuth app registrations, revisit before Migration
      Phase 8 cutover (see `docs/ops/access.md`). Instead, one local-login
      test account was created (InvenioRDM's local login was already
      enabled by default - `ACCOUNTS_LOCAL_LOGIN_ENABLED = True` in
      `invenio.cfg`, no new code): `admin@example.com` / `admin123`
      (InvenioRDM enforces a 6-char password minimum, so not literally
      "admin"/"admin"), granted the `admin` role. Created on both the
      local dev instance and the server POC via `invenio users create`
      + `invenio roles add`. Not meant to survive past this dev/testing
      period - revisit alongside real Phase 4 auth work.
- [x] **Migration Phase 5 — Branding/UI**: already satisfied by the
      cookiecutter's own defaults - `THEME_SITENAME`/`THEME_FRONTPAGE_TITLE`
      in `invenio.cfg` are set to "Open Vis Framework" from the `invenio-cli
      init` prompts (Phase 1). No further work done: still the default
      Invenio theme/layout, functionally correct per this phase's
      original scope, not a visual redesign - that's a separate,
      explicitly-deferred follow-up, not blocking anything else.
- [x] **Migration Phase 6 — Search & browse** — minimal 80/20 pass landed
      in Migration Phase 12: the public search now exposes topic, license,
      and AI-involvement facets. AI involvement uses stable controlled values
      while retaining the existing scalar string mapping. Chart type is
      deliberately not faceted yet: its current
      comma-separated free text would produce misleading whole-string buckets.
- [x] **Migration Phase 7 — Deploy pipeline**: `.github/workflows/deploy-platform.yml`
      (took over the name/role of the old Next.js deploy workflow, which
      it replaced) — SSH+Compose, reuses the same `DEPLOY_SSH_KEY` secret.
      Originally targeted the scratch POC domain via a POC-specific
      override; at Migration Phase 8 that override was replaced by
      `platform/docker-compose.prod-override.yml` (real domain,
      `open-vis-framework.duckdns.org`). Production now follows successful
      CI for the exact commit, verifies optional custom-field mappings before
      switching containers, and smoke-tests a record and badge afterward.
      It does not yet automate one-time
      DB/index/role init (run once by hand over SSH at cutover, matching
      how the Phase 2 POC was set up) - a fresh Postgres volume needs that
      same manual step again.
- [x] **Migration Phase 8 — Cutover & retirement**: `apps/platform`
      deleted (Next.js/Drizzle/Auth.js, root `docker-compose.yml`/
      `docker-compose.override.yml`, the old `deploy-platform.yml` - all
      gone, git history preserves them). `pnpm-workspace.yaml`/`ci.yml`
      updated (ci.yml gained a `platform/` sanity job: `uv sync --frozen`,
      no tests yet - see `docs/ROADMAP.md`'s note in that job).
      ADR 0002/0003 marked superseded (0004 already was, from the Phase 3
      commit history). Traefik's `open-vis-framework.duckdns.org` router
      repointed from the old Next.js container (port 3001) to the real
      InvenioRDM deployment, reusing the same already-issued Let's
      Encrypt cert (same domain, no new cert needed). The scratch POC
      from Migration Phase 2 was torn down as part of this (its
      containers, Traefik entries, and `~/ovf-invenio-poc/` directory on
      the server) - superseded by the real deployment.
      **Known gap, accepted deliberately** (see the direction that
      triggered this phase): `SECRET_KEY` is still `docker-services.yml`'s
      `CHANGE_ME` placeholder in production. Real follow-up work, not
      blocking this cutover, but should not stay this way indefinitely -
      whoever picks up Migration Phase 4 (OAuth) for real should fix this
      in the same pass, since both touch session/auth security.

      **Two real bugs found only after the domain was actually live**
      (both now fixed in the committed `platform/docker/uwsgi/*.ini`
      files, not just patched by hand on the server, so they don't
      recur on the next deploy):
      1. The Migration Phase 2 `http-socket` fix (uwsgi needs plain HTTP,
         not the binary uwsgi protocol, since there's no nginx in front
         to translate) had only ever been applied to the scratch POC's
         server-local copy - never committed. The real cutover deploy
         reverted to the cookiecutter's default and returned 502 behind
         Traefik until this was caught and fixed for real.
      2. `/static/*` 404'd entirely with no nginx to serve it - which
         broke the deposit form's JS bundle. Clicking "Upload" showed a
         bare "Page not found" instead of the form. This is *not* the
         "static-asset styling" gap Migration Phase 2 already flagged as
         acceptable (that meant "looks unstyled"); this broke the
         platform's core function and was fixed immediately, not treated
         as an accepted trade-off. Fix: uwsgi's own `static-map`
         directive serves `/static` directly from the container.

      Also missing from the manual cutover init steps until the demo
      records below failed with `InvalidRelationValue`: `invenio
      rdm-records fixtures` (loads the resource-types/licenses/etc.
      vocabularies) - `invenio-cli services setup` does this
      automatically for local dev, but the manual production init
      commands didn't include it. Documented in `docs/ops/access.md`'s
      full one-time-init list now.

      **3 real-world example Visualization Sheets** added as demo data
      (Gapminder's "Wealth & Health of Nations", Our World in Data's
      COVID-19 Data Explorer, The Pudding's "Women's Pockets are
      Inferior") - `url`-type viz source linking to the real published
      projects, not uploaded/hosted copies. One-off `invenio shell`
      script, not a repeatable fixture - see git history if it needs
      redoing (e.g. after a fresh Postgres volume).

No data migration needed — only test/seed data exists in `sheets` today
(confirmed before starting this migration), so cutover is a clean
replacement, not a backfill.

- [x] **Migration Phase 9 — Post-cutover polish** (theme, VOI, thumbnails):
  - **Theme pass** (`platform/assets/less/site/globals/site.variables`,
    previously empty): `@brandColor` (deep indigo), `@fontName` (system-
    font stack, no Google Fonts/CSP changes needed), `@defaultBorderRadius`
    (6px). Three variables cascading through nearly every component via
    invenio-theme's own designated instance-theming hook. Also
    `THEME_SHOW_FRONTPAGE_INTRO_SECTION = False` in `invenio.cfg` to hide
    the generic default-theme frontpage blurb.
  - **VOI (Visualization Object Identifier)**: new `ovf:voi` custom field
    (`platform/site/open_vis_framework/custom_fields.py`). Self-assigned
    only (`10.9999/ovf.NNNNNNN`, mirroring invenio_rdm_records' own demo-
    fixture convention for fake-DOI-shaped test identifiers) - **not** a
    real, externally-resolvable identifier. A real one needs DataCite DOI
    registration (`DATACITE_ENABLED` already stubbed in `invenio.cfg`),
    deferred - needs either a free DataCite Fabrica test account or a
    paid production membership, both external actions, explicitly not
    set up yet.
  - **Thumbnails**: InvenioRDM's native file-upload + `files.default_preview`
    already does this - no new code needed, just `files.enabled: true` +
    an attached image at record-creation time. The 3 demo records got
    simple original SVG-then-PNG placeholder graphics (abstract shapes
    matching each viz's chart type, in the new brand palette) -
    deliberately not screenshots of the real (copyrighted) sites, which
    would be a materially different, riskier thing than the `viz_url`
    link already used.
  - **Real bug hit and fixed**: records originally published with
    `files.enabled: false` permanently lock their file bucket
    (`invenio_files_rest.BucketLockedError`) - can't add files after the
    fact via edit. Had to tombstone (soft-delete) and republish the 3
    demo records rather than edit them in place.
  - **Real bug hit and fixed, more seriously**: the first tombstone
    attempt passed `removal_reason: {"id": "misc"}`, which isn't a valid
    loaded vocabulary term in our reduced-vocab setup - crashed
    mid-transaction during search indexing, leaving one record in a
    broken deleted-but-unrenderable state (500 on read). Fixed by
    directly patching the record's raw tombstone data (bypassing the
    service layer's relation dereferencing) to drop the bad key, then
    `restore_record`. Lesson: `removal_reason` is optional on the
    tombstone schema - omit it entirely for self-service/CLI deletes
    rather than guessing at a vocabulary ID.
  - Same three commands run manually (not yet automated) as the original
    demo-record push: `invenio rdm-records custom-fields init` after
    each custom-fields change, then the one-off `invenio shell` script.

- [x] **Migration Phase 10 — More theming: search-result thumbnails,
  footer, header logo**:
  - **Search-result thumbnails**: the stock InvenioRDM search-results
    list component (`RecordsResultsListItem.js`) never renders an image
    at all, even though every record's API response already includes
    real IIIF thumbnail links (`result.links.thumbnails`) generated from
    `files.default_preview`. Overridden via the app's own supported
    customization point - `platform/assets/js/invenio_app_rdm/overridableRegistry/mapping.js`,
    registering a replacement for the `"RecordsResultsListItem.layout"`
    overridable id with a copy of the stock layout plus an `Item.Image`.
    **Real finding**: only specific known files (like `mapping.js`
    itself) get collected/symlinked from `platform/assets/js/` into the
    actual webpack build - an arbitrary sibling file imported from it is
    *not* automatically picked up (`Cannot find module` at build time).
    Fixed by inlining the whole component directly in `mapping.js`
    rather than fighting the collection mechanism.
  - **Footer**: overrode `invenio_app_rdm/footer.html` (three columns of
    generic InvenioRDM promotional links - GitHub, Discord, product
    page - not relevant to this instance) with a minimal one-line
    version. **Real finding, the one worth remembering**: Invenio's
    template resolution is *not* plain Flask/Jinja blueprint precedence.
    `app.jinja_env.loader` is `invenio_app.helpers.ThemeJinjaLoader`,
    which - for every template name - tries an `APP_THEME`-prefixed
    version (`semantic-ui/<name>`) across *all* loaders (app + every
    blueprint) *before* falling back to the unprefixed name across all
    loaders again. Since the package's own footer template physically
    lives under a `.../templates/semantic-ui/invenio_app_rdm/footer.html`
    path, an override placed at the "obvious" unprefixed
    `platform/templates/invenio_app_rdm/footer.html` is *never reached*
    - the prefixed pass finds the package's own version first, everywhere.
    The correct override path is `platform/templates/semantic-ui/invenio_app_rdm/footer.html`
    (mirroring the exact structure already visible in the cookiecutter's
    own `platform/site/open_vis_framework/templates/semantic-ui/open_vis_framework/`
    stub - the same convention, just not obvious until you hit it).
    Confirmed via `app.jinja_env.get_template(name).filename` - the most
    reliable way to check which file a template name *actually* resolves
    to, rather than guessing from HTTP responses. Any future template
    override in this project should live at
    `platform/templates/semantic-ui/<package>/<template>.html`, not
    `platform/templates/<package>/<template>.html`.
  - **Header logo**: `THEME_LOGO` swapped from the generic
    `images/invenio-rdm.svg` to a small original mark
    (`platform/static/images/ovf-logo.svg`) - config-only, no template
    override needed for this one.
  - **Local-dev-only gotcha, not a production issue**: newly-added
    `platform/static/*` and `platform/templates/*` files don't
    automatically appear under `.venv/var/instance/{static,templates}/`
    for an already-running `invenio-cli run` - that copy only happens
    once, during `invenio-cli install`. Had to manually copy + restart
    the dev server to test locally. **Not a concern for real deploys**:
    the Dockerfile's own `COPY ./static/ ...` / `COPY ./templates/ ...`
    steps run fresh on every image build, so this only ever bit local
    testing, not `docker-compose.full.yml` deploys.
  - **Correction, next session**: this phase was pushed, broke something
    in production, and got reverted (`ee06f172` → `42bc5e5`) without a
    root-cause writeup. Re-verifying by actually running the dev server
    (not just reading source) found the thumbnail override had in fact
    *never worked, in dev or prod* - the "verified locally" claim above
    was wrong. Two real bugs, both now fixed:
    - **Wrong override id.** `RecordsResultsListItem.layout` is
      namespaced per search app: `react-searchkit`'s `buildUID()`
      prefixes it with that app's own `appName`
      (`InvenioAppRdm.Search.RecordsResultsListItem.layout` on
      `/search`, `InvenioAppRDM.RecordsList.RecordsResultsListItem.layout`
      on the frontpage, etc. - grep `const appName = "..."` across
      `invenio_app_rdm`'s `search/`, `frontpage/`,
      `collectionRecordsSearch/`, `communityRecordsSearch/`,
      `user_dashboard/uploads.js` for the full list). There is no
      unprefixed/global registration point. The original commit
      registered the bare `"RecordsResultsListItem.layout"` key, which
      matched nothing - `Overridable` just silently fell through to the
      stock component instead of erroring, so it looked like it had no
      effect rather than looking broken. Fixed in `mapping.js` by
      registering the component under every real appName-prefixed key.
    - **Logo clipping.** `ovf-logo.svg`'s `viewBox="0 0 160 40"` was too
      narrow for its own `"Open Vis Framework"` text (18px, starting at
      x=44) - SVGs clip to their viewBox by default, so the header
      rendered as `"Open Vis Fran"`. Widened the viewBox to `0 0 260 40`.
    - Actually confirmed this time: ran `invenio-cli assets build
      --development` + `invenio-cli run` against the real local Postgres/
      OpenSearch/Redis/RabbitMQ stack, then screenshotted `/`, `/search`,
      and a record page via headless Chrome
      (`google-chrome --headless=new --screenshot`, since
      claude-in-chrome wasn't available) rather than trusting a
      source-level read.
    - The `platform/Dockerfile`'s explicit `COPY ./static/images/`
      step (added after the original revert, to guard against
      `invenio collect && invenio webpack buildall` not reliably
      surviving BuildKit's multi-stage cache) ships together with this
      fix and should make the production build match local behavior
      this time.
    - **This wasn't the whole story.** After deploying the above, the
      logo and thumbnail bundle *still* didn't show up live (confirmed
      by fetching `/static/dist/js/overridable-registry.*.js` directly
      and diffing its content, not just eyeballing the page) even
      though the deploy job reported success and the footer override
      *did* go live. Root cause: `docker-compose.full.yml`'s
      `static_data` named volume is mounted over
      `/opt/invenio/var/instance/static` on `web-ui` (and `frontend`,
      unused in this deployment - Traefik talks to `web-ui` directly,
      see `docker/uwsgi/uwsgi_ui.ini`'s own comment on that). Docker
      only auto-populates a named volume from image content the first
      time it's created empty; every deploy since then leaves the old
      volume content in place regardless of what's now baked into the
      image at that path - explains the logo (volume-shadowed) vs.
      footer (a template, not under the volume mount, so it just
      worked) split exactly. A first fix attempt (`docker run -v
      vol:/dst image cp ...` to re-sync the volume from the fresh image)
      reported success but *still* didn't change anything live, and
      wasn't diagnosable further without a shell on the server (no
      `admin` access to the self-hosted box, and `actions/runs/.../jobs/
      .../logs` needs repo-admin token scope, not just public read).
      Second attempt, in `.github/workflows/deploy-platform.yml`: drop
      the volume entirely and let Compose recreate it fresh on every
      deploy, relying on Docker's ordinary first-mount auto-populate
      instead of a custom copy step. Also added `script_stop: true` to
      the `appleboy/ssh-action` step - without it, a `set -e` abort
      partway through the remote script does not reliably fail the
      GitHub Actions job, which is very likely what actually happened
      on the first (silently ineffective) re-sync attempt.

- [x] **Migration Phase 11 — Embeddable Visualization Sheet badges**:
  every public published record now exposes a stable SVG at
  `/badges/records/<record-id>.svg`, with a copyable Markdown/HTML
  embed panel on the record page. The SVG is deliberately self-contained
  and served with a one-hour public cache plus an ETag, so a README or
  project page can keep one permanent image URL while its label changes.
  Rankings use the existing Invenio Stats data rather than counting badge
  loads: the native daily Invenio unique-view counts are summed over the
  calendar week by parent record, so views across record versions stay
  together. This is a weekly traffic score, not a claim that a returning
  visitor can be deduplicated across days.
  Ties share a competition rank. To avoid an inflated-looking `#1 of 3`,
  the badge stays a useful `Visualization Sheet · Listed` registry badge
  until the catalogue has at least 10 public records and the sheet has at
  least 5 weekly traffic-score views; both thresholds are instance config.
  Qualified badges show current weekly rank and peak rank. Weekly snapshots
  live in Redis for an hour; peak ranks are updated atomically in the
  persistent OpenSearch volume (`ovf-badge-rank-peaks-v1`), avoiding a new
  SQL table/migration for this small derived-data feature. Badge requests
  read record data through the service layer and explicitly reject drafts,
  deleted records, and non-public records; unlike a landing-page request,
  they do not emit a record-view event. Production verification caught two
  deployment-specific details before handoff: the route must stay outside
  `/api/*` because Traefik sends that prefix to the REST container, while the
  instance blueprint is registered on the UI container; and the copy buttons
  use a self-hosted Webpack entry rather than inline JavaScript because the
  production CSP deliberately blocks inline scripts.

- [x] **Migration Phase 12 — Reader disclosure, resource links, and revision
  notes**: the public record page now includes a six-area documentation
  coverage summary (visualization, sources, transformations, visual design,
  AI involvement, limitations). The score only reports whether metadata was
  supplied and explicitly disclaims independent verification. The existing
  visualization URL plus native typed related identifiers are promoted into
  an external-resources panel for visualization, data, code, and analysis
  links, with HTTP(S)-only URL handling and deduplication. AI involvement is
  now a controlled deposit-form dropdown and public browse facet alongside
  native topic and license facets. A version-specific `ovf:version_notes`
  field records “What changed?”; OVF replaces only Invenio's custom-fields
  service component so the prior note is cleared when a new-version draft is
  created. CI runs the focused platform unit tests after resolving the locked
  environment; only a successful run deploys that exact commit. Deploy
  initializes and verifies the optional OpenSearch mapping before switching
  containers, then smoke-tests public record and badge routes.

## Phases (completed — `apps/platform`, Next.js, pre-migration history)

- [x] **Phase 0 — Docs**: this file, ADR 0003, `docs/ops/access.md`.
- [x] **Phase 1 — Verify Docker installs on the existing server** (go/no-go
      gate, passed — Docker's own apt repo still serves buster even though
      Debian's own mirrors are archived; had to repoint the base OS's
      `sources.list` at `archive.debian.org` too, for a couple of Docker's
      transitive deps).
- [x] **Phase 2 — Dockerize `apps/platform`**: `Dockerfile`,
      `docker-compose.yml`, `output: "standalone"`. Two real bugs hit and
      fixed, both documented inline in `next.config.ts`/`Dockerfile`:
      Turbopack's standalone-output tracer panics on pnpm's store in this
      monorepo (switched the Docker build to `build:webpack`), and
      `next.config.ts`'s `__dirname` isn't available when the server's old
      glibc forces Next onto its WASM SWC fallback (switched to
      `process.cwd()`).
- [x] **Phase 3 — Postgres + Drizzle**: schema + migrations, local dev
      Postgres via Docker Compose.
- [x] **Phase 4 — Auth.js**: Credentials (email+password) + Google + GitHub +
      ORCID (custom OIDC provider, verified via a real authorization
      redirect including auto-negotiated PKCE). Google/GitHub/ORCID need
      real OAuth app registrations before those specific buttons work —
      external, not code, still outstanding (see `docs/ops/access.md`).
      Real bug hit: Auth.js requires JWT session strategy whenever a
      Credentials provider is present (`UnsupportedStrategy` otherwise) —
      fixed in `src/auth.ts`.
- [x] **Phase 5 — Upload workflow**: `src/lib/storage.ts` (disk-backed,
      behind a `Storage` interface), auth-gated submit form.
- [x] **Phase 6 — Public browse/detail pages**: no login required.
- [x] **Phase 7 — Cut over the deploy path**: `deploy-platform.yml` now
      builds/runs via Docker Compose; old pm2 process retired. Verified by
      hand on the server before automating.
- [x] **Post-launch bugfix**: `platform_uploads` Docker volume was created
      owned by `root`, but the container runs as non-root `nextjs` — every
      upload failed with `EACCES`. Fixed in both the Dockerfile (`chown`
      the mount point before `USER` switches, so fresh volumes get correct
      ownership automatically) and the already-existing production volume.
      Caught by a real user report, not by CI — the earlier verification
      only exercised `storage.ts` directly, never the actual container.
- [x] **UI pass**: basic Tailwind styling across all pages (was
      unstyled/plain-browser-default). Two shared components
      (`components/form.tsx`, `components/container.tsx`).
- [x] **Phase 9 — Visualization Sheets**: replaced the generic
      `artifacts` placeholder with the real data model from the project
      abstract. See `docs/adr/0004-visualization-sheets.md` for the full
      taxonomy (core metadata, data provenance, visual encoding & design,
      AI involvement disclosure, limitations) and the multi-author /
      file-or-URL decisions. Added a shared `Header` (nav + working
      sign-out) and a `/my-sheets` page (authorization: only ever queries
      the logged-in user's own `ownerId`, never a client-supplied id).

## Explicitly out of scope (still)

- Coolify (considered, rejected — see ADR 0003).
- A new/dedicated server (staying on the existing shared box).
- Upgrading the server's EOL OS (deferred, accepted risk — see ADR 0003).
- MinIO/S3 storage (disk-backed volume, behind a `Storage` interface so
  this stays a contained future change if it's ever needed).
- Moderation/review workflow on submissions.
- Field-level version diffs and collaborative revision review (the native
  version list plus OVF-authored per-version change notes are now present).
- Structured (non-free-text) sub-fields within sheet sections — e.g. a
  proper repeatable data-sources list instead of one free-text block.

## Local dev (`platform/`)

Different toolchain entirely from `apps/web` - Python/`invenio-cli`, not
pnpm. Needs Python 3.14, Node 24+ (separate from `apps/web`'s pinned
Node 22 - see `.nvmrc`, unaffected), `uv`, `pipx`, ImageMagick, Docker.

```
pipx install invenio-cli
cd platform
invenio-cli install          # Python deps (uv) + JS deps/asset build (pnpm/rspack)
invenio-cli services setup   # Postgres/OpenSearch/Redis/RabbitMQ containers + DB/index init
invenio-cli run               # dev server at https://127.0.0.1:5000 (self-signed cert)
```

`invenio-cli services setup`'s Postgres binds host port 5433, not 5432 -
see the comment on `db`'s `ports:` in `platform/docker-services.yml` for
why (a leftover from when `apps/platform`'s own dev Postgres held 5432;
no longer a real conflict since `apps/platform` is gone, but harmless to
leave as-is).

Full-stack parity check (containerized, same images the server builds):
```
cd platform
docker compose --file docker-compose.full.yml build web-ui
docker compose --file docker-compose.full.yml build web-api worker scheduler
docker compose --file docker-compose.full.yml up -d cache db mq search web-ui web-api worker scheduler
# one-time, fresh volume only:
docker compose --file docker-compose.full.yml exec web-ui invenio db init create
docker compose --file docker-compose.full.yml exec web-ui invenio index init
docker compose --file docker-compose.full.yml exec web-ui invenio files location create --default default-location $INVENIO_INSTANCE_PATH/data
docker compose --file docker-compose.full.yml exec web-ui invenio roles create admin
docker compose --file docker-compose.full.yml exec web-ui invenio access allow superuser-access role admin
```

Production deploy uses `docker-compose.prod-override.yml` on top of the
same `docker-compose.full.yml` (real domain, see
`.github/workflows/deploy-platform.yml`) - don't use it locally, it
points at `open-vis-framework.duckdns.org`.

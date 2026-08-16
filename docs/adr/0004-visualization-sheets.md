# ADR 0004: Visualization Sheets replace generic "artifacts"

- Status: accepted
- Date: 2026-08-16

## Context

The `artifacts` table (title/description/one file) was a deliberately
generic placeholder built to prove the upload workflow end to end (see
`docs/ROADMAP.md` Phase 5) — it never captured the actual project vision.

The project abstract defines Open Visualization Framework (OVF) as: an
open registration platform, inspired by HAL/arXiv/OSF/Kaggle, where
authors document the *provenance* of a visualization (data sources and
transformations, visual encodings, design rationale, known limitations)
so readers can scrutinize it — explicitly including whether/how AI was
involved, data uncertainty, and licensing/contact information. Each
record is called a **visualization sheet**.

## Decision

- Renamed `artifacts` → `sheets` throughout (table, routes, code) to
  match the project's own vocabulary.
- Schema covers six sections (see `src/db/schema.ts` for exact fields):
  core metadata, the visualization itself, data provenance, visual
  encoding & design, AI involvement, limitations.
- **Multi-author**: a separate `sheetAuthors` table (name, affiliation,
  ORCID, email, display position) — free-text credits, not necessarily
  platform accounts, matching how arXiv/HAL/OSF handle authorship
  separately from "who has edit access" (`sheets.ownerId`, the
  submitting platform user).
- **The visualization itself** is either an uploaded file (image/PDF, via
  the existing `Storage` interface) **or** a URL to a hosted/interactive
  visualization (Observable, D3, Tableau Public, etc.) — real dataviz
  work is frequently interactive, not a static image.
- Fields are mostly free-text within each section for v1, not deeply
  structured sub-fields — enough structure to filter/facet on later
  (especially `aiInvolvement`, `license`, `keywords`) without building a
  dynamic form generator now.
- `aiInvolvement` is a real enum column (not buried in free text),
  reflecting that the abstract calls this out as a first-class thing
  readers need to scrutinize.

## Consequences

- No data migration concern: no real sheets existed yet (only test data,
  already cleaned up), so this is a clean schema replacement, not a
  migration of existing records.
- Deliberately **not** built yet, tracked as future work: sheet
  versioning/revision history (arXiv-style), moderation/review workflow,
  structured (non-free-text) sub-fields for data sources / encodings.
  None of this is precluded by the current schema.
- The submit form is necessarily larger now (six sections, dynamic
  author list) — needs a small amount of client-side interactivity
  (adding/removing author rows, toggling file-vs-URL for the
  visualization) that the previous all-server-action forms didn't need.

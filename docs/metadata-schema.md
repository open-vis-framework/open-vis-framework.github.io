# Visualization metadata v0.1

Edit **`platform/site/open_vis_framework/metadata_schema.json`**. This is the
single source for the prototype taxonomy, field definitions and separate
application policy. It is a candidate schema, not a validated research taxonomy.

- `sections`: order, stable IDs, labels and descriptions.
- `fields`: section membership, label, help, placeholder, storage path and type.
  Custom types are `text`, `textarea`, `url`, `date`, and `select`; selects use
  `options` with stable `id` and human-readable `title_l10n`.
- `policy.fields`: core / conditional / recommended / optional, independently
  of the category taxonomy. Changing category membership does not change policy.
- `visible_when`: a storage path and an `in` list. The same rule governs UI
  visibility and conditional publication requirements. AI model/system is required
  when an AI role is declared; AI involvement itself is an applicability-based
  disclosure, since the software cannot infer whether AI was used.
- `system`: stored internal fields are not editable. New visualization IDs use
  Invenio's automatically generated native record ID. Authors cannot choose or
  edit it; no VOI input is offered. A DOI, if introduced later, is separate.
  The legacy `ovf:voi` field remains stored for compatibility but is hidden
  from the form and public metadata sections.

## Implementation and storage

The product is `platform/` (InvenioRDM). Previously `custom_fields.py` duplicated backend definitions and form
controls. It now generates both from the JSON. `metadata_schema.py` loads the
profile and evaluates publication rules. The existing overridable registry
renders the generated sections with Invenio's Semantic UI widgets and Formik,
including live conditional visibility without clearing hidden values.

Native metadata stays in `metadata.title`, `description`, `creators`, `version`,
`publication_date`, `publisher`, and `rights`; files and access stay native too.
Their existing specialist controls remain above the custom sections, and the
schema-driven sections identify these controls and their profile levels. Native
control internals/types and Invenio's own publication requirements (for example
publication date and resource type) are framework constraints, not overridden
by this profile. JSON entries for native fields document those bindings; they
do not replace native validation or convert complex creator/license objects.

Additional values stay in the record's `custom_fields` object under stable
`ovf:*` names. Invenio persists draft/published record JSON in PostgreSQL and
indexes custom-field mappings in OpenSearch; files remain in its file storage.
No local-storage replacement, database rebuild or record migration is introduced.
Existing identifiers, AI enum values, facet mappings and version notes are
preserved. Successful publication stamps `ovf:schema_version` with `0.1`.
Old records are readable without backfilling; editing and republishing them
applies the new core requirements. Incomplete drafts remain saveable.

## Editing and rollout

For labels/help, section order, policy or enum labels, edit JSON and restart the
application. The frontend receives the generated configuration at page load.
For a new custom field, add a unique stable `id`, section, storage path, type and
policy entry. Never rename a stored key or change its storage representation
without an explicit migration. Existing fields are scalar strings; chart types,
URLs/derivatives and creator-independent lists use prose for this prototype.
Enums are enforced server-side. URL/date controls provide browser input hints;
this prototype does not add strict API validation of those strings.

After adding fields, run `invenio rdm-records custom-fields init` in the configured
platform environment to update the search mappings. The existing deployment
workflow now initializes all configured fields before replacing containers.
Rebuild assets after changing the JS renderer (`invenio-cli assets build` in the
normal local workflow). No deployment or existing database was changed by this
refactor.

Run focused tests from `platform/`:

```sh
PYTHONPATH=site .venv/bin/python -m unittest discover -s site/tests -v
```


## Author and reader presentation

Each field's `form_group` controls where it appears: `visualization` (the primary
URL), `essentials` (data sources alongside native controls), `reader` (the three
reading-guide prompts), or `context` (progressively disclosed sections).
Requirement policy remains separate. Section counts mean fields filled, not
verification. Collapsed fields stay mounted and retain their values; sections
open when their fields have validation errors. Native repository controls remain
available under Additional publication details. The native uploader's Preview
selection designates the cover used by the record and generated search thumbnail.

`reader_label` and `reader_fallbacks` configure the public reading guide. Explicit
answers take precedence over compatible legacy metadata; absent answers say
Not yet documented. The primary visualization uses the native selected file
preview and a prominent HTTP(S) hosted-visualization link. Existing file access
permissions and upload handling remain in force. Supporting downloads are
collapsed below the reading content. Published pages offer a copyable anchor
link to the guide; this is the first version of portable context, not an iframe
embed or a new external hosting service.


The upload overrides are integration-tested against the installed
`react-overridable` package. Its contract forwards the original component's
props and inner children, so overrides must recreate the native container and
form provider. Run `node site/tests/upload_overrides.cjs` from `platform/` after
installing frontend assets. The Docker build runs this check before deploying.
The test exercises the real override mechanism while using lightweight native
control stand-ins; authenticated browser upload/publish testing remains useful.

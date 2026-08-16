"""Visualization Sheet custom fields.

Placeholder mapping of the six-section taxonomy from
docs/adr/0004-visualization-sheets.md onto InvenioRDM custom fields
(see docs/adr/0005-adopt-inveniordm.md, Migration Phase 3).

Deliberately minimal for now, matching this phase's scope: every field
below is a plain ``TextCF`` (free text), same granularity as the
original Drizzle schema's mostly-free-text columns. Two fields
(``ai_involvement``, ``chart_types``) are marked ``use_as_filter=True``
so they're facetable once Migration Phase 6 (search & browse) wires up
real faceting - matches ADR 0004's note that ``aiInvolvement`` and
``license`` are the fields expected to need filtering.

Not mapped here (handled by InvenioRDM's *native* fields instead, no
custom field needed):
- title, description/summary -> native ``metadata.title`` / ``metadata.description``
- authors -> native ``metadata.creators`` (name/affiliation/orcid/email)
- keywords -> native ``metadata.subjects``
- license -> native ``metadata.rights``
- contact email / paper URL / code URL -> native ``metadata.related_identifiers``
  or ``custom fields`` if native modeling proves awkward - revisit in a
  later, non-placeholder pass.
- the uploaded-file case of "the visualization itself" -> InvenioRDM's
  native file uploads (invenio-files-rest), not a custom field.

TODO (later, non-placeholder pass): tighten validation (e.g. URL format
on ``viz_url``), decide on ``aiInvolvement``'s fixed vocabulary (was a
Postgres enum: none/data_processing/design_assistance/code_generation/
content_generation/other - currently just free text here), consider
``KeywordCF``/multiple=True for genuinely multi-valued fields like
``chart_types``.
"""

from invenio_i18n import lazy_gettext as _
from invenio_records_resources.services.custom_fields import TextCF

OVF_NAMESPACES = {
    "ovf": "",
}

OVF_CUSTOM_FIELDS = [
    # --- VOI: Visualization Object Identifier ---
    # NOT a real, externally-resolvable identifier yet - self-assigned,
    # locally unique only. A real one needs DataCite (DOI) registration,
    # deferred - see docs/ROADMAP.md. Mirrors invenio_rdm_records' own
    # demo-fixture convention of a "10.9999/..." fake-DOI-shaped string
    # for non-real identifiers, so it's visually recognizable as
    # DOI-like without claiming to actually be one.
    TextCF(name="ovf:voi"),
    # --- The visualization itself (file case is native uploads; this
    # is the alternative "hosted/interactive visualization" case) ---
    TextCF(name="ovf:viz_url"),
    # --- Data provenance ---
    TextCF(name="ovf:data_sources"),
    TextCF(name="ovf:data_collection_method"),
    TextCF(name="ovf:data_temporal_coverage"),
    TextCF(name="ovf:data_transformations"),
    TextCF(name="ovf:data_license"),
    TextCF(name="ovf:data_limitations"),
    # --- Visual encoding & design ---
    TextCF(name="ovf:chart_types", use_as_filter=True),
    TextCF(name="ovf:tools_used"),
    TextCF(name="ovf:encoding_description"),
    TextCF(name="ovf:design_rationale"),
    # --- AI involvement disclosure ---
    TextCF(name="ovf:ai_involvement", use_as_filter=True),
    TextCF(name="ovf:ai_description"),
    TextCF(name="ovf:ai_human_review"),
    # --- Limitations ---
    TextCF(name="ovf:limitations"),
]

OVF_CUSTOM_FIELDS_UI = [
    {
        "section": _("Identifier"),
        "fields": [
            {
                "field": "ovf:voi",
                "ui_widget": "Input",
                "props": {
                    "label": _("VOI (Visualization Object Identifier)"),
                    "placeholder": "10.9999/ovf.xxxxxxx",
                    "description": _(
                        "Self-assigned for now, not yet a real externally-"
                        "resolvable identifier (that needs DOI registration "
                        "via DataCite - not set up yet). Usually left blank "
                        "at submission and assigned automatically."
                    ),
                    "icon": "hashtag",
                },
            },
        ],
    },
    {
        "section": _("The visualization"),
        "fields": [
            {
                "field": "ovf:viz_url",
                "ui_widget": "Input",
                "props": {
                    "label": _("Hosted/interactive visualization URL"),
                    "placeholder": "https://observablehq.com/@you/your-viz",
                    "description": _(
                        "Only for interactive visualizations hosted elsewhere "
                        "(Observable, a live D3 page, Tableau Public, ...). "
                        "Leave blank if you uploaded a file instead."
                    ),
                    "icon": "linkify",
                },
            },
        ],
    },
    {
        "section": _("Data provenance"),
        "fields": [
            {
                "field": "ovf:data_sources",
                "ui_widget": "Input",
                "props": {
                    "label": _("Data sources"),
                    "placeholder": "",
                    "description": "",
                    "icon": "database",
                },
            },
            {
                "field": "ovf:data_collection_method",
                "ui_widget": "Input",
                "props": {
                    "label": _("Data collection method"),
                    "placeholder": "",
                    "description": "",
                    "icon": "clipboard list",
                },
            },
            {
                "field": "ovf:data_temporal_coverage",
                "ui_widget": "Input",
                "props": {
                    "label": _("Temporal coverage"),
                    "placeholder": "e.g. 2015-2024",
                    "description": "",
                    "icon": "calendar alternate outline",
                },
            },
            {
                "field": "ovf:data_transformations",
                "ui_widget": "Input",
                "props": {
                    "label": _("Data transformations"),
                    "placeholder": "",
                    "description": "",
                    "icon": "exchange",
                },
            },
            {
                "field": "ovf:data_license",
                "ui_widget": "Input",
                "props": {
                    "label": _("Data license"),
                    "placeholder": "",
                    "description": _(
                        "License of the underlying data - may differ from "
                        "this record's own license."
                    ),
                    "icon": "balance scale",
                },
            },
            {
                "field": "ovf:data_limitations",
                "ui_widget": "Input",
                "props": {
                    "label": _("Data limitations"),
                    "placeholder": "",
                    "description": "",
                    "icon": "exclamation triangle",
                },
            },
        ],
    },
    {
        "section": _("Visual encoding & design"),
        "fields": [
            {
                "field": "ovf:chart_types",
                "ui_widget": "Input",
                "props": {
                    "label": _("Chart type(s)"),
                    "placeholder": "e.g. choropleth map, line chart",
                    "description": "",
                    "icon": "chart bar",
                },
            },
            {
                "field": "ovf:tools_used",
                "ui_widget": "Input",
                "props": {
                    "label": _("Tools used"),
                    "placeholder": "e.g. D3.js, Observable Plot, Tableau",
                    "description": "",
                    "icon": "wrench",
                },
            },
            {
                "field": "ovf:encoding_description",
                "ui_widget": "Input",
                "props": {
                    "label": _("Visual encoding description"),
                    "placeholder": "",
                    "description": "",
                    "icon": "paint brush",
                },
            },
            {
                "field": "ovf:design_rationale",
                "ui_widget": "Input",
                "props": {
                    "label": _("Design rationale"),
                    "placeholder": "",
                    "description": "",
                    "icon": "lightbulb outline",
                },
            },
        ],
    },
    {
        "section": _("AI involvement & limitations"),
        "fields": [
            {
                "field": "ovf:ai_involvement",
                "ui_widget": "Input",
                "props": {
                    "label": _("AI involvement"),
                    "placeholder": (
                        "none / data_processing / design_assistance / "
                        "code_generation / content_generation / other"
                    ),
                    "description": _(
                        "Placeholder free text for now - was a fixed "
                        "dropdown in the previous schema; revisit as a "
                        "constrained vocabulary in a later pass."
                    ),
                    "icon": "robot",
                },
            },
            {
                "field": "ovf:ai_description",
                "ui_widget": "Input",
                "props": {
                    "label": _("AI involvement description"),
                    "placeholder": "",
                    "description": "",
                    "icon": "info circle",
                },
            },
            {
                "field": "ovf:ai_human_review",
                "ui_widget": "Input",
                "props": {
                    "label": _("Human review of AI output"),
                    "placeholder": "",
                    "description": "",
                    "icon": "eye",
                },
            },
            {
                "field": "ovf:limitations",
                "ui_widget": "Input",
                "props": {
                    "label": _("Known limitations"),
                    "placeholder": "",
                    "description": "",
                    "icon": "exclamation circle",
                },
            },
        ],
    },
]

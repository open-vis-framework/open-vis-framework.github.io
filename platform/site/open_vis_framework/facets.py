"""Search facet definitions for Visualization Sheet metadata."""

from invenio_i18n import lazy_gettext as _
from invenio_records_resources.services.records.facets import CFTermsFacet, TermsFacet
from invenio_vocabularies.services.facets import VocabularyLabels


AI_INVOLVEMENT_OPTIONS = [
    {"id": "none", "title_l10n": _("No AI used")},
    {"id": "data_processing", "title_l10n": _("Data processing")},
    {"id": "design_assistance", "title_l10n": _("Design assistance")},
    {"id": "code_generation", "title_l10n": _("Code generation")},
    {"id": "content_generation", "title_l10n": _("Content generation")},
    {"id": "other", "title_l10n": _("Other")},
    {"id": "not_disclosed", "title_l10n": _("Not disclosed")},
]
"""Options for the scalar ``ovf:ai_involvement`` deposit-form field."""

AI_INVOLVEMENT_LABELS = {
    option["id"]: option["title_l10n"] for option in AI_INVOLVEMENT_OPTIONS
}
"""Human-readable labels for AI facet buckets."""

AI_INVOLVEMENT_FACET_FIELD = "ovf:ai_involvement.keyword"
LICENSE_FACET_FIELD = "metadata.rights.id"

OVF_FACETS = {
    "ai_involvement": {
        "facet": CFTermsFacet(
            field=AI_INVOLVEMENT_FACET_FIELD,
            label=_("AI involvement"),
            value_labels=AI_INVOLVEMENT_LABELS,
        ),
        "ui": {
            "field": CFTermsFacet.field(AI_INVOLVEMENT_FACET_FIELD),
        },
    },
    "license": {
        "facet": TermsFacet(
            field=LICENSE_FACET_FIELD,
            label=_("License"),
            value_labels=VocabularyLabels("licenses"),
        ),
        "ui": {
            "field": LICENSE_FACET_FIELD,
        },
    },
}
"""Facet definitions to merge into InvenioRDM's ``RDM_FACETS`` config."""

OVF_SEARCH_FACETS = ("subject", "license", "ai_involvement")
"""Facet names to append to InvenioRDM's public search configuration."""

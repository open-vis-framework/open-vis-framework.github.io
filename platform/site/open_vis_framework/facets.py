"""Search facet definitions for Visualization Sheet metadata."""

from invenio_i18n import lazy_gettext as _
from invenio_records_resources.services.records.facets import CFTermsFacet, TermsFacet
from invenio_vocabularies.services.facets import VocabularyLabels


from .metadata_schema import AI_INVOLVEMENT_OPTIONS


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

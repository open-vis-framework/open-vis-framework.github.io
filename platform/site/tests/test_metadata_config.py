"""Tests for Visualization Sheet metadata configuration."""

import unittest

from invenio_records_resources.services.custom_fields import TextCF
from invenio_vocabularies.services.facets import VocabularyLabels
from marshmallow import ValidationError

from open_vis_framework.custom_fields import OVF_CUSTOM_FIELDS, OVF_CUSTOM_FIELDS_UI
from open_vis_framework.facets import (
    AI_INVOLVEMENT_FACET_FIELD,
    AI_INVOLVEMENT_LABELS,
    AI_INVOLVEMENT_OPTIONS,
    LICENSE_FACET_FIELD,
    OVF_FACETS,
    OVF_SEARCH_FACETS,
)


def _custom_field(name):
    """Return one configured backend custom field by name."""
    return next(field for field in OVF_CUSTOM_FIELDS if field.name == name)


def _custom_field_ui(name):
    """Return one configured deposit-form custom field by name."""
    return next(
        field
        for section in OVF_CUSTOM_FIELDS_UI
        for field in section["fields"]
        if field["field"] == name
    )


class AIInvolvementConfigTest(unittest.TestCase):
    """Exercise the controlled AI-involvement form configuration."""

    def test_backend_field_enforces_the_controlled_values(self):
        """API writes cannot create arbitrary public facet buckets."""
        field = _custom_field("ovf:ai_involvement")

        self.assertIsInstance(field, TextCF)
        self.assertEqual(field.field.deserialize("none"), "none")
        with self.assertRaises(ValidationError):
            field.field.deserialize("legacy free text")
        self.assertIn("keyword", field.mapping["fields"])

    def test_deposit_form_uses_scalar_dropdown_options(self):
        """The form offers stable identifiers while retaining a scalar value."""
        config = _custom_field_ui("ovf:ai_involvement")
        props = config["props"]

        self.assertEqual(config["ui_widget"], "Dropdown")
        self.assertIs(props["options"], AI_INVOLVEMENT_OPTIONS)
        self.assertFalse(props["multiple"])
        self.assertFalse(props["search"])
        self.assertTrue(props["clearable"])
        self.assertEqual(
            [option["id"] for option in props["options"]],
            [
                "none",
                "data_processing",
                "design_assistance",
                "code_generation",
                "content_generation",
                "other",
                "not_disclosed",
            ],
        )

    def test_version_note_is_not_repeated_in_additional_details(self):
        config = next(
            section
            for section in OVF_CUSTOM_FIELDS_UI
            if section["section"] == "Version note"
        )

        self.assertTrue(config["hide_from_landing_page"])


class FacetConfigTest(unittest.TestCase):
    """Exercise OVF's reusable InvenioRDM facet definitions."""

    def test_ai_facet_targets_existing_keyword_subfield(self):
        """AI buckets use the exact-value subfield already in the index."""
        config = OVF_FACETS["ai_involvement"]

        self.assertEqual(
            config["facet"].get_aggregation().to_dict(),
            {"terms": {"field": f"custom_fields.{AI_INVOLVEMENT_FACET_FIELD}"}},
        )
        self.assertEqual(
            config["ui"]["field"],
            f"custom_fields.{AI_INVOLVEMENT_FACET_FIELD}",
        )
        self.assertEqual(
            set(AI_INVOLVEMENT_LABELS),
            {option["id"] for option in AI_INVOLVEMENT_OPTIONS},
        )

    def test_license_facet_uses_native_rights_vocabulary(self):
        """License buckets use InvenioRDM's native rights identifiers."""
        config = OVF_FACETS["license"]

        self.assertEqual(
            config["facet"].get_aggregation().to_dict(),
            {"terms": {"field": LICENSE_FACET_FIELD}},
        )
        self.assertEqual(config["ui"]["field"], LICENSE_FACET_FIELD)
        self.assertIsInstance(config["facet"]._value_labels, VocabularyLabels)
        self.assertEqual(config["facet"]._value_labels.vocabulary, "licenses")

    def test_public_search_facet_order_is_explicit(self):
        """The exported names include topics, licenses, and AI involvement."""
        self.assertEqual(
            OVF_SEARCH_FACETS,
            ("subject", "license", "ai_involvement"),
        )


if __name__ == "__main__":
    unittest.main()

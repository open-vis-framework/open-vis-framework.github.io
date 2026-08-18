"""Tests for documentation coverage and resource links."""

import unittest
from types import SimpleNamespace

from open_vis_framework.disclosure import build_disclosure_summary
from open_vis_framework.external_resources import render_ovf_resources
from open_vis_framework.service_components import (
    OVFCustomFieldsComponent,
    OVF_RECORDS_SERVICE_COMPONENTS,
)
from invenio_rdm_records.services.components import CustomFieldsComponent


class FakeRecord:
    """Minimal record item used by the external resource renderer."""

    def __init__(self, data):
        self.data = data

    def to_dict(self):
        return self.data


class DisclosureSummaryTest(unittest.TestCase):
    """Exercise objective documentation coverage rules."""

    def test_complete_sheet_covers_all_six_dimensions(self):
        record = {
            "custom_fields": {
                "ovf:viz_url": "https://example.org/viz",
                "ovf:data_sources": "National statistics office",
                "ovf:data_transformations": "Aggregated by month",
                "ovf:chart_types": "line chart",
                "ovf:encoding_description": "Position encodes value",
                "ovf:ai_involvement": "none",
                "ovf:limitations": "Provisional values",
            }
        }

        summary = build_disclosure_summary(record)

        self.assertEqual(summary["completed"], 6)
        self.assertEqual(summary["total"], 6)

    def test_whitespace_does_not_count_as_documentation(self):
        summary = build_disclosure_summary(
            {"custom_fields": {"ovf:ai_involvement": "   "}}
        )

        self.assertEqual(summary["completed"], 0)
        self.assertEqual(summary["dimensions"][3]["detail"], "Not documented")

    def test_design_requires_chart_type_and_explanation(self):
        summary = build_disclosure_summary(
            {"custom_fields": {"ovf:chart_types": "bar chart"}}
        )

        design = summary["dimensions"][3]
        self.assertFalse(design["complete"])
        self.assertEqual(design["detail"], "Partially documented")

    def test_uploaded_file_counts_as_visualization(self):
        summary = build_disclosure_summary(
            {"custom_fields": {}}, {"entries": [{"key": "preview.png"}]}
        )

        self.assertTrue(summary["dimensions"][0]["complete"])
        self.assertEqual(summary["dimensions"][0]["detail"], "File uploaded")

    def test_not_disclosed_ai_does_not_earn_coverage(self):
        summary = build_disclosure_summary(
            {"custom_fields": {"ovf:ai_involvement": "not_disclosed"}}
        )

        ai = summary["dimensions"][4]
        self.assertFalse(ai["complete"])
        self.assertEqual(ai["detail"], "Not disclosed")


class ExternalResourcesTest(unittest.TestCase):
    """Exercise resource classification and URL safety."""

    def test_renders_visualization_data_code_and_analysis_links(self):
        record = FakeRecord(
            {
                "custom_fields": {"ovf:viz_url": "https://viz.example/work"},
                "metadata": {
                    "related_identifiers": [
                        {
                            "identifier": "https://data.example/set",
                            "resource_type": {"id": "dataset"},
                        },
                        {
                            "identifier": "https://code.example/repo",
                            "resource_type": {"id": "software"},
                        },
                        {
                            "identifier": "https://paper.example/article",
                            "resource_type": {"id": "publication-article"},
                        },
                    ]
                },
            }
        )

        resources = render_ovf_resources(record)

        self.assertEqual(
            [resource["content"]["title"] for resource in resources],
            ["Open visualization", "Data", "Code", "Analysis or publication"],
        )

    def test_rejects_unsafe_and_duplicate_urls(self):
        record = FakeRecord(
            {
                "custom_fields": {"ovf:viz_url": "javascript:alert(1)"},
                "metadata": {
                    "related_identifiers": [
                        {
                            "identifier": "https://example.org/resource",
                            "resource_type": {"id": "dataset"},
                        },
                        {
                            "identifier": "https://example.org/resource",
                            "resource_type": {"id": "software"},
                        },
                    ]
                },
            }
        )

        resources = render_ovf_resources(record)

        self.assertEqual(len(resources), 1)
        self.assertEqual(resources[0]["content"]["title"], "Data")

    def test_resolves_native_persistent_identifiers(self):
        record = FakeRecord(
            {
                "metadata": {
                    "related_identifiers": [
                        {
                            "identifier": "10.5281/zenodo.123",
                            "scheme": "doi",
                            "resource_type": {"id": "dataset"},
                        }
                    ]
                }
            }
        )

        resources = render_ovf_resources(record)

        self.assertEqual(
            resources[0]["content"]["url"],
            "https://doi.org/10.5281/zenodo.123",
        )


class VersionNotesComponentTest(unittest.TestCase):
    """Guard version-note clearing when a new version draft is created."""

    def test_default_custom_fields_component_is_replaced_once(self):
        self.assertNotIn(CustomFieldsComponent, OVF_RECORDS_SERVICE_COMPONENTS)
        self.assertEqual(
            OVF_RECORDS_SERVICE_COMPONENTS.count(OVFCustomFieldsComponent), 1
        )
        self.assertEqual(
            OVFCustomFieldsComponent.new_version_skip_fields,
            ["ovf:version_notes"],
        )

    def test_new_version_clears_only_the_previous_note(self):
        source = {
            "custom_fields": {
                "ovf:voi": "VIS-123",
                "ovf:version_notes": "Corrected the source data",
            }
        }
        draft = SimpleNamespace(custom_fields={})

        OVFCustomFieldsComponent(None).new_version(
            None,
            draft=draft,
            record=source,
        )

        self.assertEqual(draft.custom_fields, {"ovf:voi": "VIS-123"})
        self.assertIn("ovf:version_notes", source["custom_fields"])


if __name__ == "__main__":
    unittest.main()

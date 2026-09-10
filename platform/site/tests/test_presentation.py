"""Behavior tests for visualization-first record presentation."""

import unittest
from pathlib import Path

from jinja2 import DictLoader, Environment, FileSystemLoader, ChoiceLoader
from open_vis_framework.presentation import visualization_presentation
from open_vis_framework.custom_fields import OVF_CUSTOM_FIELDS_UI

TEMPLATES = Path(__file__).parents[1] / "open_vis_framework/templates/semantic-ui"


class ReadingGuideTest(unittest.TestCase):
    """Keep reading guidance honest, escaped and compatible with old records."""

    def test_legacy_encoding_and_limitations_remain_useful(self):
        result = visualization_presentation({"custom_fields": {
            "ovf:encoding_description": "Color represents a country.",
            "ovf:data_limitations": "Uneven reporting.",
        }})
        self.assertIsNone(result["cards"][0]["value"])
        self.assertEqual(result["cards"][1]["value"], "Color represents a country.")
        self.assertEqual(result["cards"][2]["value"], "Uneven reporting.")

    def test_explicit_reading_guide_takes_precedence(self):
        result = visualization_presentation({"custom_fields": {
            "ovf:how_to_read": "Compare positions.",
            "ovf:encoding_description": "Older explanation.",
        }})
        self.assertEqual(result["cards"][1]["value"], "Compare positions.")

    def test_only_http_links_can_be_primary_actions(self):
        for value in ("javascript:alert(1)", "data:text/html,test", "/relative", ""):
            self.assertIsNone(visualization_presentation({
                "custom_fields": {"ovf:viz_url": value}
            })["url"])
        self.assertEqual(visualization_presentation({"custom_fields": {
            "ovf:viz_url": "https://example.org/chart"
        }})["url"], "https://example.org/chart")

    def test_guide_escapes_author_content_and_does_not_claim_missing_answers(self):
        env = Environment(loader=FileSystemLoader(TEMPLATES), autoescape=True)
        template = env.get_template("open_vis_framework/records/reading_guide.html")
        html = template.render(presentation=visualization_presentation({
            "custom_fields": {"ovf:main_message": "<script>alert(1)</script>"}
        }), is_preview=True)
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("Not yet documented by the author.", html)
        self.assertNotIn("ovf-copy-context", html)

    def test_every_editable_field_has_one_form_group(self):
        fields = [f for s in OVF_CUSTOM_FIELDS_UI for f in s["fields"]]
        groups = {"visualization", "essentials", "reader", "context"}
        self.assertTrue(all(f["form_group"] in groups for f in fields))
        self.assertEqual([f["field"] for f in fields if f["form_group"] == "essentials"], ["ovf:data_sources"])
        self.assertEqual(len([f for f in fields if f["form_group"] == "reader"]), 3)


class RecordLayoutTest(unittest.TestCase):
    """Exercise the inherited template blocks with native macro stand-ins."""

    def render_record(self, can_read_files=True, entries=None, url=None):
        parent = """{% set files_ns = namespace(files=[], preview_file=None) %}
        {% macro preview_file_box(file, pid, is_preview, record, include_deleted, display_name=None) %}<div class="test-preview">{{ file.key }}</div>{% endmacro %}
        {% block record_content %}<p>DESCRIPTION</p>{% endblock %}
        {% block record_files %}{% block record_file_preview %}DUPLICATE PREVIEW{% endblock %}<p>DOWNLOADS</p>{% endblock %}"""
        env = Environment(loader=ChoiceLoader([
            FileSystemLoader(TEMPLATES),
            DictLoader({"invenio_app_rdm/records/detail.html": parent,
                        "open_vis_framework/records/disclosure_summary.html": ""}),
        ]), autoescape=True)
        # Override disclosure lookup for this focused inherited-block test.
        env.loader = ChoiceLoader([DictLoader({"open_vis_framework/records/disclosure_summary.html": ""}), env.loader])
        env.filters.update(order_entries=lambda files: files["entries"],
                           has_previewable_files=bool,
                           select_preview_file=lambda files, default_preview: files[0])
        env.globals.update(ovf_presentation=visualization_presentation,
                           ovf_preview_label=lambda file: "Visualization preview")
        return env.get_template("open_vis_framework/records/detail.html").render(
            permissions={"can_read_files": can_read_files},
            record_ui={"id": "test-id", "files": {"enabled": True, "default_preview": "chart.png"},
                       "custom_fields": {"ovf:viz_url": url}},
            files={"entries": entries or []}, is_preview=True,
        )

    def test_visualization_precedes_guide_and_description(self):
        html = self.render_record(entries=[{"key": "chart.png", "status": "completed"}], url="https://example.org/chart")
        self.assertLess(html.index("Explore visualization"), html.index("test-preview"))
        self.assertLess(html.index("test-preview"), html.index("Read this chart"))
        self.assertLess(html.index("Read this chart"), html.index("DESCRIPTION"))
        self.assertEqual(html.count("test-preview"), 1)
        self.assertNotIn("DUPLICATE PREVIEW", html)
        self.assertIn("Supporting materials &amp; downloads", html)

    def test_restricted_files_never_enter_the_hero(self):
        html = self.render_record(can_read_files=False, entries=[{"key": "private.png", "status": "completed"}])
        self.assertNotIn("private.png", html)
        self.assertNotIn("test-preview", html)

    def test_link_only_record_has_an_action_without_empty_preview(self):
        html = self.render_record(url="https://example.org/chart")
        self.assertIn("Explore visualization", html)
        self.assertNotIn("has not been provided", html)

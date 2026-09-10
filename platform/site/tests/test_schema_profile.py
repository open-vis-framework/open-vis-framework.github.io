"""Regression tests for the editable metadata application profile."""

import unittest
from types import SimpleNamespace

from marshmallow import ValidationError
from open_vis_framework.metadata_schema import FIELDS, SCHEMA, applies, publication_errors
from open_vis_framework.custom_fields import OVF_CUSTOM_FIELDS, OVF_CUSTOM_FIELDS_UI
from open_vis_framework.service_components import OVFCustomFieldsComponent


class SchemaProfileTest(unittest.TestCase):
    """Check publication policy, compatibility and conditional fields."""

    def setUp(self):
        self.record = {"metadata": {"title": "Example", "creators": [{"person_or_org": {"name": "Author", "type": "personal"}}]}, "custom_fields": {"ovf:data_sources": "Survey"}}

    def test_only_three_core_fields(self):
        errors = publication_errors({})
        self.assertEqual(set(errors["metadata"]), {"title", "creators"})
        self.assertEqual(set(errors["custom_fields"]), {"ovf:data_sources"})
        self.assertFalse(publication_errors(self.record))
        self.record["custom_fields"]["ovf:data_sources"] = "  "
        self.assertIn("ovf:data_sources", publication_errors(self.record)["custom_fields"])

    def test_ai_model_only_required_when_ai_used(self):
        model = next(f for f in FIELDS if f["id"] == "ai_model")
        for involvement in ("none", "not_disclosed", ""):
            self.record["custom_fields"]["ovf:ai_involvement"] = involvement
            self.assertFalse(applies(model, self.record))
            self.assertFalse(publication_errors(self.record))
        self.record["custom_fields"]["ovf:ai_involvement"] = "code_generation"
        self.assertTrue(applies(model, self.record))
        self.assertIn("ovf:ai_model", publication_errors(self.record)["custom_fields"])
        self.record["custom_fields"]["ovf:ai_model"] = "Example system"
        self.assertFalse(publication_errors(self.record))

    def test_publish_rejects_missing_core_and_stamps_valid_record(self):
        component = OVFCustomFieldsComponent(None)
        target = SimpleNamespace(custom_fields={})
        with self.assertRaises(ValidationError):
            component.publish(None, draft={}, record=target)
        component.publish(None, draft=self.record, record=target)
        self.assertEqual(target.custom_fields["ovf:schema_version"], "0.1")
        self.assertEqual(target.custom_fields["ovf:data_sources"], "Survey")
        self.assertNotIn("ovf:schema_version", self.record["custom_fields"])

    def test_incomplete_drafts_remain_saveable(self):
        component = OVFCustomFieldsComponent(None)
        target = SimpleNamespace(custom_fields={})
        component.create(None, data={"custom_fields": {}}, record=target)
        component.update_draft(None, data={"custom_fields": {"ovf:ai_involvement": "other"}}, record=target)
        self.assertEqual(target.custom_fields, {"ovf:ai_involvement": "other"})

    def test_config_covers_sections_and_never_exposes_system_fields(self):
        self.assertEqual(len(SCHEMA["sections"]), 11)
        ids = [f["id"] for f in FIELDS]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), set(SCHEMA["policy"]["fields"]))
        visible = {f["field"] for section in OVF_CUSTOM_FIELDS_UI for f in section["fields"]}
        for field in FIELDS:
            if field.get("system"):
                self.assertNotIn(field["storage"].removeprefix("custom_fields."), visible)
        stored = {f.name for f in OVF_CUSTOM_FIELDS}
        self.assertTrue({"ovf:voi", "ovf:data_sources", "ovf:data_transformations", "ovf:tools_used", "ovf:version_notes"} <= stored)
        self.assertTrue(visible <= stored)

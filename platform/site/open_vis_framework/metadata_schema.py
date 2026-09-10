"""Load the editable taxonomy and independent application policy."""

import json
from pathlib import Path

SCHEMA = json.loads(Path(__file__).with_name("metadata_schema.json").read_text())
FIELDS = SCHEMA["fields"]
POLICY = SCHEMA["policy"]["fields"]
AI_INVOLVEMENT_OPTIONS = next(
    f["options"] for f in FIELDS if f["id"] == "ai_involvement"
)


def value_at(record, path):
    """Read native or namespaced custom metadata without splitting colons."""
    value = record
    for part in path.split("."):
        value = value.get(part) if isinstance(value, dict) else None
    return value


def applies(field, record):
    """Evaluate the same declarative visibility rule used by the form."""
    condition = field.get("visible_when")
    return not condition or value_at(record, condition["field"]) in condition["in"]


def publication_errors(record):
    """Require core and applicable conditional fields only at publication."""
    errors = {}
    for field in FIELDS:
        level = POLICY[field["id"]]
        required = level == "core" or (
            level == "conditional"
            and field.get("visible_when")
            and applies(field, record)
        )
        value = value_at(record, field["storage"])
        missing = not value or isinstance(value, str) and not value.strip()
        if required and missing:
            group, key = field["storage"].split(".", 1)
            errors.setdefault(group, {})[key] = [
                field["label"] + " is required to publish."
            ]
    return errors

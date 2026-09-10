"""Generate storage definitions and the deposit UI from the v0.1 schema."""

from invenio_records_resources.services.custom_fields import TextCF
from marshmallow import validate

from .metadata_schema import FIELDS, POLICY, SCHEMA

OVF_NAMESPACES = {"ovf": ""}
WIDGETS = {
    "text": "Input",
    "textarea": "TextArea",
    "url": "Input",
    "date": "Input",
    "select": "Dropdown",
}


def backend_field(field):
    """Preserve scalar text storage and existing search mappings."""
    validators = []
    if field.get("options"):
        validators.append(
            validate.OneOf([option["id"] for option in field["options"]])
        )
    return TextCF(
        name=field["storage"].removeprefix("custom_fields."),
        use_as_filter=field.get("filter", False),
        field_args={"validate": validators},
    )


def ui_field(field):
    """Translate one schema entry into Invenio's existing form widgets."""
    level = POLICY[field["id"]]
    props = {
        "label": field["label"] + " (" + level + ")",
        "description": field.get("help", ""),
        "placeholder": field.get("placeholder", ""),
        "required": level == "core" or (
            level == "conditional" and bool(field.get("visible_when"))
        ),
    }
    if field["type"] == "textarea":
        props["rows"] = 3
    if field["type"] in ("url", "date"):
        props["type"] = field["type"]
    if field.get("options"):
        props.update(
            options=field["options"], multiple=False, search=False, clearable=True
        )
    return {
        "field": field["storage"].removeprefix("custom_fields."),
        "ui_widget": WIDGETS[field["type"]],
        "props": props,
        "visible_when": field.get("visible_when"),
    }


CUSTOM = [f for f in FIELDS if f["storage"].startswith("custom_fields.")]
OVF_CUSTOM_FIELDS = [backend_field(field) for field in CUSTOM]
OVF_CUSTOM_FIELDS_UI = [
    {
        "section": section["label"],
        "description": section["description"],
        "native_fields": [
            dict(f, level=POLICY[f["id"]])
            for f in FIELDS
            if f["section"] == section["id"]
            and not f["storage"].startswith("custom_fields.")
        ],
        "fields": [
            ui_field(f)
            for f in CUSTOM
            if f["section"] == section["id"]
            and not f.get("system")
            and not f.get("hide_from_landing_page")
        ],
    }
    for section in SCHEMA["sections"]
]
# Preserve the existing prominent version-note presentation without duplication.
OVF_CUSTOM_FIELDS_UI.append({
    "section": "Version note",
    "hide_from_landing_page": True,
    "fields": [ui_field(f) for f in CUSTOM if f.get("hide_from_landing_page")],
})

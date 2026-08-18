"""Reader-facing Visualization Sheet documentation coverage."""

from .facets import AI_INVOLVEMENT_LABELS


def _present(value):
    """Return whether a metadata value contains meaningful content."""
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return bool(value)


def _has_uploaded_file(files):
    """Return whether the landing-page file payload contains an entry."""
    if not files:
        return False
    entries = files.get("entries", []) if isinstance(files, dict) else []
    return bool(entries)


def build_disclosure_summary(record, files=None):
    """Build an objective coverage summary without implying verification."""
    custom_fields = record.get("custom_fields", {}) if record else {}

    visualization_url = custom_fields.get("ovf:viz_url")
    visualization_complete = _present(visualization_url) or _has_uploaded_file(files)
    if _present(visualization_url):
        visualization_detail = "Linked"
    elif _has_uploaded_file(files):
        visualization_detail = "File uploaded"
    else:
        visualization_detail = "Not documented"

    has_chart_type = _present(custom_fields.get("ovf:chart_types"))
    has_design_explanation = _present(
        custom_fields.get("ovf:encoding_description")
    ) or _present(custom_fields.get("ovf:design_rationale"))
    design_complete = has_chart_type and has_design_explanation
    if design_complete:
        design_detail = "Described"
    elif has_chart_type or has_design_explanation:
        design_detail = "Partially documented"
    else:
        design_detail = "Not documented"

    ai_value = custom_fields.get("ovf:ai_involvement")
    ai_complete = _present(ai_value) and ai_value != "not_disclosed"
    ai_detail = "Not disclosed"
    if _present(ai_value):
        ai_detail = AI_INVOLVEMENT_LABELS.get(
            str(ai_value), str(ai_value).replace("_", " ").strip().title()
        )

    dimensions = [
        {
            "id": "visualization",
            "label": "Visualization",
            "complete": visualization_complete,
            "detail": visualization_detail,
        },
        {
            "id": "data",
            "label": "Data sources",
            "complete": _present(custom_fields.get("ovf:data_sources")),
            "detail": (
                "Disclosed"
                if _present(custom_fields.get("ovf:data_sources"))
                else "Not disclosed"
            ),
        },
        {
            "id": "process",
            "label": "Transformations",
            "complete": _present(custom_fields.get("ovf:data_transformations")),
            "detail": (
                "Described"
                if _present(custom_fields.get("ovf:data_transformations"))
                else "Not described"
            ),
        },
        {
            "id": "design",
            "label": "Visual design",
            "complete": design_complete,
            "detail": design_detail,
        },
        {
            "id": "ai",
            "label": "AI involvement",
            "complete": ai_complete,
            "detail": ai_detail,
        },
        {
            "id": "limitations",
            "label": "Limitations",
            "complete": (
                _present(custom_fields.get("ovf:limitations"))
                or _present(custom_fields.get("ovf:data_limitations"))
            ),
            "detail": (
                "Disclosed"
                if (
                    _present(custom_fields.get("ovf:limitations"))
                    or _present(custom_fields.get("ovf:data_limitations"))
                )
                else "Not disclosed"
            ),
        },
    ]

    return {
        "completed": sum(item["complete"] for item in dimensions),
        "total": len(dimensions),
        "dimensions": dimensions,
    }

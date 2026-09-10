"""Reader-oriented views of existing metadata, without duplicating storage."""

from .external_resources import _http_url
from .metadata_schema import FIELDS, value_at


def visualization_presentation(record):
    """Build the primary link and a compact, schema-driven reading guide."""
    cards = []
    for field in FIELDS:
        if not field.get("reader_label"):
            continue
        paths = [field["storage"], *field.get("reader_fallbacks", [])]
        value = next((value_at(record, path) for path in paths
                      if isinstance(value_at(record, path), str)
                      and value_at(record, path).strip()), None)
        cards.append({"label": field["reader_label"], "value": value})
    return {
        "url": _http_url(record.get("custom_fields", {}).get("ovf:viz_url")),
        "cards": cards,
    }

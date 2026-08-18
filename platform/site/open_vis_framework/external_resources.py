"""Prominent visualization, data, code, and analysis links."""

from urllib.parse import urlparse

from invenio_app_rdm.records_ui.views.filters import pid_url
from invenio_app_rdm.records_ui.utils import dump_external_resource


def _http_url(value):
    """Return a safe absolute HTTP(S) URL or ``None``."""
    if not isinstance(value, str):
        return None
    value = value.strip()
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return value


def _resource_label(resource_type):
    """Map Invenio resource types to OVF's reader vocabulary."""
    resource_type = (resource_type or "").lower()
    if resource_type.startswith("dataset"):
        return "Data"
    if resource_type.startswith("software"):
        return "Code"
    if resource_type.startswith("publication"):
        return "Analysis or publication"
    return None


def _related_identifier_url(related):
    """Resolve a native persistent identifier to a safe external URL."""
    identifier = related.get("identifier")
    direct_url = _http_url(identifier)
    if direct_url:
        return direct_url
    return _http_url(pid_url(identifier, scheme=related.get("scheme")))


def render_ovf_resources(record):
    """Render configured record links for InvenioRDM's external-resources box."""
    data = record.to_dict()
    custom_fields = data.get("custom_fields", {})
    resources = []
    seen_urls = set()

    visualization_url = _http_url(custom_fields.get("ovf:viz_url"))
    if visualization_url:
        seen_urls.add(visualization_url)
        resources.append(
            dump_external_resource(
                visualization_url,
                "Open visualization",
                "Visualization resources",
                subtitle=urlparse(visualization_url).netloc,
            )
        )

    for related in data.get("metadata", {}).get("related_identifiers", []):
        url = _related_identifier_url(related)
        resource_type = related.get("resource_type", {}) or {}
        label = _resource_label(resource_type.get("id"))
        if not url or not label or url in seen_urls:
            continue
        seen_urls.add(url)
        resources.append(
            dump_external_resource(
                url,
                label,
                "Visualization resources",
                subtitle=urlparse(url).netloc,
            )
        )

    return resources

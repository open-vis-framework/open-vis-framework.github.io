"""OVF-specific InvenioRDM record service behavior."""

from marshmallow import ValidationError

from invenio_rdm_records.services.components import (
    CustomFieldsComponent,
    DefaultRecordsComponents,
)


from .metadata_schema import SCHEMA, publication_errors


class OVFCustomFieldsComponent(CustomFieldsComponent):
    """Keep a version's change note specific to that version."""

    new_version_skip_fields = ["ovf:version_notes"]

    def publish(self, identity, draft=None, record=None, **kwargs):
        """Validate the profile and stamp successful publications."""
        errors = publication_errors(draft)
        if errors:
            raise ValidationError(errors)
        super().publish(identity, draft=draft, record=record, **kwargs)
        record.custom_fields = {
            **record.custom_fields,
            "ovf:schema_version": SCHEMA["version"],
        }


OVF_RECORDS_SERVICE_COMPONENTS = [
    OVFCustomFieldsComponent if component is CustomFieldsComponent else component
    for component in DefaultRecordsComponents
]

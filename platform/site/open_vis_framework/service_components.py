"""OVF-specific InvenioRDM record service behavior."""

from invenio_rdm_records.services.components import (
    CustomFieldsComponent,
    DefaultRecordsComponents,
)


class OVFCustomFieldsComponent(CustomFieldsComponent):
    """Keep a version's change note specific to that version."""

    new_version_skip_fields = ["ovf:version_notes"]


OVF_RECORDS_SERVICE_COMPONENTS = [
    OVFCustomFieldsComponent if component is CustomFieldsComponent else component
    for component in DefaultRecordsComponents
]

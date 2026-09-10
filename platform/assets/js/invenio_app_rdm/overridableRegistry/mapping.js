/*
 * SPDX-FileCopyrightText: 2023 CERN.
 * SPDX-License-Identifier: MIT
 */

/**
 * Add here all the overridden components of your app.
 */

import { i18next } from "@translations/invenio_app_rdm/i18next";
import _get from "lodash/get";
import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import { AccordionField, Input, TextArea, Dropdown } from "react-invenio-forms";
import { DepositFormApp } from "@js/invenio_rdm_records";
import { SearchItemCreators } from "@js/invenio_app_rdm/utils";
import { Item, Label, Icon, Checkbox } from "semantic-ui-react";
import { CompactStats } from "@js/invenio_app_rdm/components/CompactStats";
import { DisplayPartOfCommunities } from "@js/invenio_app_rdm/components/DisplayPartOfCommunities";

// [open] vis: search results list item with a thumbnail image.
//
// The stock InvenioRDM component (invenio_app_rdm's RecordsResultsListItem.js)
// never renders an image at all, even though every record's API response
// already includes real IIIF thumbnail links (result.links.thumbnails)
// generated from files.default_preview - see docs/ROADMAP.md Migration
// Phase 9. Inlined here (rather than a separate imported file) because
// only specific known files (like this one) get collected/symlinked
// into the webpack build from platform/assets/js/ - arbitrary sibling
// files under this directory are not automatically picked up.
const RecordsResultsListItemWithThumbnail = ({
  result,
  accessStatusId,
  accessStatus,
  accessStatusIcon,
  createdDate,
  creators,
  descriptionStripped,
  publicationDate,
  resourceType,
  subjects,
  title,
  version,
  versions,
  allVersionsVisible,
  numOtherVersions,
}) => {
  const resourceTypeId = _get(result, "ui.resource_type.id", "");
  const [mainType] = resourceTypeId.split("-");
  const filterValue = resourceTypeId.includes("-")
    ? `resource_type:${mainType}+inner:${resourceTypeId}`
    : `resource_type:${resourceTypeId}`;
  const resourceTypeFilter = encodeURIComponent(filterValue);

  const uniqueViews = _get(result, "stats.all_versions.unique_views", 0);
  const uniqueDownloads = _get(result, "stats.all_versions.unique_downloads", 0);
  const publishingInformation = _get(result, "ui.publishing_information.journal", "");
  // "medium" (300px) rather than the initial "tiny" (80px) - the small
  // size read as barely-there next to a full search-result row. Source
  // resolution bumped to match (750, not 250) so it isn't visibly
  // upscaled/blurry at the larger display size.
  const thumbnailUrl = _get(result, "links.thumbnails.750", null);
  const viewLink = `/records/${result.id}`;

  return (
    <Item key={result.id}>
      {thumbnailUrl && (
        <Item.Image size="medium" src={thumbnailUrl} as="a" href={viewLink} alt="" />
      )}
      <Item.Content>
        <Item.Extra className="labels-actions">
          <Label horizontal size="small" className="primary theme-primary">
            {publicationDate} ({version})
          </Label>
          <Label
            horizontal
            size="small"
            className="neutral"
            as="a"
            href={`${window.location.pathname}?q=&f=${resourceTypeFilter}`}
          >
            {resourceType}
          </Label>
          <Label
            horizontal
            size="small"
            className={`access-status ${accessStatusId}`}
          >
            {accessStatusIcon && <Icon name={accessStatusIcon} />}
            {accessStatus}
          </Label>
        </Item.Extra>
        <Item.Header as="h2" className="theme-primary-text">
          <a href={viewLink}>{title}</a>
        </Item.Header>
        <Item className="creatibutors">
          <SearchItemCreators creators={creators} othersLink={viewLink} />
        </Item>
        <Item.Description className="truncate-lines-2">
          {descriptionStripped}
        </Item.Description>
        <Item.Extra>
          {subjects.map((subject) => (
            <Label key={subject.title_l10n} size="tiny">
              {subject.title_l10n}
            </Label>
          ))}
          <div className="flex justify-space-between align-items-end">
            <small>
              <DisplayPartOfCommunities communities={result.parent?.communities} />
              <p>
                {createdDate && (
                  <>
                    {i18next.t("Uploaded on {{uploadDate}}", {
                      uploadDate: createdDate,
                    })}
                  </>
                )}
                {createdDate && publishingInformation && " | "}
                {publishingInformation && (
                  <>
                    {i18next.t("Published in: {{- publishInfo }}", {
                      publishInfo: publishingInformation,
                    })}
                  </>
                )}
              </p>
              {!allVersionsVisible && versions.index > 1 && (
                <p>
                  <b>
                    {i18next.t("{{count}} more versions exist for this record", {
                      count: numOtherVersions,
                    })}
                  </b>
                </p>
              )}
            </small>
            <small>
              <CompactStats uniqueViews={uniqueViews} uniqueDownloads={uniqueDownloads} />
            </small>
          </div>
        </Item.Extra>
      </Item.Content>
    </Item>
  );
};

// The "RecordsResultsListItem.layout" overridable region is namespaced
// per search app - react-searchkit's buildUID() prefixes it with each
// app's own appName (e.g. "InvenioAppRdm.Search.RecordsResultsListItem.layout"),
// there's no unprefixed/global registration point. Every place that
// renders RecordsResultsListItem needs its own entry here, each pointing
// at its app's actual appName constant (grep `const appName = "..."` in
// invenio_app_rdm's search/, frontpage/, collectionRecordsSearch/,
// communityRecordsSearch/, user_dashboard/uploads.js).
const RECORDS_RESULTS_LIST_APP_NAMES = [
  "InvenioAppRdm.Search", // /search
  "InvenioAppRDM.RecordsList", // frontpage "Recent uploads"
  "InvenioAppRDM.CollectionsSearch",
  "InvenioCommunities.DetailsSearch",
  "InvenioAppRdm.DashboardUploads", // "My dashboard" > Uploads
];

export const overriddenComponents = Object.fromEntries(
  RECORDS_RESULTS_LIST_APP_NAMES.map((appName) => [
    `${appName}.RecordsResultsListItem.layout`,
    RecordsResultsListItemWithThumbnail,
  ])
);


// Presentation groups come from metadata_schema.json. Native Invenio controls
// retain their upload, validation, access and draft/publish behavior.
const SCHEMA_WIDGETS = { Input, TextArea, Dropdown };
const allSchemaFields = (sections) => sections.flatMap((section) => section.fields);
const hasValue = (value) => typeof value === "string" ? Boolean(value.trim()) : Boolean(value?.length || value);
const applicable = (field, values) => !field.visible_when || field.visible_when.in.includes(_get(values, field.visible_when.field));

const SchemaField = ({ field, record }) => {
  const { values } = useFormikContext();
  if (!applicable(field, values)) return null;
  const Widget = SCHEMA_WIDGETS[field.ui_widget];
  return <Widget {...field.props} record={record} fieldPath={`custom_fields.${field.field}`} />;
};

const SchemaGroup = ({ sections, group, record }) => allSchemaFields(sections)
  .filter((field) => field.form_group === group)
  .map((field) => <SchemaField key={field.field} field={field} record={record} />);

// Native details elements preserve keyboard navigation and keep collapsed
// values mounted. Open automatically when a save/publish returns field errors.
const FormDetails = ({ id, title, description, paths = [], children, count }) => {
  const { errors, initialErrors } = useFormikContext();
  const hasErrors = paths.some((path) => _get(errors, path) || _get(initialErrors, path));
  const [open, setOpen] = useState(false);
  useEffect(() => { if (hasErrors) setOpen(true); }, [hasErrors]);
  return <details id={id} className="ovf-form-details" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>{title}{count && <span className="ovf-detail-count">{count}</span>}</summary>
    <div className="ovf-form-details-body">{description && <p className="text-muted">{description}</p>}{children}</div>
  </details>;
};

const SchemaCustomFields = ({ customFieldsUI, record }) => {
  const { values } = useFormikContext();
  return <section className="ovf-form-context" id="ovf-add-context">
    <p className="ovf-step-label">STEP 3 · BUILD ON THE ESSENTIALS</p>
    <h2>Add context</h2>
    <p>Help someone understand and reuse your work. Start with these three prompts, or save your draft and return later.</p>
    <div className="ui segment ovf-reader-prompts">
      <h3>Read this chart</h3>
      <p className="text-muted">These answers become a short card beside your visualization.</p>
      <SchemaGroup sections={customFieldsUI} group="reader" record={record} />
    </div>
    {customFieldsUI.map((section) => {
      const fields = section.fields.filter((field) => field.form_group === "context" && applicable(field, values));
      if (!fields.length) return null;
      const filled = fields.filter((field) => hasValue(_get(values, `custom_fields.${field.field}`))).length;
      return <FormDetails key={section.section} id={section.id} title={section.section} description={section.description}
        paths={fields.map((field) => `custom_fields.${field.field}`)} count={`${filled}/${fields.length} filled`}>
        {fields.map((field) => <SchemaField key={field.field} field={field} record={record} />)}
      </FormDetails>;
    })}
  </section>;
};

const VisualizationStart = ({ customFieldsUI, record }) => <div className="ovf-form-intro">
  <p className="ovf-step-label">STEP 1 · START WITH YOUR WORK</p>
  <h1>{record?.is_published ? "Edit your visualization" : "Share a visualization"}</h1>
  <p>Add a link, upload your work, or use both. You can save a draft before filling in all the details.</p>
  <SchemaGroup sections={customFieldsUI} group="visualization" record={record} />
</div>;

// react-overridable forwards the original child's props (including its inner
// children), not the original child element. Recreate the native container.
const VisualizationFiles = ({ children, includesPaths, severityChecks, active }) => (
  <AccordionField id="files-section" includesPaths={includesPaths} severityChecks={severityChecks}
    active={active} label="Upload your visualization or a preview" data-label="Visualization files">
    <p>Upload an image, PDF, or supporting files. Choose an image in the uploader’s Preview column to use as your cover. For a link without uploads, select “Link only” below.</p>
    {children}
  </AccordionField>
);

const Essentials = ({ children, config, record, includesPaths = [], severityChecks }) => {
  const controls = React.Children.toArray(children);
  const extraNames = ["PIDField", "CopyrightsField"];
  const extra = controls.filter((child) => extraNames.some((name) => child.props?.id?.includes(`.${name}.`)));
  const native = config.custom_fields.ui.flatMap((section) => section.native_fields || []);
  const primary = controls.filter((child) => !extra.includes(child)).map((control) => {
    const field = native.find((item) => item.storage === control.props?.fieldPath);
    if (!field || !React.isValidElement(control.props.children)) return control;
    return React.cloneElement(control, {}, React.cloneElement(control.props.children, {
      label: field.label, helpText: field.help || undefined, placeholder: field.placeholder,
    }));
  });
  const first = primary.filter((control) => ["metadata.title", "metadata.creators", "metadata.description"].includes(control.props?.fieldPath));
  const remaining = primary.filter((control) => !first.includes(control));
  return <AccordionField id="basic-information-section" label="Step 2 · The essentials" active
    includesPaths={[...includesPaths, "custom_fields.ovf:data_sources"]} severityChecks={severityChecks}>
    <p>Give your visualization a title, credit its creators, and identify the data. Check the publication date and reuse license before publishing.</p>
    {first}
    <SchemaGroup sections={config.custom_fields.ui} group="essentials" record={record} />
    {remaining}
    <FormDetails title="Persistent identifiers & copyright" paths={["pids", "metadata.copyright"]}>{extra}</FormDetails>
    <p className="text-muted">Visualization ID: {record?.id || "Generated automatically when your draft is created"}. The platform assigns this for you.</p>
  </AccordionField>;
};

// Reorder only the main column of the existing form; keep the original form
// provider, feedback, save/preview/publish sidebar, permissions and extensions.
const FriendlyDepositLayout = ({ children, config, record, preselectedCommunity, files, permissions, errors, recordSerializer }) => {
  const visit = (node) => {
    if (!React.isValidElement(node)) return node;
    if (node.props.computer === 11) {
      const items = React.Children.toArray(node.props.children);
      const pick = (name) => items.find((item) => item.props?.id === `InvenioAppRdm.Deposit.${name}`);
      const selected = [pick("Files.before.container"), pick("AccordionFieldFiles.container"), pick("Files.after.container"), pick("AccordionFieldBasicInformation.container"), pick("BasicInformation.after.container"), pick("CustomFields.container")].filter(Boolean);
      const rest = items.filter((item) => !selected.includes(item));
      return React.cloneElement(node, { className: "ovf-friendly-deposit" },
        selected,
        <FormDetails key="advanced" title="Additional publication details" description="Contributors, topics, funding, related works and other repository details." paths={["metadata", "pids"]}>{rest}</FormDetails>);
    }
    if (!node.props.children) return node;
    // Overridable itself requires one element, not an array of one element.
    const content = React.isValidElement(node.props.children)
      ? visit(node.props.children)
      : React.Children.map(node.props.children, visit);
    return React.cloneElement(node, {}, content);
  };
  return <DepositFormApp config={config} record={record} preselectedCommunity={preselectedCommunity}
    files={files} permissions={permissions} errors={errors} recordSerializer={recordSerializer}>
    {React.Children.map(children, visit)}
  </DepositFormApp>;
};

const LinkOnlyToggle = ({ showMetadataOnlyToggle, filesList, filesEnabled, handleOnChangeMetadataOnly }) => showMetadataOnlyToggle ?
  <Checkbox label="Link only — no files to upload" disabled={filesList.length > 0} checked={!filesEnabled} onChange={handleOnChangeMetadataOnly} /> : null;

Object.assign(overriddenComponents, {
  "InvenioAppRdm.Deposit.RDMDepositForm.layout": FriendlyDepositLayout,
  "InvenioAppRdm.Deposit.Files.before.container": VisualizationStart,
  "InvenioAppRdm.Deposit.AccordionFieldFiles.container": VisualizationFiles,
  "InvenioAppRdm.Deposit.AccordionFieldBasicInformation.container": Essentials,
  "InvenioAppRdm.Deposit.CustomFields.container": SchemaCustomFields,
  "InvenioRdmRecords.DepositForm.FileUploaderToolbar.MetadataOnlyToggle": LinkOnlyToggle,
});

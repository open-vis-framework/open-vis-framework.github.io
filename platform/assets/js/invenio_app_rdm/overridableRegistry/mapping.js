/*
 * SPDX-FileCopyrightText: 2023 CERN.
 * SPDX-License-Identifier: MIT
 */

/**
 * Add here all the overridden components of your app.
 */

import { i18next } from "@translations/invenio_app_rdm/i18next";
import _get from "lodash/get";
import React from "react";
import { SearchItemCreators } from "@js/invenio_app_rdm/utils";
import { Item, Label, Icon } from "semantic-ui-react";
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

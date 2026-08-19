/**
 * Site identity for the landing site.
 *
 * The single place to change the name here. The platform (InvenioRDM)
 * keeps its own copy in `platform/invenio.cfg` as THEME_SITENAME, because
 * it is a separate Python app built from its own Docker context and
 * cannot import from this workspace. Those two constants are the whole
 * rebrand surface - keep them in step.
 */
export const SITE_NAME = "[open] vis";

export const SITE_DESCRIPTION =
  "An open platform for information visualization projects.";

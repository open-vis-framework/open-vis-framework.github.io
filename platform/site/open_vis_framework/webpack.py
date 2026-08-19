"""JS/CSS Webpack bundles for [open] vis."""

from invenio_assets.webpack import WebpackThemeBundle

theme = WebpackThemeBundle(
    __name__,
    "assets",
    default="semantic-ui",
    themes={
        "semantic-ui": dict(
            entry={
                "open-vis-framework-record-page": (
                    "./js/open_vis_framework/record_page.js"
                ),
            },
        ),
    },
)

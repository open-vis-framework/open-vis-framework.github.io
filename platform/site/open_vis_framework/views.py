"""Additional views."""

from hashlib import sha256

from flask import Blueprint, Response, abort, current_app, request

from .badges import PublicRecordNotFound, get_badge_state, render_badge_svg
from .disclosure import build_disclosure_summary

#
# Registration
#
def create_blueprint(app):
    """Register blueprint routes on app."""
    app.jinja_env.globals["ovf_disclosure_summary"] = build_disclosure_summary
    blueprint = Blueprint(
        "open_vis_framework",
        __name__,
        template_folder="./templates",
    )

    @blueprint.get("/badges/records/<record_id>.svg")
    def record_badge(record_id):
        """Serve a cacheable, automatically updating record badge."""
        try:
            state = get_badge_state(record_id)
        except PublicRecordNotFound:
            abort(404)

        svg = render_badge_svg(state, current_app.config["THEME_SITENAME"])
        response = Response(svg, content_type="image/svg+xml; charset=utf-8")
        cache_seconds = current_app.config.get("OVF_BADGE_CACHE_SECONDS", 3600)
        response.headers["Cache-Control"] = (
            f"public, max-age={cache_seconds}, stale-while-revalidate=86400"
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.set_etag(sha256(svg.encode("utf-8")).hexdigest())
        return response.make_conditional(request)

    return blueprint

"""Prepare the REST CSRF cookie before a user submits their first action."""

from flask import current_app, request
from invenio_rest.csrf import reset_token


def initialize_page_csrf(response):
    """Ask Invenio to issue a missing cookie on an HTML page response."""
    if (
        "invenio-csrf" in current_app.extensions
        and request.method == "GET"
        and response.status_code < 400
        and response.mimetype == "text/html"
        and current_app.config["CSRF_COOKIE_NAME"] not in request.cookies
        and not request.path.startswith(("/api/", "/static/"))
    ):
        # Extensions load before blueprints. Flask runs after-request hooks in
        # reverse order, so Invenio's csrf_send observes this reset flag and
        # issues its signed cookie using the existing security configuration.
        reset_token()
        # A response initializing a browser-specific token must not be shared.
        response.cache_control.public = False
        response.cache_control.private = True
        response.cache_control.no_store = True
        response.vary.add("Cookie")
    return response

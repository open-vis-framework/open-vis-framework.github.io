"""Test first-click CSRF initialization using Invenio's real middleware."""

import unittest

from flask import Flask, Response
from invenio_rest.csrf import CSRFProtectMiddleware

from open_vis_framework.views import create_blueprint


class PageCSRFTest(unittest.TestCase):
    """Prepare the cookie on page loads without weakening write validation."""

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            SECRET_KEY="csrf-regression-test-only",
            SESSION_COOKIE_SECURE=True,
            CSRF_COOKIE_SAMESITE="Lax",
        )
        # This is the extension-before-blueprint order used by Invenio's factory.
        CSRFProtectMiddleware(self.app)
        self.app.register_blueprint(create_blueprint(self.app))
        self.app.add_url_rule("/uploads/new", "page", lambda: "<html>Form</html>")
        self.app.add_url_rule("/api/example", "api_read", lambda: {"ok": True})
        self.app.add_url_rule(
            "/asset.svg", "asset", lambda: Response("<svg/>", mimetype="image/svg+xml")
        )
        self.app.add_url_rule("/api/action", "write", lambda: "saved", methods=["POST"])
        self.client = self.app.test_client()
        # Reproduce an existing session with a missing/expired CSRF cookie.
        self.client.set_cookie("session", "existing-session")

    def page(self):
        return self.client.get("/uploads/new", base_url="https://localhost")

    def write(self, token=None):
        headers = {"Referer": "https://localhost/uploads/new"}
        if token is not None:
            headers["X-CSRFToken"] = token
        return self.client.post("/api/action", headers=headers, base_url="https://localhost")

    def test_first_action_after_page_load_succeeds(self):
        response = self.page()
        cookie = self.client.get_cookie("csrftoken")
        self.assertIsNotNone(cookie)
        self.assertEqual(self.write(cookie.value).status_code, 200)
        self.assertTrue(response.cache_control.no_store)
        self.assertTrue(response.cache_control.private)
        self.assertIn("Cookie", response.vary)

    def test_cookie_uses_existing_security_settings(self):
        response = self.page()
        header = next(h for h in response.headers.getlist("Set-Cookie") if h.startswith("csrftoken="))
        self.assertIn("Secure", header)
        self.assertIn("SameSite=Lax", header)
        self.assertIn("Path=/", header)
        # JavaScript must be able to send this token in the REST request header.
        self.assertNotIn("HttpOnly", header)

    def test_existing_cookie_is_not_rotated_by_page_loads(self):
        self.page()
        token = self.client.get_cookie("csrftoken").value
        response = self.page()
        self.assertEqual(self.client.get_cookie("csrftoken").value, token)
        self.assertFalse(any(h.startswith("csrftoken=") for h in response.headers.getlist("Set-Cookie")))

    def test_missing_cookie_is_recreated_on_the_next_page_load(self):
        self.page()
        self.client.delete_cookie("csrftoken")
        self.page()
        self.assertEqual(self.write(self.client.get_cookie("csrftoken").value).status_code, 200)

    def test_missing_header_still_rejected(self):
        self.page()
        self.assertEqual(self.write().status_code, 400)

    def test_invalid_token_still_rejected(self):
        self.page()
        self.assertEqual(self.write("invalid-token").status_code, 400)

    def test_cross_site_referer_still_rejected(self):
        self.app.config["TRUSTED_HOSTS"] = ["localhost"]
        self.page()
        token = self.client.get_cookie("csrftoken").value
        response = self.client.post("/api/action", base_url="https://localhost", headers={
            "X-CSRFToken": token, "Referer": "https://other.example/",
        })
        self.assertEqual(response.status_code, 400)

    def test_api_and_asset_reads_do_not_initialize_browser_cookies(self):
        for path in ("/api/example", "/asset.svg"):
            response = self.client.get(path, base_url="https://localhost")
            self.assertEqual(response.status_code, 200)
            self.assertIsNone(self.client.get_cookie("csrftoken"))

    def test_direct_write_with_missing_cookie_still_rejected(self):
        response = self.write()
        self.assertEqual(response.status_code, 400)
        self.assertIn(b"CSRF cookie not set", response.data)

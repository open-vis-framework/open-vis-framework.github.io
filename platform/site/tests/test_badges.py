"""Tests for Visualization Sheet badges."""

import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from flask import Flask

from open_vis_framework.badges import (
    BadgeState,
    _calendar_week_start,
    _competition_rankings,
    render_badge_svg,
)
from open_vis_framework.views import create_blueprint


PACKAGE_ROOT = Path(__file__).parents[1] / "open_vis_framework"

# Deliberately not the real site name: the badge should render whatever
# THEME_SITENAME says, so a test asserting the production name would pass
# even if the value were hardcoded again.
SITENAME = "[test] vis"


class BadgeLogicTest(unittest.TestCase):
    """Exercise the ranking and SVG logic without external services."""

    def test_calendar_week_starts_on_monday_utc(self):
        """Calendar ranking windows begin at Monday midnight UTC."""
        now = datetime(2026, 8, 18, 14, 30, tzinfo=timezone.utc)
        self.assertEqual(
            _calendar_week_start(now),
            datetime(2026, 8, 17, tzinfo=timezone.utc),
        )

    def test_competition_ranking_shares_positions_for_ties(self):
        """Equal traffic produces equal ranks and leaves the next place open."""
        self.assertEqual(
            _competition_rankings({"alpha": 9, "beta": 9, "gamma": 4}),
            {"alpha": 1, "beta": 1, "gamma": 3},
        )

    def test_ranked_svg_contains_current_and_peak_rank(self):
        """A qualified record displays both live and best achieved ranks."""
        svg = render_badge_svg(BadgeState(current_rank=3, peak_rank=1), SITENAME)
        self.assertIn("#3", svg)
        self.assertIn("PEAK #1", svg)
        self.assertIn("Visualization this week", svg)

    def test_unranked_svg_is_still_a_registry_badge(self):
        """Low-activity records receive a useful non-ranking badge."""
        svg = render_badge_svg(BadgeState(), SITENAME)
        self.assertIn("Visualization Sheet", svg)
        self.assertIn("LISTED", svg)
        self.assertNotIn("PEAK", svg)

    def test_badge_carries_the_configured_site_name(self):
        """The badge follows THEME_SITENAME instead of a baked-in name."""
        for state in (BadgeState(), BadgeState(current_rank=3, peak_rank=1)):
            svg = render_badge_svg(state, SITENAME)
            self.assertIn(SITENAME, svg)
            self.assertIn(SITENAME.upper(), svg)

    def test_site_name_is_escaped_into_the_svg(self):
        """A name with XML metacharacters cannot break the markup."""
        svg = render_badge_svg(BadgeState(), "Ampersand & <Angle>")
        self.assertIn("Ampersand &amp; &lt;Angle&gt;", svg)
        self.assertNotIn("<Angle>", svg)


class BadgeEndpointTest(unittest.TestCase):
    """Exercise response headers on the public SVG endpoint."""

    def setUp(self):
        """Create a minimal Flask app around the instance blueprint."""
        self.app = Flask(__name__)
        self.app.config["OVF_BADGE_CACHE_SECONDS"] = 1800
        self.app.config["THEME_SITENAME"] = SITENAME
        self.app.register_blueprint(create_blueprint(self.app))
        self.client = self.app.test_client()

    @patch(
        "open_vis_framework.views.get_badge_state",
        return_value=BadgeState(current_rank=2, peak_rank=1),
    )
    def test_svg_is_publicly_cacheable_and_conditional(self, _state):
        """Badge responses support CDN caching and ETag revalidation."""
        response = self.client.get("/badges/records/example.svg")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, "image/svg+xml")
        self.assertIn("public, max-age=1800", response.headers["Cache-Control"])
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], "*")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertTrue(response.headers["ETag"])

        conditional = self.client.get(
            "/badges/records/example.svg",
            headers={"If-None-Match": response.headers["ETag"]},
        )
        self.assertEqual(conditional.status_code, 304)


class BadgeTemplateSecurityTest(unittest.TestCase):
    """Guard the badge copy interaction against the site's strict CSP."""

    def test_copy_interaction_uses_self_hosted_bundle(self):
        """The badge template must not rely on a blocked inline script."""
        template = (
            PACKAGE_ROOT
            / "templates/semantic-ui/open_vis_framework/records/badge.html"
        ).read_text()

        self.assertNotIn("<script>", template)
        self.assertIn("webpack['open-vis-framework-record-page.js']", template)
        self.assertTrue(
            (
                PACKAGE_ROOT
                / "assets/semantic-ui/js/open_vis_framework/record_page.js"
            ).is_file()
        )


if __name__ == "__main__":
    unittest.main()

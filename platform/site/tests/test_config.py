"""Tests for the instance configuration file.

`invenio.cfg` is not imported by any other test: the application only
execs it at startup, and the Docker build execs it too (via `invenio
collect`). A mistake in it therefore survives a green CI run and only
surfaces minutes into an image build, or at deploy time. These tests
close that gap cheaply.
"""

import types
import unittest
from pathlib import Path

CONFIG_PATH = Path(__file__).parents[2] / "invenio.cfg"


def load_config():
    """Exec invenio.cfg the way Flask's from_pyfile does."""
    module = types.ModuleType("invenio_cfg")
    source = CONFIG_PATH.read_text()
    exec(compile(source, str(CONFIG_PATH), "exec"), module.__dict__)
    return module


class InstanceConfigTest(unittest.TestCase):
    """Guard the config against errors CI would otherwise miss."""

    def test_config_executes_cleanly(self):
        """A config that raises breaks the image build, not the tests."""
        self.assertTrue(load_config().THEME_SITENAME)

    def test_site_name_is_not_repeated_as_a_literal(self):
        """Renaming the site means editing THEME_SITENAME and nothing else."""
        config = load_config()
        sitename = config.THEME_SITENAME

        self.assertEqual(config.THEME_FRONTPAGE_TITLE, sitename)
        self.assertEqual(config.APP_RDM_DEPOSIT_FORM_DEFAULTS["publisher"], sitename)
        self.assertIn(sitename, config.SECURITY_EMAIL_SUBJECT_REGISTER)

    def test_wordmark_replaces_the_logo_image(self):
        """THEME_LOGO unset is what makes the header render the name."""
        config = load_config()
        self.assertIsNone(config.THEME_LOGO)
        # Its admin counterpart has no such fallback - its template emits
        # an <img> unconditionally - so it must keep a real value.
        self.assertTrue(getattr(config, "THEME_LOGO_ADMIN", "unset"))

    def test_account_email_confirmation_can_actually_be_delivered(self):
        """Requiring confirmation while suppressing mail strands every signup."""
        config = load_config()
        if config.SECURITY_CONFIRMABLE and not config.SECURITY_LOGIN_WITHOUT_CONFIRMATION:
            self.assertIsNot(
                getattr(config, "MAIL_SUPPRESS_SEND", None),
                True,
                "confirmation is required, so mail must not be suppressed here",
            )


if __name__ == "__main__":
    unittest.main()

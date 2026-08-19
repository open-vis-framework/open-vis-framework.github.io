/**
 * Interactions for the [open] vis record landing page.
 *
 * This code is served from the instance's own Webpack bundle so it remains
 * compatible with the site's Content Security Policy (which blocks inline
 * scripts).
 */

const badgePanel = document.getElementById("ovf-embed-badge");

if (badgePanel) {
  const status = badgePanel.querySelector(".ovf-badge-copy-status");

  badgePanel.querySelectorAll(".ovf-copy-badge").forEach((button) => {
    button.addEventListener("click", async () => {
      const field = document.getElementById(button.dataset.copyTarget);
      if (!field) return;

      let copied = false;
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API unavailable");
        }
        await navigator.clipboard.writeText(field.value);
        copied = true;
      } catch {
        field.focus();
        field.select();
        try {
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        }
      }

      if (!copied) {
        if (status) {
          status.textContent = "Copy failed. Select and copy the text manually.";
        }
        return;
      }

      if (status) status.textContent = "Embed code copied.";
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
        if (status) status.textContent = "";
      }, 1800);
    });
  });
}

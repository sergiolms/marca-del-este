import { render } from "preact";
import { App } from "./app";
import { listenInstallPrompt, listenSwUpdate } from "./state/pwa";
import "./theme/tokens.css";
import "./theme/light.css";

function setupMobileInteractions() {
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (event) => {
    const now = Date.now();
    const delta = now - lastTouchEnd;
    lastTouchEnd = now;
    if (delta >= 350) return;
    const target = event.target as Element | null;
    if (!target) return;
    const isEditableTarget = Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    if (!isEditableTarget) event.preventDefault();
  }, { passive: false });
}

listenInstallPrompt();
listenSwUpdate();
setupMobileInteractions();

const root = document.getElementById("app");
if (!root) throw new Error("#app root not found");
render(<App />, root);

import { render } from "preact";
import { App } from "./app";
import { listenInstallPrompt, listenSwUpdate } from "./state/pwa";
import "./theme/tokens.css";
import "./theme/light.css";

listenInstallPrompt();
listenSwUpdate();

const root = document.getElementById("app");
if (!root) throw new Error("#app root not found");
render(<App />, root);

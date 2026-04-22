import { render } from "preact";
import { App } from "./app";
import "./theme/tokens.css";
import "./theme/light.css";

const root = document.getElementById("app");
if (!root) throw new Error("#app root not found");
render(<App />, root);

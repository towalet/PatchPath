import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles/globals.css";

const bootStartedAt = performance.now();
const bootPath = window.location.pathname;
const bootMinimumMs = bootPath === "/" || bootPath.startsWith("/dashboard") ? 650 : 700;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

/**
 * Fade out the inline boot screen (index.html) once the app has mounted under
 * it and the web fonts have settled — so the first visible frame is the styled,
 * correctly-typeset app rather than a flash. Capped so it can never hang.
 */
function hideBootScreen() {
  const boot = document.getElementById("app-boot");
  if (!boot) return;
  boot.classList.add("is-hidden");
  const remove = () => boot.remove();
  boot.addEventListener("transitionend", remove, { once: true });
  window.setTimeout(remove, 600); // fallback if transitionend doesn't fire
}

function hideBootScreenAfterMinimum() {
  const elapsed = performance.now() - bootStartedAt;
  const remaining = Math.max(bootMinimumMs - elapsed, 0);
  window.setTimeout(hideBootScreen, remaining);
}

const fontsReady =
  "fonts" in document ? (document as Document).fonts.ready : Promise.resolve();

Promise.race([fontsReady, new Promise((resolve) => window.setTimeout(resolve, 1200))]).then(() => {
  // Two frames guarantees React has painted before we reveal the app.
  requestAnimationFrame(() => requestAnimationFrame(hideBootScreenAfterMinimum));
});
